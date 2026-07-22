import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import {
  isCorrectAnswer,
  questionService,
  sanitizeQuestionForClient,
} from "~~/server/services/QuestionService";
import { updateUserProgress } from "~~/server/utils/userProgressHelper";
import { checkAndAwardAchievements } from "~~/server/utils/achievementHelper";
import { dailyRewardService } from "./DailyRewardService";
import {
  applyBossMalusToDamage,
  applyRelicsToBossDamage,
  applyRelicsToGold,
  applyTalentsToGold,
  assignCombatIdentities,
  assignEventIdentities,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  brainrunGlobalFloor,
  buildCombatThemeWeights,
  calculBrainrunUserXP,
  consumeShieldCharge,
  effectiveThemes,
  enemyThemeBonus,
  flashMalusBonusTimeMs,
  generateActGraph,
  generateBonusOffers,
  generateShopOffers,
  generateShopReplacementOffer,
  generateThemeCards,
  getActiveRelicEffects,
  getActiveTalentEffects,
  getCandidateCols,
  goldToKnowledgePoints,
  grantShieldCharge,
  instantRoomHealthDelta,
  isAlainMemoryIntro,
  isBossAnswerTimedOut,
  maybeConvertNodeToEvent,
  nextRowAfterClear,
  pickCombatCandidate,
  pickFiftyFiftyEliminations,
  pickPhoneAFriendHint,
  pickRandomCommonRelic,
  pickRandomConsumable,
  pickRandomStashConsumables,
  resolveEventOption,
  topThemes,
  type BrainrunRelicEffects,
} from "~~/server/utils/brainrunLogic";
import {
  getMetaProgress,
  grantBrainrunActCoins,
  grantKnowledgePoints,
  recordConsumableDiscovery,
  recordRelicDiscovery,
  unlockTalent as unlockTalentPersist,
} from "~~/server/utils/brainrunMetaHelper";
import {
  BRAINRUN_ABSOLUTE_MAX_HP,
  BRAINRUN_BASE_CONSUMABLE_SLOTS,
  BRAINRUN_BOSS_MAX_HP,
  BRAINRUN_COINS_PER_ACT,
  BRAINRUN_COMBAT_ROOM_TYPES,
  BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT,
  BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE,
  BRAINRUN_EVENT_MAGNET_CHANCE,
  BRAINRUN_GOLD_BY_ROOM_TYPE,
  BRAINRUN_THEME_CARD_COUNT,
  BRAINRUN_THEME_COEFFICIENT_MAX,
  BRAINRUN_MAX_HP,
  BRAINRUN_QUESTIONS_PER_ROOM,
  BRAINRUN_START_HP,
  BRAINRUN_TOTAL_ACTS,
} from "~~/server/utils/brainrunConfig";
import { assertDebugAccess } from "~~/server/utils/auth";
import { QuestionDataDTO } from "#shared/question";
import {
  BRAINRUN_BONUS_OFFER_COUNT,
  BRAINRUN_CHRONO_BOOST_MS,
  BRAINRUN_DAMAGE_BOOST_AMOUNT,
  BRAINRUN_CONSUMABLES,
  BRAINRUN_EVENT_MIN_MAX_HP,
  BRAINRUN_EVENTS,
  BRAINRUN_RELICS,
  getBrainrunEventIdsByAct,
  type BrainrunConsumableId,
  type BrainrunConsumableReveal,
  type BrainrunOffer,
  type BrainrunRelicId,
} from "#shared/brainrunItems";
import {
  BRAINRUN_ENEMIES,
  getBrainrunEnemiesByActAndTier,
  getBrainrunEnemyById,
} from "#shared/brainrunEnemies";
import {
  BRAINRUN_BOSSES,
  getBrainrunBossesByAct,
  getBrainrunBossById,
} from "#shared/brainrunBosses";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";
import { BRAINRUN_ALAIN_INTRO_MS } from "#shared/brainrun";
import type {
  BrainrunEventOutcomeDTO,
  BrainrunMapNodeDTO,
  BrainrunMetaProgressDTO,
  BrainrunQuestionPreviewDTO,
  BrainrunRoomDTO,
  BrainrunRoomResponse,
  BrainrunRoomStatus,
  BrainrunRoomType,
  BrainrunRunDTO,
  BrainrunStateDTO,
  BrainrunThemeCardDTO,
} from "#shared/brainrun";

type CombatRoomType = "STANDARD" | "ELITE" | "BOSS";
type ConsumableCounts = Record<string, number>;
type ConsumableReveal = BrainrunConsumableReveal;

export class BrainrunService {
  /**
   * Reprend la run en cours si elle existe, ou renvoie l'état de la dernière run terminée
   * (pour que l'écran de fin s'affiche) sans en recréer une automatiquement. Seule
   * startNewRun() démarre explicitement une nouvelle run.
   */
  async getOrStartRun(userId: string): Promise<BrainrunStateDTO> {
    const lastRun = await prisma.brainrunRun.findFirst({
      where: { userId },
      orderBy: { createDate: "desc" },
      include: { rooms: true },
    });

    if (!lastRun) {
      return this.createRun(userId);
    }

    return this.buildState(lastRun);
  }

  async startNewRun(userId: string): Promise<BrainrunStateDTO> {
    await this.abandonRun(userId);
    return this.createRun(userId);
  }

  private async createRun(userId: string): Promise<BrainrunStateDTO> {
    const metaProgress = await getMetaProgress(userId);
    const talentEffects = getActiveTalentEffects(metaProgress.unlockedTalents);
    // Talents Premier Trésor/Kit de Départ : démarrent la run avec 1 relique commune/1
    // consommable aléatoire déjà en possession, plutôt que d'attendre la 1re offre.
    const startingRelic = talentEffects.startsWithRandomCommonRelic
      ? pickRandomCommonRelic()
      : null;
    const startingConsumable = talentEffects.startsWithRandomConsumable
      ? pickRandomConsumable()
      : null;
    const startHealthPoint = BRAINRUN_START_HP + talentEffects.bonusStartHp;
    const startMaxHealthPoint = BRAINRUN_MAX_HP + talentEffects.bonusStartHp;
    // Anti-répétition inter-runs : figée une fois pour toute la run à sa création (cf.
    // BRAINRUN_THEME_COEFFICIENTS_PLAN.md). abandonRun a déjà persisté l'éventuelle run précédente,
    // donc elle compte bien parmi les « 2 dernières runs ».
    const { excludedCardThemes, excludedQuestionIds } = await this.computeRunExclusions(userId);
    const created = await prisma.brainrunRun.create({
      data: {
        userId,
        healthPoint: startHealthPoint,
        maxHealthPoint: startMaxHealthPoint,
        gold: talentEffects.bonusStartGold,
        excludedCardThemes,
        excludedQuestionIds,
        relics: startingRelic ? [startingRelic] : [],
        consumables: startingConsumable ? { [startingConsumable]: 1 } : {},
        // Talent Bouclier d'Acte : l'Acte 1 démarre dès la création de la run (les actes suivants
        // sont couverts par advanceAfterRoomClear).
        shieldCharges: talentEffects.hasShieldOnActStart
          ? grantShieldCharge(0, startHealthPoint)
          : 0,
      },
    });
    if (startingRelic) {
      await recordRelicDiscovery(userId, startingRelic);
    }
    if (startingConsumable) {
      await recordConsumableDiscovery(userId, startingConsumable);
    }
    await this.seedActGraph(created.id, 1);
    return this.getStateById(created.id);
  }

  /**
   * Exclusions inter-runs figées au démarrage d'une run (anti-répétition, cf.
   * BRAINRUN_THEME_COEFFICIENTS_PLAN.md) :
   * - `excludedCardThemes` : union des 3 plus gros coefficients (topThemes) des 2 dernières runs
   *   VALIDES (reachedFirstBoss) — thèmes jamais proposés en carte cette run, pour forcer la variété.
   * - `excludedQuestionIds` : union des questions servies (usedQuestionIds) des 2 dernières runs
   *   quelconques — exclusion SOUPLE des questions (cf. getRandomIdsByThemeWeights).
   */
  private async computeRunExclusions(userId: string): Promise<{
    excludedCardThemes: string[];
    excludedQuestionIds: number[];
  }> {
    const [recentRuns, validRuns] = await Promise.all([
      prisma.brainrunRun.findMany({
        where: { userId },
        orderBy: { createDate: "desc" },
        take: 2,
        select: { usedQuestionIds: true },
      }),
      prisma.brainrunRun.findMany({
        where: { userId, reachedFirstBoss: true },
        orderBy: { createDate: "desc" },
        take: 2,
        select: { themeCoefficients: true },
      }),
    ]);
    const excludedQuestionIds = [...new Set(recentRuns.flatMap((r) => r.usedQuestionIds))];
    const excludedCardThemes = [
      ...new Set(
        validRuns.flatMap((r) => topThemes((r.themeCoefficients as Record<string, number>) ?? {})),
      ),
    ];
    return { excludedCardThemes, excludedQuestionIds };
  }

  /** Points de Savoir gagnés en fin de run (WON/LOST/ABANDONED) : or converti
   * (goldToKnowledgePoints), majoré du bonus du talent Intérêts Composés (`bonus`, 0 si le
   * talent n'est pas débloqué) — `bonus` est exposé séparément pour l'affichage détaillé du
   * récap ("+24 PS (+3)"). */
  private async knowledgePointsForRun(
    userId: string,
    gold: number,
  ): Promise<{ total: number; bonus: number }> {
    const base = goldToKnowledgePoints(gold);
    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
    const bonus =
      talentEffects.knowledgePointsGainPct > 0
        ? Math.floor((base * talentEffects.knowledgePointsGainPct) / 100)
        : 0;
    return { total: base + bonus, bonus };
  }

  async abandonRun(userId: string): Promise<void> {
    const run = await prisma.brainrunRun.findFirst({ where: { userId, status: "IN_PROGRESS" } });
    if (!run) return;
    // Une run touchée par le debug (cf. debugSetStats/debugJumpToNode) ne rapporte pas de Points
    // de Savoir et n'est pas comptée dans les achievements — même règle qu'à la fin normale d'une
    // run (finalizeRun) : ce n'est pas une vraie partie.
    const { total: knowledgePointsEarned, bonus: knowledgePointsBonus } = run.isDebugRun
      ? { total: 0, bonus: 0 }
      : await this.knowledgePointsForRun(userId, run.gold);
    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        status: "ABANDONED",
        endDate: new Date(),
        knowledgePointsEarned,
        knowledgePointsBonus,
      },
    });
    if (!run.isDebugRun) {
      await grantKnowledgePoints(userId, knowledgePointsEarned);
      await this.awardBrainrunProgressAchievements(userId);
    }
  }

  /** col = colonne du nœud choisi sur run.currentRow, parmi les candidats accessibles depuis la
   * dernière salle nettoyée (cf. getCandidateNodes). Le type de la salle est celui déjà assigné
   * à la génération de l'acte (cf. seedActGraph) — jamais fourni par le client. */
  async chooseNode(runId: string, col: number, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    if (run.currentCol !== null) {
      throw createError({ statusCode: 409, statusMessage: "Cette salle n'attend pas de choix." });
    }
    const node = this.getCandidateNodes(run).find((n) => n.col === col);
    if (!node) {
      throw createError({ statusCode: 400, statusMessage: "Nœud non accessible." });
    }
    await this.resolveNodeChoice(run, node, col, userId);
    return this.getStateById(run.id);
  }

  /** Résout un nœud choisi (candidat normal via chooseNode, ou nœud debug via debugJumpToNode) :
   * active la salle spéciale ou tire ennemi/boss+questions pour un combat. `forcedCombatId`
   * (debug uniquement) impose l'ennemi/boss au lieu du tirage aléatoire habituel. */
  private async resolveNodeChoice(
    run: BrainrunRunRow & { rooms: BrainrunRoomRow[] },
    node: BrainrunRoomRow,
    col: number,
    userId: string,
    forcedCombatId?: string,
  ): Promise<void> {
    const choice = node.type as BrainrunRoomType;
    const effects = getActiveRelicEffects(run.relics);
    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);

    if (choice === "NEUTRAL") {
      // Nœud de démarrage cosmétique (rangée 1 de l'acte 1 uniquement, cf. references/map.md) :
      // se nettoie instantanément au clic, sans question ni choix joueur — contrairement aux
      // salles ACTIVE (REST/SHOP/EVENT) qui attendent une action supplémentaire.
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: { status: "CLEARED" },
      });
      await this.advanceAfterRoomClear(run.id, run.currentAct, node.row);
    } else if (choice === "REST") {
      // Reste ACTIVE tant que le joueur n'a pas choisi entre se reposer et bannir un thème
      // (cf. resolveRest) : contrairement aux autres salles instantanées, la Bibliothèque
      // demande toujours un choix explicite.
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: { status: "ACTIVE" },
      });
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { currentCol: col } });
    } else if (choice === "SHOP") {
      // Reste ACTIVE tant que le joueur n'a pas cliqué "Quitter la boutique" (cf. leaveShop) :
      // il peut acheter plusieurs offres avant de continuer sa route.
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: {
          status: "ACTIVE",
          offers: generateShopOffers(
            run.relics,
            Math.random,
            talentEffects.rareRelicWeightBonus,
            effects.shopPriceMultiplier,
          ),
        },
      });
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { currentCol: col } });
    } else if (choice === "EVENT") {
      // L'événement du nœud a été fixé à la génération de la carte (cf. seedActGraph/
      // assignEventIdentities), garantissant aucun doublon sur la run. Filet de sécurité si absent
      // (nœud EVENT forcé via debugJumpToNode sans eventId préassigné) : on en tire un à la volée
      // dans le pool de l'acte, en excluant ceux déjà placés. Reste ACTIVE tant que le joueur n'a
      // pas choisi une option (cf. resolveEvent).
      const eventId = node.eventId ?? (await this.pickFallbackEventId(run.id, run.currentAct));
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: { status: "ACTIVE", eventId },
      });
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { currentCol: col } });
    } else {
      const combatType = choice as CombatRoomType;
      const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE[combatType]!;
      // Le combat de boss n'a pas de nombre de questions fixe : on n'en tire qu'une seule ici,
      // les suivantes sont générées à la volée dans submitAnswer tant que le boss n'est pas à 0 PV.
      const count = combatType === "BOSS" ? 1 : BRAINRUN_QUESTIONS_PER_ROOM[combatType];

      // L'ennemi/boss du nœud a déjà été fixé à la génération de la carte (cf. seedActGraph/
      // assignCombatIdentities), pour que la relique Prévoyance montre le vrai ennemi qu'on va
      // affronter. `forcedCombatId` (debug uniquement, cf. debugJumpToNode) permet de l'écraser
      // explicitement. Purge Thématique n'exclut plus l'ennemi lui-même : elle retire simplement
      // le thème banni du pool utilisé pour les questions (cf. effectiveThemes ci-dessous).
      let enemyId = node.enemyId;
      let bossId = node.bossId;
      if (forcedCombatId) {
        if (combatType === "BOSS") {
          const boss = getBrainrunBossById(forcedCombatId);
          if (!boss) {
            throw createError({ statusCode: 400, statusMessage: "Boss invalide pour cet acte." });
          }
          bossId = boss.id;
          enemyId = null;
        } else {
          const enemy = getBrainrunEnemyById(forcedCombatId);
          if (!enemy) {
            throw createError({
              statusCode: 400,
              statusMessage: "Ennemi invalide pour cet acte/type.",
            });
          }
          enemyId = enemy.id;
          bossId = null;
        }
      }
      const combatDef =
        combatType === "BOSS" ? getBrainrunBossById(bossId!) : getBrainrunEnemyById(enemyId!);
      if (!combatDef) {
        throw createError({
          statusCode: 500,
          statusMessage: "Ennemi/boss introuvable pour ce nœud.",
        });
      }
      const combatThemes = effectiveThemes(combatDef.themes, run.bannedThemes);
      // Poids de tirage par thème = coefficient du joueur + bonus de l'ennemi sur SES thèmes
      // (acte × tier). Le tier reflète le type de rencontre : STANDARD → CLASSIC, ELITE → ELITE,
      // BOSS → BOSS (l'ennemi tiré pour un nœud correspond toujours à son type par construction).
      const combatTier: "CLASSIC" | "ELITE" | "BOSS" =
        combatType === "BOSS" ? "BOSS" : (combatDef as { tier: "CLASSIC" | "ELITE" }).tier;
      const themeWeights = buildCombatThemeWeights(
        (run.themeCoefficients as Record<string, number>) ?? {},
        combatThemes,
        enemyThemeBonus(run.currentAct, combatTier),
        run.bannedThemes,
      );

      const questionIds = await questionService.getRandomIdsByThemeWeights(
        themeWeights,
        minDifficulty,
        maxDifficulty,
        count,
        run.usedQuestionIds,
        userId,
        { culture_generale: BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[run.currentAct]! },
        run.bannedThemes,
        run.excludedQuestionIds,
      );
      const { reveal: entryReveal, fiftyFiftyConsumed } = await this.computeQuestionEntryReveal(
        questionIds[0],
        effects,
        run.fiftyFiftyCharges,
      );
      // Talent Faille d'Entrée : le boss démarre le combat avec un pourcentage de PV en moins.
      const bossStartHp =
        combatType === "BOSS" && talentEffects.bossHpReductionPct > 0
          ? Math.round(BRAINRUN_BOSS_MAX_HP * (1 - talentEffects.bossHpReductionPct / 100))
          : BRAINRUN_BOSS_MAX_HP;

      if (combatType === "BOSS" && run.currentAct === 1) {
        await dailyRewardService.incrementQuestProgress(userId, "PLAY_BRAINRUN", 1);
      }

      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: {
          status: "ACTIVE",
          questionIds,
          responses: [],
          consumableReveal: entryReveal,
          ...(forcedCombatId ? { enemyId, bossId } : {}),
          ...(combatType === "BOSS"
            ? {
                bossHealthPoint: bossStartHp,
                bossMaxHealthPoint: bossStartHp,
                bossPhase: 0,
                // Chrono non démarré ici : laissé à null comme entre deux questions (cf.
                // prepareNextBossQuestion), pour laisser le temps à la transition d'entrée en
                // combat (BrainrunCombatIntro) de s'afficher côté client sans entamer le temps
                // de réponse de la 1re question.
              }
            : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          currentCol: col,
          usedQuestionIds: [...run.usedQuestionIds, ...questionIds],
          // Marque la run comme « valide » dès l'entrée dans le boss de l'Acte 1 : sert au calcul
          // de excludedCardThemes des runs suivantes (cf. computeRunExclusions).
          ...(combatType === "BOSS" && run.currentAct === 1 ? { reachedFirstBoss: true } : {}),
          // Charge de 50/50 automatique consommée par la 1re question du combat (récompense
          // d'Événement, cf. computeQuestionEntryReveal).
          ...(fiftyFiftyConsumed ? { fiftyFiftyCharges: { decrement: 1 } } : {}),
          // Talent Bouclier du Boss : octroie 1 charge de Bouclier au début de chaque combat de
          // Boss (partagée avec le consommable et Bouclier d'Acte, cf. grantShieldCharge).
          ...(combatType === "BOSS" && talentEffects.hasShieldOnBossStart
            ? { shieldCharges: grantShieldCharge(run.shieldCharges, run.healthPoint) }
            : {}),
        },
      });
    }
  }

  /** Debug uniquement (assertDebugAccess : dev libre, admin requis en prod) : force PV/or de la
   * run en cours sans passer par une salle. Les champs omis conservent leur valeur actuelle. PV
   * plancher à 1 pour ne pas laisser la run dans un état "0 PV mais toujours IN_PROGRESS" que le
   * client ne gère pas (la mort ne se déclenche normalement que dans submitAnswer). */
  async debugSetStats(
    runId: string,
    userId: string,
    patch: {
      healthPoint?: number;
      maxHealthPoint?: number;
      gold?: number;
      themeCoefficients?: Record<string, number>;
    },
  ): Promise<BrainrunStateDTO> {
    await assertDebugAccess(userId);
    const run = await this.getOwnedInProgressRun(runId, userId);

    const maxHealthPoint =
      patch.maxHealthPoint !== undefined
        ? Math.max(1, Math.min(BRAINRUN_ABSOLUTE_MAX_HP, Math.round(patch.maxHealthPoint)))
        : run.maxHealthPoint;
    const healthPoint =
      patch.healthPoint !== undefined
        ? Math.max(1, Math.min(maxHealthPoint, Math.round(patch.healthPoint)))
        : Math.min(run.healthPoint, maxHealthPoint);
    const gold = patch.gold !== undefined ? Math.max(0, Math.round(patch.gold)) : run.gold;

    // Fusion des coefficients fournis dans ceux de la run (un coef ≤ 0 retire le thème) ; laissés
    // intacts si le patch n'en fournit pas.
    let themeCoefficients = (run.themeCoefficients as Record<string, number>) ?? {};
    if (patch.themeCoefficients) {
      themeCoefficients = { ...themeCoefficients };
      for (const [slug, coef] of Object.entries(patch.themeCoefficients)) {
        const value = Math.max(0, Math.round(coef));
        if (value > 0) themeCoefficients[slug] = value;
        else delete themeCoefficients[slug];
      }
    }

    await prisma.brainrunRun.update({
      where: { id: runId },
      // isDebugRun : marque la run une fois pour toutes (jamais réinitialisé) — bloque XP/pièces/
      // Points de Savoir et l'incrémentation des achievements en fin de run, cf. finalizeRun/
      // advanceAfterRoomClear/abandonRun.
      data: { healthPoint, maxHealthPoint, gold, themeCoefficients, isDebugRun: true },
    });
    return this.getStateById(runId);
  }

  /** Debug uniquement (assertDebugAccess) : rejette la carte de l'acte en cours — nouveau graphe,
   * nouveaux types de salle, nouveaux ennemis/événements — et replace le joueur à son entrée. Sert
   * à inspecter rapidement plusieurs tirages de génération sans rejouer une run entière. PV, or,
   * reliques, consommables et coefficients de thème sont conservés : seule la carte change. */
  async debugRegenerateMap(runId: string, userId: string): Promise<BrainrunStateDTO> {
    await assertDebugAccess(userId);
    const run = await this.getOwnedInProgressRun(runId, userId);
    const effects = getActiveRelicEffects(run.relics);

    await prisma.brainrunRoom.deleteMany({ where: { runId, act: run.currentAct } });
    // Les salles déjà nettoyées de cet acte n'existent plus : le joueur repart de son entrée.
    // seedActGraph repositionne lui-même currentRow à 2 pour l'acte 1 (rangée Neutre pré-nettoyée).
    await prisma.brainrunRun.update({
      where: { id: runId },
      data: { currentRow: 1, currentCol: null, isDebugRun: true },
    });
    await this.seedActGraph(runId, run.currentAct, effects.eventBonusChance);
    return this.getStateById(runId);
  }

  /** Debug uniquement : téléporte la run vers un nœud précis (doit être PENDING — pas de
   * ré-résolution d'une salle déjà traitée), en forçant optionnellement son type et/ou
   * l'ennemi/boss tiré pour le combat. Génère l'acte cible s'il n'est pas encore semé. */
  async debugJumpToNode(
    runId: string,
    userId: string,
    target: {
      act: number;
      row: number;
      col: number;
      roomType?: BrainrunRoomType;
      forcedCombatId?: string;
    },
  ): Promise<BrainrunStateDTO> {
    await assertDebugAccess(userId);
    const run = await this.getOwnedInProgressRun(runId, userId);

    if (target.act < 1 || target.act > BRAINRUN_TOTAL_ACTS) {
      throw createError({ statusCode: 400, statusMessage: "Acte invalide." });
    }
    // La silhouette d'un acte est tirée à sa génération (largeurs des étages du milieu variables,
    // cf. pickBrainrunActRowWidths) : les bornes de rangée/colonne se lisent donc sur les salles
    // réellement persistées, jamais sur une forme théorique recalculée.
    let actRooms = run.rooms.filter((r) => r.act === target.act);
    if (actRooms.length === 0) {
      const effects = getActiveRelicEffects(run.relics);
      await this.seedActGraph(runId, target.act, effects.eventBonusChance);
      actRooms = await prisma.brainrunRoom.findMany({ where: { runId, act: target.act } });
    }
    const lastRow = Math.max(...actRooms.map((r) => r.row));

    // La dernière rangée est toujours (et seulement) le Boss, cf. references/map.md — invariant
    // dont dépend nextRowAfterClear pour détecter la fin d'acte/de run.
    if (target.roomType === "BOSS" && target.row !== lastRow) {
      throw createError({
        statusCode: 400,
        statusMessage: "Seule la dernière rangée peut être Boss.",
      });
    }
    if (target.roomType && target.roomType !== "BOSS" && target.row === lastRow) {
      throw createError({
        statusCode: 400,
        statusMessage: "La dernière rangée doit rester de type Boss.",
      });
    }

    let node = actRooms.find((r) => r.row === target.row && r.col === target.col);
    if (!node) {
      throw createError({
        statusCode: 400,
        statusMessage: `Nœud (rangée ${target.row}, colonne ${target.col}) inexistant sur cette carte.`,
      });
    }
    if (node.status !== "PENDING") {
      throw createError({
        statusCode: 409,
        statusMessage: "Cette salle a déjà été résolue, choisis un nœud non résolu.",
      });
    }

    if (target.roomType && target.roomType !== node.type) {
      // L'ennemi/boss du nœud a été fixé pour son type d'origine (cf. seedActGraph) : s'il ne
      // correspond plus au type forcé ici, on en retire un nouveau adapté (sauf si forcedCombatId
      // est fourni, auquel cas resolveNodeChoice s'en charge lui-même juste après).
      let combatUpdate: { enemyId: string | null; bossId: string | null } | undefined;
      if (!target.forcedCombatId) {
        if (target.roomType === "BOSS") {
          combatUpdate = {
            enemyId: null,
            bossId: pickCombatCandidate(getBrainrunBossesByAct(target.act), []).id,
          };
        } else if (target.roomType === "STANDARD" || target.roomType === "ELITE") {
          const tier = target.roomType === "STANDARD" ? "CLASSIC" : "ELITE";
          combatUpdate = {
            enemyId: pickCombatCandidate(getBrainrunEnemiesByActAndTier(target.act, tier), []).id,
            bossId: null,
          };
        } else {
          combatUpdate = { enemyId: null, bossId: null };
        }
      }
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: { type: target.roomType, ...combatUpdate },
      });
      node = { ...node, type: target.roomType, ...combatUpdate };
    }

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: {
        currentAct: target.act,
        currentRow: target.row,
        // Cf. debugSetStats : bloque XP/pièces/Points de Savoir/achievements en fin de run.
        isDebugRun: true,
      },
    });

    const jumpedRun = { ...run, currentAct: target.act, currentRow: target.row };
    await this.resolveNodeChoice(jumpedRun, node, target.col, userId, target.forcedCombatId);
    return this.getStateById(runId);
  }

  async submitAnswer(
    runId: string,
    questionId: number,
    userResponseId: number,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    if (run.currentCol === null) {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucune question en attente pour cette salle.",
      });
    }
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.status !== "ACTIVE") {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucune question en attente pour cette salle.",
      });
    }

    const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
    const isBossRoom = activeRoom.type === "BOSS";
    const bossDef = isBossRoom ? getBrainrunBossById(activeRoom.bossId) : undefined;
    // Malus "Alain" (memory_recall) : la toute 1re question d'un combat contre lui est en lecture
    // forcée (cf. prepareNextBossQuestion) — pas encore de propositions envoyées au client pour
    // elle, donc rien de légitime à valider tant que la 2e question n'a pas été tirée.
    if (isAlainMemoryIntro(bossDef?.malus, responses.length, activeRoom.questionIds.length)) {
      throw createError({
        statusCode: 409,
        statusMessage: "Question en cours de mémorisation, rien à valider pour l'instant.",
      });
    }
    const expectedQuestionId = activeRoom.questionIds[responses.length];
    if (expectedQuestionId !== questionId) {
      throw createError({ statusCode: 400, statusMessage: "Cette question n'est pas attendue." });
    }

    // Question et méta-progression sont indépendantes : récupérées en parallèle pour éviter un
    // aller-retour DB séquentiel de plus sur le chemin (ressenti) de validation d'une réponse.
    const [question, metaProgress] = await Promise.all([
      prisma.question.findFirstOrThrow({ where: { id: questionId } }),
      getMetaProgress(userId),
    ]);
    const effects = getActiveRelicEffects(run.relics);
    const talentEffects = getActiveTalentEffects(metaProgress.unlockedTalents);
    const reveal = ((activeRoom.consumableReveal as ConsumableReveal | null) ??
      {}) as ConsumableReveal;
    const elapsedMs = activeRoom.questionStartedAt
      ? Date.now() - activeRoom.questionStartedAt.getTime()
      : 0;
    // Talents Rage du Désespoir/Sang-Froid (Résistance) : actifs tant qu'il ne reste qu'1 PV,
    // évalué sur le PV *avant* cette réponse (l'état dans lequel le joueur aborde la question).
    const isLastStand = run.healthPoint === 1;
    // Bonus de temps total : relique Chronomètre Brisé (permanent) + talents Réflexes
    // Affûtés/Répit Prolongé (permanent) + Sang-Froid (si 1 PV restant) + Sablier Fêlé
    // (consommable, une seule question) + malus Flash (négatif, rétrécit le temps imparti au fil
    // du combat).
    const bonusTimeMs =
      effects.bossTimeBonusMs +
      talentEffects.bonusBossTimeMs +
      (isLastStand ? talentEffects.bonusBossTimeAtLowHpMs : 0) +
      (reveal.chronoBonusMs ?? 0) +
      flashMalusBonusTimeMs(bossDef?.malus, responses.length, reveal.malusCancelled);
    // Talent Premier Souffle : la 1re réponse soumise dans un combat de boss n'a plus de limite
    // de temps (les dégâts potentiels peuvent quand même descendre à 0, cf.
    // brainrunPotentialBossDamage) — fonctionne nativement avec Alain (memory_recall) car
    // responses.length ne compte jamais son intro forcée (bloquée plus haut par isAlainMemoryIntro).
    const skipTimeoutForFirstAnswer =
      talentEffects.hasFirstAnswerNoTimeout && responses.length === 0;
    // Contre-la-montre : passé le délai imparti, la réponse est forcée en échec, quelle que
    // soit la proposition envoyée par le client.
    const timedOut =
      isBossRoom && !skipTimeoutForFirstAnswer && isBossAnswerTimedOut(elapsedMs, bonusTimeMs);
    const success = !timedOut && isCorrectAnswer(question, userResponseId);
    if (success) {
      await dailyRewardService.incrementQuestProgress(userId, "ANSWER_QUESTIONS", 1);
    }
    // Une mauvaise réponse fait toujours perdre exactement 1 PV, quelle que soit la difficulté
    // de la question (plus de palier 1/2/3 PV) — seul un Bouclier peut encore annuler la perte.
    const rawHpLoss = success ? 0 : 1;
    const { hpLoss, shieldChargesRemaining } = consumeShieldCharge(run.shieldCharges, rawHpLoss);
    const bossDamage = isBossRoom
      ? (() => {
          // Plancher de dégâts (talent Coup Assuré) appliqué sur la base décroissante, avant tout
          // bonus multiplicatif/additif — The Rock (damage_resist) continue de s'appliquer en tout
          // dernier, sur le total déjà bonifié, et divise donc aussi ce plancher par 2.
          const baseDamage = brainrunBossDamage(elapsedMs, success, bonusTimeMs);
          const withFloor =
            baseDamage > 0 && talentEffects.bossDamageFloor > 0
              ? Math.max(baseDamage, talentEffects.bossDamageFloor)
              : baseDamage;
          // Relique (Adrénaline) + talents Frappe Renforcée/Décisive + Rage du Désespoir (si 1 PV
          // restant) + Coup de Grâce (consommable, une seule question), jamais appliqués sur un
          // coup raté (comme applyRelicsToBossDamage).
          const relicDamage = applyRelicsToBossDamage(withFloor, effects);
          const withTalent =
            relicDamage > 0
              ? relicDamage +
                talentEffects.bonusBossDamagePerHit +
                (isLastStand ? talentEffects.bonusBossDamageAtLowHp : 0)
              : 0;
          const withConsumable = withTalent > 0 ? withTalent + (reveal.damageBonus ?? 0) : 0;
          // Malus The Rock : appliqué en tout dernier, sur le total déjà bonifié.
          return applyBossMalusToDamage(withConsumable, bossDef?.malus, reveal.malusCancelled);
        })()
      : 0;
    const questionData = question.data as any;
    const newResponses: BrainrunRoomResponse[] = [
      ...responses,
      {
        questionId,
        responseId: userResponseId,
        success,
        hpLoss,
        correctResponseId: questionData.response,
        commentaire: questionData.commentaire || "",
        commentaireImg: questionData.commentaireImg || "",
        ...(isBossRoom ? { bossDamage, timedOut } : {}),
      },
    ];
    let newHealthPoint = run.healthPoint - hpLoss;
    let died = newHealthPoint <= 0;
    // Ordre des filets de résurrection (règle générale, valable pour tout filet similaire) :
    // consommable → relique → talent.
    // Dernier Souffle (consommable) : consommé une fois, annule la mort et remonte à 1 PV.
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    const reviveTokenUsed = died && (consumables.REVIVE_TOKEN ?? 0) > 0;
    if (reviveTokenUsed) {
      newHealthPoint = 1;
      died = false;
      newResponses[newResponses.length - 1]!.extraLifeUsed = true;
    }
    // Seconde Chance (relique) : même effet, en secours si le consommable n'a pas (ou plus) sauvé
    // le joueur.
    const extraLifeUsed = died && effects.hasExtraLife;
    if (extraLifeUsed) {
      newHealthPoint = 1;
      died = false;
      newResponses[newResponses.length - 1]!.extraLifeUsed = true;
    }
    // Second Souffle (talent ultime, Résistance) : dernier filet, seulement si aucun des deux
    // précédents n'a agi, et une seule fois par run — remonte à 2 PV plutôt qu'1.
    const talentReviveUsed = died && talentEffects.hasUltimateRevive && !run.talentReviveUsed;
    if (talentReviveUsed) {
      newHealthPoint = 2;
      died = false;
      newResponses[newResponses.length - 1]!.extraLifeUsed = true;
    }
    const newBossHealthPoint = isBossRoom
      ? Math.max((activeRoom.bossHealthPoint ?? BRAINRUN_BOSS_MAX_HP) - bossDamage, 0)
      : null;
    // Le Phoenix (malus "phoenix_revive") ne meurt pas aux 2 premières mises à 0 : le combat
    // continue comme si le boss n'était pas vaincu (la vraie résurrection — remontée des PV +
    // incrément de bossPhase — n'a lieu qu'au clic sur "Continuer", cf. prepareNextBossQuestion,
    // pour laisser au joueur le temps de croire qu'il a gagné avant l'animation de résurrection).
    const isPhoenixPendingRevive =
      isBossRoom &&
      bossDef?.malus === "phoenix_revive" &&
      activeRoom.bossPhase < 2 &&
      newBossHealthPoint === 0;
    if (isPhoenixPendingRevive) {
      newResponses[newResponses.length - 1]!.bossRevived = true;
    }
    const bossDefeated = isBossRoom && newBossHealthPoint === 0 && !isPhoenixPendingRevive;
    // La salle se termine dès que toutes ses questions ont été posées, qu'elles aient
    // été réussies ou non — seule la mort met fin à la salle avant la dernière question.
    // Un combat de boss n'a pas de fin sur épuisement des questions : il ne se termine
    // que lorsque le boss est vaincu (bossDefeated) ou que le joueur meurt.
    const roomQuestionsDone = !isBossRoom && newResponses.length === activeRoom.questionIds.length;

    // Un Boss vaincu régénère intégralement les PV, pour repartir à plein sur l'acte suivant.
    const healthPointAfterCombat = bossDefeated ? run.maxHealthPoint : Math.max(newHealthPoint, 0);
    // Spécialisation : chance de récupérer 1 PV de plus à la fin d'un combat gagné (jamais utile
    // sur un Boss vaincu, qui régénère déjà tous les PV) ; signalé sur la dernière réponse pour
    // que le client puisse afficher un bref effet visuel avant le récap de fin de salle.
    const combatCleared = !died && (bossDefeated || roomQuestionsDone);
    const specializationHealTriggered =
      combatCleared &&
      effects.healChanceOnCombatEnd > 0 &&
      healthPointAfterCombat < run.maxHealthPoint &&
      Math.random() < effects.healChanceOnCombatEnd;
    const finalHealthPoint = specializationHealTriggered
      ? healthPointAfterCombat + 1
      : healthPointAfterCombat;
    if (specializationHealTriggered) {
      newResponses[newResponses.length - 1]!.healthRegenerated = true;
    }
    // Les charges de Bouclier expirent à la fin de chaque combat (utilisées ou non), quelle que
    // soit leur source (consommable ou talents Bouclier d'Acte/du Boss) ; sinon on reflète juste
    // la consommation éventuelle de cette réponse.
    const combatEnds = died || bossDefeated || roomQuestionsDone;

    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        healthPoint: finalHealthPoint,
        shieldCharges: combatEnds ? 0 : shieldChargesRemaining,
        ...(talentReviveUsed ? { talentReviveUsed: true } : {}),
        ...(extraLifeUsed ? { relics: run.relics.filter((r) => r !== "SECOND_CHANCE") } : {}),
        ...(reviveTokenUsed
          ? { consumables: { ...consumables, REVIVE_TOKEN: consumables.REVIVE_TOKEN! - 1 } }
          : {}),
      },
    });

    if (died) {
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          responses: newResponses,
          status: "FAILED",
          ...(isBossRoom ? { bossHealthPoint: newBossHealthPoint } : {}),
        },
      });
      await this.finalizeRun(run.id, "LOST");
    } else if (bossDefeated || roomQuestionsDone) {
      const goldEarned = applyTalentsToGold(
        applyRelicsToGold(BRAINRUN_GOLD_BY_ROOM_TYPE[activeRoom.type as CombatRoomType], effects),
        talentEffects,
      );
      // Bonus post-combat (relique/consommable au choix) uniquement après Elite/Boss —
      // les salles Standard ne rapportent que de l'or, pour garder Elite/Boss comme temps forts.
      // Exception : le Boss du dernier acte (qui gagne la run) ne propose pas de bonus — la run est
      // finie, une récompense n'aurait aucun usage (cf. nextRowAfterClear → RUN_WON).
      const isRunWinningBoss =
        activeRoom.type === "BOSS" &&
        nextRowAfterClear(activeRoom.act, activeRoom.row).kind === "RUN_WON";
      const grantsBonus =
        (activeRoom.type === "ELITE" || activeRoom.type === "BOSS") && !isRunWinningBoss;
      // Carte de thème : proposée après TOUT combat gagné (standard/élite/boss), sauf le Boss final
      // (run gagnée, coefficient inutilisable). Pour Élite/Boss, elle est résolue AVANT le bonus
      // relique/consommable (cf. acknowledgeRoom / la machine à états client).
      const grantsCard = !isRunWinningBoss;
      const themeCardOffer = grantsCard ? await this.generateThemeCardOffer(run) : [];
      // Talent Générosité : +1 offre, réservé aux Élites (le Boss reste à BRAINRUN_BONUS_OFFER_COUNT).
      const bonusOfferCount =
        activeRoom.type === "ELITE" && talentEffects.hasEliteExtraOffer
          ? BRAINRUN_BONUS_OFFER_COUNT + 1
          : BRAINRUN_BONUS_OFFER_COUNT;
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          responses: newResponses,
          status: "CLEARED",
          goldEarned,
          ...(isBossRoom ? { bossHealthPoint: newBossHealthPoint } : {}),
          ...(themeCardOffer.length > 0 ? { themeCardOffer, themeCardResolved: false } : {}),
          ...(grantsBonus
            ? {
                offers: generateBonusOffers(
                  run.relics,
                  Math.random,
                  talentEffects.rareRelicWeightBonus,
                  bonusOfferCount,
                ),
                offersRequireChoice: true,
                offersResolved: false,
              }
            : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { gold: { increment: goldEarned } },
      });
      // L'avancée vers la salle suivante est différée : acknowledgeRoom() la déclenche
      // une fois que le joueur a vu le récap (or gagné / PV perdus) et résolu le bonus éventuel.
    } else {
      // Boss non vaincu : si la réserve de questions déjà tirées est épuisée, on en tire
      // une nouvelle à la volée (pas de limite de questions pour un combat de boss). Alain
      // (memory_recall) a besoin d'une question d'avance supplémentaire en temps normal : celle
      // qu'on est en train de valider (comme les autres boss) + celle déjà affichée à mémoriser
      // pour l'étape suivante (cf. isAlainMemoryIntro / prepareNextBossQuestion) — SAUF si
      // l'Antidote (reveal.malusCancelled) vient d'annuler le malus sur la réponse qu'on traite
      // ici : l'écran a alors montré l'énoncé de CETTE question plutôt que celui de la suivante,
      // qui n'a donc jamais été affichée au joueur. On ne la tire pas d'avance dans ce cas : le
      // prochain calcul d'état retombera sur isAlainMemoryIntro (lead redescendu à 1) et lui
      // donnera son propre décompte de mémorisation avant de devenir validable à son tour.
      const requiredLead = bossDef?.malus === "memory_recall" ? (reveal.malusCancelled ? 1 : 2) : 1;
      let updatedQuestionIds = activeRoom.questionIds;
      let updatedUsedQuestionIds: number[] | undefined;
      if (isBossRoom && activeRoom.questionIds.length - newResponses.length < requiredLead) {
        updatedUsedQuestionIds = [...run.usedQuestionIds, ...activeRoom.questionIds];
        const nextQuestionId = await this.getNextBossQuestionId(
          run,
          bossDef?.themes ?? [],
          updatedUsedQuestionIds,
          userId,
        );
        updatedQuestionIds = [...activeRoom.questionIds, nextQuestionId];
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { usedQuestionIds: updatedUsedQuestionIds },
        });
      }

      // Réinitialisé pour la prochaine question : l'effet 50/50 / Appel à un ami ne s'applique
      // qu'à la question sur laquelle il a été utilisé ; Sixième Sens et le 50/50 automatique
      // (charges d'Événement) sont ré-évalués pour la nouvelle question (cf.
      // computeQuestionEntryReveal).
      const { reveal: nextConsumableReveal, fiftyFiftyConsumed } =
        await this.computeQuestionEntryReveal(
          updatedQuestionIds[newResponses.length],
          effects,
          run.fiftyFiftyCharges,
        );

      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          responses: newResponses,
          questionIds: updatedQuestionIds,
          consumableReveal: nextConsumableReveal,
          // Le chrono de la question suivante ne démarre qu'à l'appel explicite de
          // prepareNextBossQuestion(), une fois que le joueur a fini de lire le feedback
          // de cette réponse — sinon le temps de lecture serait décompté à son insu.
          ...(isBossRoom ? { bossHealthPoint: newBossHealthPoint, questionStartedAt: null } : {}),
        },
      });
      // Charge de 50/50 automatique consommée par cette nouvelle question (cf. entrée en combat).
      if (fiftyFiftyConsumed) {
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { fiftyFiftyCharges: { decrement: 1 } },
        });
      }
    }

    return this.getStateById(run.id);
  }

  /**
   * Confirme le récap de fin de salle (CLEARED) et fait avancer la run vers la salle
   * suivante (ou déclenche la fin de run si c'était le boss du dernier acte).
   */
  async acknowledgeRoom(runId: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.status !== "CLEARED") {
      throw createError({ statusCode: 409, statusMessage: "Aucune salle terminée à valider." });
    }
    // Carte de thème post-combat : bloque l'avancée tant qu'elle n'est pas choisie ou passée,
    // avant même le bonus relique/consommable (ordre carte → bonus pour Élite/Boss).
    if (activeRoom.themeCardOffer && !activeRoom.themeCardResolved) {
      throw createError({
        statusCode: 409,
        statusMessage: "Choisissez une carte de thème avant de continuer.",
      });
    }
    // Bonus post-combat (Elite/Boss) : bloque l'avancée tant qu'un choix n'a pas été fait.
    // Les salles Phase 1/2 déjà en base ont offers === null et ne sont jamais bloquées ici.
    if (activeRoom.offersRequireChoice && activeRoom.offers && !activeRoom.offersResolved) {
      throw createError({
        statusCode: 409,
        statusMessage: "Choisissez un bonus avant de continuer.",
      });
    }
    // Purge Thématique : bloque l'avancée tant que le joueur n'a pas choisi le thème à bannir.
    if (run.pendingThemeBanChoice) {
      throw createError({
        statusCode: 409,
        statusMessage: "Choisissez un thème à bannir avant de continuer.",
      });
    }

    await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentRow);
    return this.getStateById(run.id);
  }

  /**
   * Résout le bonus post-combat (Elite/Boss) : `pick` est l'id d'une relique/consommable
   * proposé dans `offers`, ou "SKIP" pour ne rien prendre. N'avance PAS la salle — c'est
   * acknowledgeRoom() qui le fait ensuite, une fois le bonus résolu.
   */
  async resolveBonus(runId: string, pick: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (
      !activeRoom.offersRequireChoice ||
      activeRoom.status !== "CLEARED" ||
      activeRoom.offersResolved
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucun bonus à choisir pour cette salle.",
      });
    }

    if (pick !== "SKIP") {
      const offers = (activeRoom.offers as unknown as BrainrunOffer[]) ?? [];
      const offer = offers.find((o) => o.id === pick);
      if (!offer) {
        throw createError({ statusCode: 400, statusMessage: "Bonus non proposé." });
      }
      if (
        offer.kind === "CONSUMABLE" &&
        this.usedConsumableSlots((run.consumables as ConsumableCounts) ?? {}) >=
          this.maxConsumableSlots(run.relics)
      ) {
        throw createError({ statusCode: 409, statusMessage: "Inventaire de consommables plein." });
      }
      await this.grantOffer(run.id, offer, userId);
    } else {
      // Lot de Consolation : de l'or pour compenser un bonus ignoré.
      const effects = getActiveRelicEffects(run.relics);
      if (effects.goldOnBonusSkip > 0) {
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { gold: { increment: effects.goldOnBonusSkip } },
        });
      }
    }

    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { offersResolved: true },
    });
    return this.getStateById(run.id);
  }

  /**
   * Génère l'offre de cartes de thème post-combat. Pool éligible = thèmes présents dans les pools
   * d'ennemis/boss (déjà vérifiés pour le volume de questions), hors thèmes bannis (Purge Thématique)
   * et hors excludedCardThemes (anti-répétition inter-runs). Filet : si l'exclusion laisse moins de
   * BRAINRUN_THEME_CARD_COUNT thèmes, on relâche l'exclusion inter-runs (jamais le bannissement).
   * Les métadonnées (libellé, image) proviennent de la table Theme ; les slugs orphelins (sans ligne
   * Theme) sont naturellement écartés. La logique pure de tirage/rareté est generateThemeCards.
   */
  private async generateThemeCardOffer(run: BrainrunRunRow): Promise<BrainrunThemeCardDTO[]> {
    const allEnemyThemes = [
      ...new Set([
        ...BRAINRUN_ENEMIES.flatMap((e) => e.themes),
        ...BRAINRUN_BOSSES.flatMap((b) => b.themes),
      ]),
    ];
    const banned = new Set(run.bannedThemes);
    const excluded = new Set(run.excludedCardThemes);
    let eligible = allEnemyThemes.filter((t) => !banned.has(t) && !excluded.has(t));
    if (eligible.length < BRAINRUN_THEME_CARD_COUNT) {
      eligible = allEnemyThemes.filter((t) => !banned.has(t));
    }
    const coefficients = (run.themeCoefficients as Record<string, number>) ?? {};
    // Thèmes déjà investis (coef > 0), hors bannis et hors plafond : injectés à 10 %/carte même
    // s'ils ne sont pas dans le pool de l'ennemi courant. L'anti-répétition inter-runs
    // (excludedCardThemes) ne les bloque pas — ce sont les investissements de LA run en cours, qu'on
    // veut pouvoir renforcer. Un thème déjà au plafond est exclu (une carte à +0 serait inutile).
    const investedThemes = Object.entries(coefficients)
      .filter(
        ([slug, coef]) => coef > 0 && coef < BRAINRUN_THEME_COEFFICIENT_MAX && !banned.has(slug),
      )
      .map(([slug]) => slug);
    if (eligible.length === 0 && investedThemes.length === 0) return [];
    // Une seule requête pour les métadonnées des deux pools (name/picture depuis questionTheme).
    const metaSlugs = [...new Set([...eligible, ...investedThemes])];
    const themeRows = await prisma.questionTheme.findMany({
      where: { slug: { in: metaSlugs } },
      select: { slug: true, name: true, picture: true },
    });
    const metaBySlug = new Map(
      themeRows.map((t) => [t.slug, { slug: t.slug, name: t.name, image: t.picture }]),
    );
    const candidates = eligible
      .map((slug) => metaBySlug.get(slug))
      .filter((m): m is { slug: string; name: string; image: string } => m !== undefined);
    const investedCandidates = investedThemes
      .map((slug) => metaBySlug.get(slug))
      .filter((m): m is { slug: string; name: string; image: string } => m !== undefined);
    return generateThemeCards(
      candidates,
      coefficients,
      BRAINRUN_THEME_CARD_COUNT,
      Math.random,
      investedCandidates,
    );
  }

  /**
   * Résout la carte de thème post-combat : `pick` est le slug d'une carte proposée (monte son
   * coefficient de +rareté, persisté dans themeCoefficients) ou "SKIP" pour passer. La sélection
   * d'une carte est **obligatoire** par défaut : "SKIP" n'est autorisé qu'avec la relique Libre
   * Arbitre (`canSkipThemeCard`), auquel cas il applique aussi la relique Lot de Consolation (comme
   * resolveBonus). N'avance PAS la salle — c'est acknowledgeRoom() qui le fait, une fois carte ET
   * bonus éventuel résolus.
   */
  async resolveThemeCard(runId: string, pick: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    const offer = (activeRoom.themeCardOffer as unknown as BrainrunThemeCardDTO[] | null) ?? null;
    if (activeRoom.status !== "CLEARED" || !offer || activeRoom.themeCardResolved) {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucune carte de thème à choisir pour cette salle.",
      });
    }

    if (pick !== "SKIP") {
      const card = offer.find((c) => c.themeSlug === pick);
      if (!card) {
        throw createError({ statusCode: 400, statusMessage: "Carte de thème non proposée." });
      }
      const coefficients = { ...(run.themeCoefficients as Record<string, number>) };
      coefficients[card.themeSlug] = card.coefAfter;
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { themeCoefficients: coefficients },
      });
    } else {
      // Passer une carte n'est possible qu'avec la relique Libre Arbitre — sinon la sélection est
      // obligatoire (garde côté serveur : le client masque déjà le bouton "Passer" en son absence).
      const effects = getActiveRelicEffects(run.relics);
      if (!effects.canSkipThemeCard) {
        throw createError({
          statusCode: 403,
          statusMessage: "La sélection d'une carte de thème est obligatoire.",
        });
      }
      // Lot de Consolation : de l'or pour compenser une carte ignorée (même effet qu'un bonus passé).
      if (effects.goldOnBonusSkip > 0) {
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { gold: { increment: effects.goldOnBonusSkip } },
        });
      }
    }

    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { themeCardResolved: true },
    });
    return this.getStateById(run.id);
  }

  /**
   * Achète une offre précise de la Boutique active ; retire cette offre de la liste (empêche
   * le rachat au même index) sans changer le statut de la salle — le joueur peut continuer
   * à acheter jusqu'à quitter la boutique (cf. leaveShop).
   */
  async buyShopItem(runId: string, offerIndex: number, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.type !== "SHOP" || activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune boutique active." });
    }
    const offers = (activeRoom.offers as unknown as BrainrunOffer[]) ?? [];
    const offer = offers[offerIndex];
    if (!offer) {
      throw createError({ statusCode: 400, statusMessage: "Offre invalide." });
    }
    if (
      offer.kind === "CONSUMABLE" &&
      this.usedConsumableSlots((run.consumables as ConsumableCounts) ?? {}) >=
        this.maxConsumableSlots(run.relics)
    ) {
      throw createError({ statusCode: 409, statusMessage: "Inventaire de consommables plein." });
    }

    const price = offer.price ?? 0;
    if (price > 0) {
      // Débit atomique et conditionnel : protège contre un double-clic qui achèterait à crédit.
      const result = await prisma.brainrunRun.updateMany({
        where: { id: run.id, gold: { gte: price } },
        data: { gold: { decrement: price } },
      });
      if (result.count === 0) {
        throw createError({ statusCode: 400, statusMessage: "Or insuffisant." });
      }
    }

    await this.grantOffer(run.id, offer, userId);

    // Fournisseur Fidèle : l'offre achetée est remplacée par une du même type plutôt que
    // supprimée. Inclut la relique tout juste achetée dans le calcul des effets, pour qu'acheter
    // Fournisseur Fidèle lui-même déclenche déjà le réassort sur cet achat.
    const relicsAfterPurchase = offer.kind === "RELIC" ? [...run.relics, offer.id] : run.relics;
    const effects = getActiveRelicEffects(relicsAfterPurchase);
    let updatedOffers: BrainrunOffer[];
    if (effects.autoRestockShop) {
      const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
      const replacement = generateShopReplacementOffer(
        offer.kind,
        relicsAfterPurchase,
        Math.random,
        talentEffects.rareRelicWeightBonus,
        effects.shopPriceMultiplier,
      );
      updatedOffers = offers.map((o, i) => (i === offerIndex ? replacement : o));
    } else {
      updatedOffers = offers.filter((_, i) => i !== offerIndex);
    }
    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { offers: updatedOffers },
    });
    return this.getStateById(run.id);
  }

  /** Quitte la Boutique : marque la salle CLEARED et avance vers la salle suivante. */
  async leaveShop(runId: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.type !== "SHOP" || activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune boutique active." });
    }
    if (run.pendingThemeBanChoice) {
      throw createError({
        statusCode: 409,
        statusMessage: "Choisissez un thème à bannir avant de continuer.",
      });
    }

    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { status: "CLEARED", goldEarned: 0 },
    });
    await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentRow);
    return this.getStateById(run.id);
  }

  /**
   * Résout le choix fait dans la Bibliothèque active : "HEAL" régénère 1 PV, "BAN_THEME"
   * bannit un thème pour le reste de la run (même validation que resolveThemeBan, mais sans
   * octroyer la relique Purge Thématique). Marque la salle CLEARED ; l'avancée reste différée
   * jusqu'à acknowledgeRoom, comme pour REST auparavant.
   */
  async resolveRest(
    runId: string,
    choice: "HEAL" | "BAN_THEME",
    userId: string,
    theme?: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.type !== "REST" || activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune Bibliothèque active." });
    }

    if (choice === "HEAL") {
      const newHealthPoint = Math.min(
        run.maxHealthPoint,
        run.healthPoint + instantRoomHealthDelta("REST"),
      );
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { healthPoint: newHealthPoint },
      });
    } else {
      const availableThemes = this.computeAvailableThemesToBan(run.bannedThemes);
      if (!theme || !availableThemes.includes(theme)) {
        throw createError({ statusCode: 400, statusMessage: "Thème invalide." });
      }
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { bannedThemes: [...run.bannedThemes, theme] },
      });
    }

    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { status: "CLEARED", goldEarned: 0 },
    });
    return this.getStateById(run.id);
  }

  /**
   * Résout l'option choisie d'un Événement actif : applique les deltas or/PV/relique/
   * consommables, termine la run si le coût en PV est fatal, sinon marque la salle CLEARED
   * (avancée différée jusqu'à acknowledgeRoom, comme pour REST).
   */
  async resolveEvent(
    runId: string,
    optionIndex: number,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.type !== "EVENT" || activeRoom.status !== "ACTIVE" || !activeRoom.eventId) {
      throw createError({ statusCode: 409, statusMessage: "Aucun événement actif." });
    }
    const event = BRAINRUN_EVENTS[activeRoom.eventId];
    const option = event?.options[optionIndex];
    if (!event || !option) {
      throw createError({ statusCode: 400, statusMessage: "Option d'événement invalide." });
    }
    const goldCost = option.cost?.gold ?? 0;
    if (goldCost > run.gold) {
      throw createError({ statusCode: 400, statusMessage: "Or insuffisant pour ce choix." });
    }
    // Coût en PV max (rançon d'une résurrection) refusé si le joueur passerait sous le plancher —
    // même garde côté client (option désactivée), défense en profondeur.
    const maxHpCost = option.cost?.maxHp ?? 0;
    if (maxHpCost > 0 && run.maxHealthPoint - maxHpCost < BRAINRUN_EVENT_MIN_MAX_HP) {
      throw createError({ statusCode: 400, statusMessage: "PV max insuffisants pour ce choix." });
    }

    const effects = getActiveRelicEffects(run.relics);
    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
    const resolved = resolveEventOption(option, {
      ownedRelics: run.relics,
      rareWeightBonus: talentEffects.rareRelicWeightBonus,
    });
    const hpCost = Math.max(0, -resolved.hpDelta);
    const hpReward = Math.max(0, resolved.hpDelta);
    const { hpLoss, shieldChargesRemaining } = consumeShieldCharge(run.shieldCharges, hpCost);
    const shieldConsumed = shieldChargesRemaining < run.shieldCharges;
    // PV max abaissé d'abord par une éventuelle rançon (coût maxHp, ≤ 0 ; jamais fatal car borné
    // par BRAINRUN_EVENT_MIN_MAX_HP plus haut), puis relevé par EXTRA_HEART plus bas.
    let finalMaxHealthPoint = run.maxHealthPoint + resolved.maxHpDelta;
    let newHealthPoint = Math.min(finalMaxHealthPoint, run.healthPoint - hpLoss + hpReward);
    let died = newHealthPoint <= 0;
    // Même filet de sécurité qu'en combat (cf. submitAnswer) pour un coût en PV fatal
    // d'Événement : consommable → relique → talent.
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    const reviveTokenUsed = died && (consumables.REVIVE_TOKEN ?? 0) > 0;
    if (reviveTokenUsed) {
      newHealthPoint = 1;
      died = false;
    }
    const extraLifeUsed = died && effects.hasExtraLife;
    if (extraLifeUsed) {
      newHealthPoint = 1;
      died = false;
    }
    const talentReviveUsed = died && talentEffects.hasUltimateRevive && !run.talentReviveUsed;
    if (talentReviveUsed) {
      newHealthPoint = 2;
      died = false;
    }

    let updatedRelics = run.relics;
    if (resolved.relicLost) {
      updatedRelics = updatedRelics.filter((r) => r !== resolved.relicLost);
    }
    if (extraLifeUsed) {
      updatedRelics = updatedRelics.filter((r) => r !== "SECOND_CHANCE");
    }
    // Purge Thématique octroyée par un Événement : comme pour grantOffer, la relique n'est
    // ajoutée qu'une fois le thème choisi (cf. resolveThemeBan) ; pas d'effet PV/relics ici.
    const grantsThemePurge = resolved.relicGranted === "THEME_PURGE";
    if (resolved.relicGranted && !grantsThemePurge) {
      updatedRelics = [...updatedRelics, resolved.relicGranted];
      if (resolved.relicGranted === "EXTRA_HEART") {
        finalMaxHealthPoint = Math.min(finalMaxHealthPoint + 1, BRAINRUN_ABSOLUTE_MAX_HP);
        newHealthPoint = Math.min(newHealthPoint + 1, finalMaxHealthPoint);
      }
    }

    // Soin complet (récompense d'Événement) : remonte les PV au max courant, après stabilisation
    // du PV max (rançon éventuelle + EXTRA_HEART). Seulement si le joueur survit.
    if (resolved.fullHealGranted && !died) {
      newHealthPoint = finalMaxHealthPoint;
    }

    // Charges de Bouclier gagnées (récompense d'Événement) : ajoutées après stabilisation des PV,
    // chacune plafonnée aux PV courants (grantShieldCharge). Seulement si le joueur survit.
    let newShieldCharges = shieldChargesRemaining;
    if (!died) {
      for (let i = 0; i < resolved.shieldChargesGranted; i++) {
        newShieldCharges = grantShieldCharge(newShieldCharges, newHealthPoint);
      }
    }

    // Dernier Souffle gagné (résurrection) : octroi direct hors plafond d'emplacements — c'est une
    // récompense garantie payée par une perte de PV max, elle ne doit jamais être perdue faute de
    // place (contrairement aux consommables ordinaires plafonnés par grantConsumable).
    let updatedConsumables = consumables;
    let consumablesChanged = false;
    if (reviveTokenUsed) {
      updatedConsumables = {
        ...updatedConsumables,
        REVIVE_TOKEN: (updatedConsumables.REVIVE_TOKEN ?? 0) - 1,
      };
      consumablesChanged = true;
    }
    if (resolved.reviveGranted && !died) {
      updatedConsumables = {
        ...updatedConsumables,
        REVIVE_TOKEN: (updatedConsumables.REVIVE_TOKEN ?? 0) + 1,
      };
      consumablesChanged = true;
    }

    const maxHealthPointChanged = finalMaxHealthPoint !== run.maxHealthPoint;
    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        healthPoint: Math.max(newHealthPoint, 0),
        gold: Math.max(0, run.gold + resolved.goldDelta),
        shieldCharges: newShieldCharges,
        ...(resolved.fiftyFiftyChargesGranted > 0 && !died
          ? { fiftyFiftyCharges: run.fiftyFiftyCharges + resolved.fiftyFiftyChargesGranted }
          : {}),
        ...(talentReviveUsed ? { talentReviveUsed: true } : {}),
        ...(resolved.relicLost || (resolved.relicGranted && !grantsThemePurge) || extraLifeUsed
          ? { relics: updatedRelics }
          : {}),
        ...(grantsThemePurge ? { pendingThemeBanChoice: true } : {}),
        ...(maxHealthPointChanged ? { maxHealthPoint: finalMaxHealthPoint } : {}),
        ...(consumablesChanged ? { consumables: updatedConsumables } : {}),
      },
    });
    if (resolved.relicGranted && !grantsThemePurge) {
      await recordRelicDiscovery(userId, resolved.relicGranted);
    }
    if (resolved.relicGranted === "EVENT_MAGNET") {
      await this.convertUpcomingNodesToEvents(run.id, run.currentAct, run.currentRow);
    }
    for (const grant of resolved.consumablesGranted) {
      await this.grantConsumable(run.id, grant.id, grant.amount);
    }

    if (died) {
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { status: "FAILED" },
      });
      await this.finalizeRun(run.id, "LOST");
    } else {
      // Résultat réellement appliqué (post-Bouclier/tirages aléatoires masqués), affiché tel quel
      // côté client à la place du récap générique une fois la salle CLEARED (cf. BrainrunEvent.vue) :
      // le lore de l'outcome tiré (resultText) + le détail visuel des gains réels.
      const outcome: BrainrunEventOutcomeDTO = {
        optionIndex,
        outcomeIndex: resolved.outcomeIndex,
        resultText: resolved.resultText,
        hpDelta: hpReward - hpLoss,
        fullHealGranted: resolved.fullHealGranted && !died,
        goldDelta: resolved.goldDelta,
        maxHpDelta: resolved.maxHpDelta,
        shieldChargesGranted: !died ? resolved.shieldChargesGranted : 0,
        fiftyFiftyChargesGranted: !died ? resolved.fiftyFiftyChargesGranted : 0,
        reviveGranted: resolved.reviveGranted,
        relicGranted: resolved.relicGranted,
        relicLost: resolved.relicLost,
        consumablesGranted: resolved.consumablesGranted,
        shieldConsumed,
      };
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          status: "CLEARED",
          goldEarned: Math.max(0, resolved.goldDelta),
          eventOutcome: outcome,
        },
      });
    }
    return this.getStateById(run.id);
  }

  /**
   * Résout le choix de thème banni après l'obtention de Purge Thématique : ajoute enfin la
   * relique à `relics` (jusqu'ici en attente, cf. grantOffer/resolveEvent) et le thème à
   * `bannedThemes`. Refuse un thème déjà banni ou qui ne fait plus partie du pool restant.
   */
  async resolveThemeBan(runId: string, theme: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);

    if (!run.pendingThemeBanChoice) {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucun bannissement de thème à résoudre.",
      });
    }
    const availableThemes = this.computeAvailableThemesToBan(run.bannedThemes);
    if (!availableThemes.includes(theme)) {
      throw createError({ statusCode: 400, statusMessage: "Thème invalide." });
    }

    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        relics: { push: "THEME_PURGE" },
        bannedThemes: [...run.bannedThemes, theme],
        pendingThemeBanChoice: false,
      },
    });
    await recordRelicDiscovery(userId, "THEME_PURGE");
    return this.getStateById(run.id);
  }

  /**
   * Utilise un consommable : décrémente l'inventaire. Bouclier/Potion de Soin/Cargaison Surprise
   * s'appliquent sans question en cours (comme Bouclier). Dernier Souffle ne se déclenche
   * qu'automatiquement (cf. submitAnswer/resolveEvent) — usage manuel refusé. Les autres
   * calculent et persistent leur effet sur la question en cours (`consumableReveal`), lu tel
   * quel côté client — un seul usage par question et par type.
   */
  async useConsumable(
    runId: string,
    type: BrainrunConsumableId,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    if (!consumables[type] || consumables[type]! <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Consommable indisponible." });
    }

    if (type === "REVIVE_TOKEN") {
      throw createError({
        statusCode: 400,
        statusMessage: "Ce consommable s'active automatiquement.",
      });
    }

    if (type === "SHIELD") {
      // Charge partagée avec les talents Bouclier d'Acte/du Boss (cf. grantShieldCharge) : une
      // charge au-delà du nombre de PV actuels ne peut protéger personne, elle est donc perdue
      // plutôt que refusée — le consommable est quand même dépensé (comme un achat malencontreux).
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          shieldCharges: grantShieldCharge(run.shieldCharges, run.healthPoint),
          consumables: { ...consumables, SHIELD: consumables.SHIELD! - 1 },
        },
      });
      return this.getStateById(run.id);
    }

    if (type === "HEAL_POTION") {
      if (run.healthPoint >= run.maxHealthPoint) {
        throw createError({ statusCode: 409, statusMessage: "Points de vie déjà au maximum." });
      }
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          healthPoint: Math.min(run.maxHealthPoint, run.healthPoint + 1),
          consumables: { ...consumables, HEAL_POTION: consumables.HEAL_POTION! - 1 },
        },
      });
      return this.getStateById(run.id);
    }

    if (type === "RANDOM_STASH") {
      const updated: ConsumableCounts = {
        ...consumables,
        RANDOM_STASH: consumables.RANDOM_STASH! - 1,
      };
      // Plafond d'emplacements : les tirages qui ne rentrent plus sont perdus (comme grantConsumable).
      let roomAvailable = Math.max(
        0,
        this.maxConsumableSlots(run.relics) - this.usedConsumableSlots(updated),
      );
      for (const grantedId of pickRandomStashConsumables()) {
        if (roomAvailable <= 0) break;
        updated[grantedId] = (updated[grantedId] ?? 0) + 1;
        roomAvailable -= 1;
      }
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { consumables: updated } });
      return this.getStateById(run.id);
    }

    if (run.currentCol === null) {
      throw createError({ statusCode: 409, statusMessage: "Aucune question en cours." });
    }
    const activeRoom = this.getActiveNode(run);
    if (activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune question en cours." });
    }
    const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
    const questionId = activeRoom.questionIds[responses.length];
    if (questionId === undefined) {
      throw createError({ statusCode: 409, statusMessage: "Aucune question en cours." });
    }

    const isBossOnlyType =
      type === "BOSS_CHRONO_BOOST" || type === "BOSS_DAMAGE_BOOST" || type === "MALUS_CANCEL";
    if (isBossOnlyType && activeRoom.type !== "BOSS") {
      throw createError({
        statusCode: 409,
        statusMessage: "Consommable réservé aux combats de boss.",
      });
    }

    if (type === "REDRAW_QUESTION") {
      const newQuestionId = await this.getReplacementQuestionId(
        run,
        activeRoom,
        questionId,
        userId,
      );
      const updatedQuestionIds = [...activeRoom.questionIds];
      updatedQuestionIds[responses.length] = newQuestionId;
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          questionIds: updatedQuestionIds,
          // Nouvelle question : les éventuels effets 50/50/indice/chrono/dégâts de l'ancienne
          // question ne doivent pas se reporter dessus.
          consumableReveal: Prisma.JsonNull,
          ...(activeRoom.type === "BOSS" ? { questionStartedAt: new Date() } : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          usedQuestionIds: [...run.usedQuestionIds, questionId],
          consumables: { ...consumables, REDRAW_QUESTION: consumables.REDRAW_QUESTION! - 1 },
        },
      });
      return this.getStateById(run.id);
    }

    const question = await prisma.question.findFirstOrThrow({ where: { id: questionId } });
    const questionData = question.data as unknown as QuestionDataDTO;
    const propositionIds = questionData.propositions.map((p) => p.id);
    const reveal = ((activeRoom.consumableReveal as ConsumableReveal | null) ??
      {}) as ConsumableReveal;

    if (type === "FIFTY_FIFTY") {
      if (reveal.eliminatedIds) {
        throw createError({
          statusCode: 409,
          statusMessage: "50/50 déjà utilisé sur cette question.",
        });
      }
      reveal.eliminatedIds = pickFiftyFiftyEliminations(propositionIds, questionData.response);
    } else if (type === "PHONE_A_FRIEND") {
      if (reveal.hintId !== undefined) {
        throw createError({
          statusCode: 409,
          statusMessage: "Indice déjà utilisé sur cette question.",
        });
      }
      reveal.hintId = pickPhoneAFriendHint(
        propositionIds,
        questionData.response,
        question.difficulty,
      );
    } else if (type === "BOSS_CHRONO_BOOST") {
      if (reveal.chronoBonusMs) {
        throw createError({ statusCode: 409, statusMessage: "Déjà utilisé sur cette question." });
      }
      reveal.chronoBonusMs = BRAINRUN_CHRONO_BOOST_MS;
    } else if (type === "BOSS_DAMAGE_BOOST") {
      if (reveal.damageBonus) {
        throw createError({ statusCode: 409, statusMessage: "Déjà utilisé sur cette question." });
      }
      reveal.damageBonus = BRAINRUN_DAMAGE_BOOST_AMOUNT;
    } else {
      // MALUS_CANCEL
      if (reveal.malusCancelled) {
        throw createError({ statusCode: 409, statusMessage: "Déjà utilisé sur cette question." });
      }
      reveal.malusCancelled = true;
    }

    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { consumableReveal: reveal },
    });
    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: { consumables: { ...consumables, [type]: consumables[type]! - 1 } },
    });
    return this.getStateById(run.id);
  }

  /** Jette un exemplaire d'un consommable possédé, pour libérer un emplacement (cf.
   * maxConsumableSlots) sans avoir à l'utiliser. */
  async discardConsumable(
    runId: string,
    type: BrainrunConsumableId,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    if (!consumables[type] || consumables[type]! <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Consommable indisponible." });
    }
    const updated: ConsumableCounts = { ...consumables, [type]: consumables[type]! - 1 };
    if (updated[type] === 0) delete updated[type];
    await prisma.brainrunRun.update({ where: { id: run.id }, data: { consumables: updated } });
    return this.getStateById(run.id);
  }

  /**
   * Tire une question de remplacement pour "Nouvelle Pioche" : même palier de difficulté et
   * mêmes thèmes que la salle en cours (ennemi/boss), en excluant les questions déjà tirées
   * dans la run. Si le pool filtré est épuisé, retombe sur n'importe quelle question du palier
   * plutôt que d'échouer (même stratégie que getNextBossQuestionId).
   */
  private async getReplacementQuestionId(
    run: { currentAct: number; usedQuestionIds: number[]; bannedThemes: string[] },
    activeRoom: {
      type: string | null;
      enemyId: string | null;
      bossId: string | null;
      questionIds: number[];
    },
    currentQuestionId: number,
    userId: string,
  ): Promise<number> {
    const combatType = activeRoom.type as CombatRoomType;
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE[combatType]!;
    const themes =
      combatType === "BOSS"
        ? getBrainrunBossById(activeRoom.bossId)?.themes
        : getBrainrunEnemyById(activeRoom.enemyId)?.themes;
    const excludeIds = [...run.usedQuestionIds, ...activeRoom.questionIds];
    const [id] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      excludeIds,
      userId,
      themes,
      undefined,
      run.bannedThemes,
    );
    if (id !== undefined) return id;

    const [fallbackId] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      [currentQuestionId],
      userId,
    );
    if (fallbackId === undefined) {
      throw createError({
        statusCode: 500,
        statusMessage: "Aucune question disponible pour le tirage.",
      });
    }
    return fallbackId;
  }

  /** Applique le gain d'une offre (bonus post-combat ou achat en Boutique) au run. */
  private async grantOffer(runId: string, offer: BrainrunOffer, userId: string): Promise<void> {
    if (offer.kind === "RELIC") {
      // Purge Thématique : ne rejoint `relics` qu'une fois le thème choisi (cf. resolveThemeBan) ;
      // le joueur doit d'abord résoudre ce choix avant de pouvoir continuer la run.
      if (offer.id === "THEME_PURGE") {
        await prisma.brainrunRun.update({
          where: { id: runId },
          data: { pendingThemeBanChoice: true },
        });
        return;
      }

      await prisma.brainrunRun.update({
        where: { id: runId },
        data: { relics: { push: offer.id } },
      });
      await recordRelicDiscovery(userId, offer.id);

      if (offer.id === "EXTRA_HEART") {
        const run = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
        const newMax = Math.min(run.maxHealthPoint + 1, BRAINRUN_ABSOLUTE_MAX_HP);
        await prisma.brainrunRun.update({
          where: { id: runId },
          data: {
            maxHealthPoint: newMax,
            healthPoint: Math.min(run.healthPoint + 1, newMax),
          },
        });
      } else if (offer.id === "EVENT_MAGNET") {
        const run = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
        await this.convertUpcomingNodesToEvents(runId, run.currentAct, run.currentRow);
      }
    } else if (offer.kind === "CONSUMABLE") {
      await this.grantConsumable(runId, offer.id as BrainrunConsumableId, 1);
    } else {
      await prisma.brainrunRun.update({
        where: { id: runId },
        data: { gold: { increment: offer.amount ?? 0 } },
      });
    }
  }

  /**
   * Relique Aimant à Événements : pour chaque nœud Combat (STANDARD/ELITE) pas encore atteint de
   * l'acte en cours (rangée courante incluse, tant qu'il n'a pas déjà été résolu), tire une chance
   * de le convertir en Événement. N'a jamais d'effet sur le Boss ni sur une salle déjà spéciale
   * (SHOP/REST/EVENT), ni sur un nœud déjà résolu (cf. maybeConvertNodeToEvent).
   */
  private async convertUpcomingNodesToEvents(
    runId: string,
    act: number,
    currentRow: number,
  ): Promise<void> {
    const candidates = await prisma.brainrunRoom.findMany({
      where: {
        runId,
        act,
        row: { gte: currentRow },
        status: "PENDING",
        type: { in: ["STANDARD", "ELITE"] },
      },
    });
    // Événements déjà placés sur la carte de l'acte : à exclure du tirage des nœuds nouvellement
    // convertis, pour préserver la garantie "aucun doublon d'Événement sur une run".
    const usedEventIds = (
      await prisma.brainrunRoom.findMany({
        where: { runId, act, eventId: { not: null } },
        select: { eventId: true },
      })
    ).map((r) => r.eventId!);
    for (const room of candidates) {
      const converted = maybeConvertNodeToEvent(
        room.type as BrainrunRoomType,
        BRAINRUN_EVENT_MAGNET_CHANCE,
        Math.random,
      );
      if (converted !== room.type) {
        const [assigned] = assignEventIdentities(
          [{ row: room.row, col: room.col }],
          getBrainrunEventIdsByAct(act),
          Math.random,
          usedEventIds,
        );
        const eventId = assigned!.eventId;
        usedEventIds.push(eventId);
        await prisma.brainrunRoom.update({
          where: { id: room.id },
          data: { type: converted, eventId },
        });
      }
    }
  }

  /** Filet de sécurité : tire un eventId pour un nœud EVENT dépourvu (ex. type forcé via
   * debugJumpToNode), en excluant les Événements déjà présents sur la carte de l'acte. */
  private async pickFallbackEventId(runId: string, act: number): Promise<string> {
    const usedEventIds = (
      await prisma.brainrunRoom.findMany({
        where: { runId, act, eventId: { not: null } },
        select: { eventId: true },
      })
    ).map((r) => r.eventId!);
    const [assigned] = assignEventIdentities(
      [{ row: 0, col: 0 }],
      getBrainrunEventIdsByAct(act),
      Math.random,
      usedEventIds,
    );
    return assigned!.eventId;
  }

  /**
   * Effets automatiques appliqués à une nouvelle question de combat au moment où elle est présentée :
   * - **Sixième Sens** (relique, `autoHintChance`) : chance de révéler la bonne réponse après un
   *   délai géré côté client (cf. BRAINRUN_SIXTH_SENSE_DELAY_MS) ;
   * - **50/50 automatique** (`fiftyFiftyChargesAvailable`, récompense d'Événement) : si au moins une
   *   charge est disponible, applique un 50/50 à la question et signale la consommation d'une charge
   *   (à décrémenter par l'appelant via `fiftyFiftyConsumed`).
   * Les deux peuvent se cumuler sur la même question. Retourne un reveal vide si la question n'existe
   * pas ou si aucun effet ne s'applique.
   */
  private async computeQuestionEntryReveal(
    questionId: number | undefined,
    effects: BrainrunRelicEffects,
    fiftyFiftyChargesAvailable: number,
  ): Promise<{ reveal: ConsumableReveal; fiftyFiftyConsumed: boolean }> {
    if (questionId === undefined) return { reveal: {}, fiftyFiftyConsumed: false };
    const wantsHint = effects.autoHintChance > 0 && Math.random() < effects.autoHintChance;
    const wantsFiftyFifty = fiftyFiftyChargesAvailable > 0;
    if (!wantsHint && !wantsFiftyFifty) return { reveal: {}, fiftyFiftyConsumed: false };
    const question = await questionService.getById(questionId);
    if (!question) return { reveal: {}, fiftyFiftyConsumed: false };
    const questionData = question.data as unknown as QuestionDataDTO;
    const reveal: ConsumableReveal = {};
    if (wantsHint) reveal.autoHintId = questionData.response;
    let fiftyFiftyConsumed = false;
    if (wantsFiftyFifty) {
      const propositionIds = questionData.propositions.map((p) => p.id);
      reveal.eliminatedIds = pickFiftyFiftyEliminations(propositionIds, questionData.response);
      fiftyFiftyConsumed = true;
    }
    return { reveal, fiftyFiftyConsumed };
  }

  /** Plafond d'emplacements de consommables (3 de base, +2 avec la relique Sac à Dos) : chaque
   * exemplaire obtenu prend son propre emplacement, les identiques ne se stackent pas en un
   * compteur illimité (cf. shared/brainrun.ts consumables). */
  private maxConsumableSlots(relics: string[]): number {
    return BRAINRUN_BASE_CONSUMABLE_SLOTS + getActiveRelicEffects(relics).bonusConsumableSlots;
  }

  private usedConsumableSlots(consumables: ConsumableCounts): number {
    return Object.values(consumables).reduce((sum, count) => sum + count, 0);
  }

  /** Lecture-puis-écriture (non atomique) sur le compteur JSON de consommables, comme le reste
   * de l'état Brainrun non protégé contre le double-clic (cf. limites assumées du lot). Plafonne
   * silencieusement à la capacité restante (cf. maxConsumableSlots) : l'excédent est perdu plutôt
   * que de faire échouer l'action déjà engagée (Événement, Cargaison Surprise). */
  private async grantConsumable(
    runId: string,
    type: BrainrunConsumableId,
    amount: number,
  ): Promise<void> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    const roomAvailable = Math.max(
      0,
      this.maxConsumableSlots(run.relics) - this.usedConsumableSlots(consumables),
    );
    const grantedAmount = Math.min(amount, roomAvailable);
    if (grantedAmount <= 0) return;
    consumables[type] = (consumables[type] ?? 0) + grantedAmount;
    await prisma.brainrunRun.update({
      where: { id: runId },
      data: { consumables: consumables },
    });
    await recordConsumableDiscovery(run.userId, type);
  }

  /**
   * Démarre le chrono de la prochaine question d'un combat de boss, une fois que le joueur
   * a terminé de lire le feedback de la question précédente (cf. commentaire dans submitAnswer :
   * le chrono ne doit pas courir pendant que le joueur lit ce feedback).
   */
  async prepareNextBossQuestion(runId: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.getActiveNode(run);

    if (activeRoom.type !== "BOSS" || activeRoom.status !== "ACTIVE") {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucun combat de boss en attente de question.",
      });
    }

    // Résurrection différée du Phoenix : 0 PV alors que la salle est toujours ACTIVE ne peut
    // arriver que pour ce malus (tout autre boss passe en CLEARED dès que ses PV tombent à 0,
    // cf. submitAnswer) — c'est le signal sans ambiguïté qu'une résurrection est due. Elle est
    // déclenchée ici (au clic sur "Continuer") plutôt que dans submitAnswer, pour que le joueur
    // ait d'abord vu le feedback "boss à 0 PV" avant l'animation de résurrection côté client.
    const bossDef = getBrainrunBossById(activeRoom.bossId);
    const pendingRevive =
      bossDef?.malus === "phoenix_revive" &&
      activeRoom.bossHealthPoint === 0 &&
      activeRoom.bossPhase < 2;

    if (activeRoom.questionStartedAt === null || pendingRevive) {
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          ...(activeRoom.questionStartedAt === null ? { questionStartedAt: new Date() } : {}),
          ...(pendingRevive
            ? {
                bossHealthPoint: Math.round(
                  BRAINRUN_BOSS_MAX_HP * (activeRoom.bossPhase === 0 ? 0.5 : 0.25),
                ),
                bossPhase: activeRoom.bossPhase + 1,
              }
            : {}),
        },
      });
      return this.getStateById(run.id);
    }

    // Malus "Alain" (memory_recall) : le bloc ci-dessus a déjà démarré, lors d'un appel
    // précédent, le décompte de mémorisation forcée de la 1re question (questionStartedAt
    // posé, encore aucune 2e question tirée). Une fois ce délai écoulé, on tire la 2e question
    // et on démarre alors seulement le vrai chrono contre-la-montre pour valider la 1re — jamais
    // avant, le serveur ne fait pas confiance à l'horloge du client pour ce délai non plus.
    const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
    if (isAlainMemoryIntro(bossDef?.malus, responses.length, activeRoom.questionIds.length)) {
      const elapsedMs = Date.now() - activeRoom.questionStartedAt.getTime();
      if (elapsedMs >= BRAINRUN_ALAIN_INTRO_MS) {
        // Exclut la 1re question (déjà tirée sur ce nœud) du tirage de la 2e, comme submitAnswer
        // le fait pour toute question déjà en jeu sur ce combat avant d'en tirer une nouvelle.
        const usedQuestionIdsForDraw = [...run.usedQuestionIds, ...activeRoom.questionIds];
        const nextQuestionId = await this.getNextBossQuestionId(
          run,
          bossDef?.themes ?? [],
          usedQuestionIdsForDraw,
          userId,
        );
        await prisma.brainrunRoom.update({
          where: { id: activeRoom.id },
          data: {
            questionIds: [...activeRoom.questionIds, nextQuestionId],
            questionStartedAt: new Date(),
          },
        });
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { usedQuestionIds: usedQuestionIdsForDraw },
        });
      }
      // Rappel prématuré (elapsedMs < BRAINRUN_ALAIN_INTRO_MS, ex. horloge client en avance) :
      // rien à faire, l'état est déjà correct, le client retentera à l'échéance réelle.
    }

    return this.getStateById(run.id);
  }

  async getMetaProgressDTO(userId: string): Promise<BrainrunMetaProgressDTO> {
    const progress = await getMetaProgress(userId);
    const runStats = await this.getRunStats(userId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
      discoveredRelics: progress.discoveredRelics as BrainrunRelicId[],
      discoveredConsumables: progress.discoveredConsumables as BrainrunConsumableId[],
      ...runStats,
    };
  }

  async unlockTalent(userId: string, talentId: BrainrunTalentId): Promise<BrainrunMetaProgressDTO> {
    const progress = await unlockTalentPersist(userId, talentId);
    await checkAndAwardAchievements(
      userId,
      "brainrunTalentsUnlocked",
      progress.unlockedTalents.length,
    );
    // « Esprit accompli » : tous les talents du catalogue courant débloqués (s'adapte si on en
    // ajoute).
    const allTalents = Object.keys(BRAINRUN_TALENTS).every((id) =>
      progress.unlockedTalents.includes(id),
    );
    await checkAndAwardAchievements(userId, "brainrunAllTalentsUnlocked", allTalents ? 1 : 0);
    const runStats = await this.getRunStats(userId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
      discoveredRelics: progress.discoveredRelics as BrainrunRelicId[],
      discoveredConsumables: progress.discoveredConsumables as BrainrunConsumableId[],
      ...runStats,
    };
  }

  /** Nombre de runs terminées et acte/salle de la plus avancée, toutes runs (WON/LOST/ABANDONED)
   * confondues — la run en cours (IN_PROGRESS) n'est comptée qu'une fois résolue. Exclut les runs
   * touchées par le debug (isDebugRun), qui ne doivent pas gonfler ces statistiques. */
  private async getRunStats(
    userId: string,
  ): Promise<Pick<BrainrunMetaProgressDTO, "totalRuns" | "bestRun">> {
    const [totalRuns, bestRun] = await Promise.all([
      prisma.brainrunRun.count({
        where: { userId, status: { in: ["WON", "LOST", "ABANDONED"] }, isDebugRun: false },
      }),
      prisma.brainrunRun.findFirst({
        where: { userId, status: { in: ["WON", "LOST", "ABANDONED"] }, isDebugRun: false },
        orderBy: [{ currentAct: "desc" }, { currentRow: "desc" }],
        select: { currentAct: true, currentRow: true },
      }),
    ]);
    return {
      totalRuns,
      bestRun: bestRun ? { act: bestRun.currentAct, row: bestRun.currentRow } : null,
    };
  }

  private async getStateById(runId: string): Promise<BrainrunStateDTO> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });
    return this.buildState(run);
  }

  private async seedActGraph(
    runId: string,
    act: number,
    eventBonusChance: number = 0,
  ): Promise<void> {
    // L'étage 1 de chaque acte est d'office forcé combat (3x Standard), l'acte 1 a en plus une
    // rangée Neutre en tête — cf. generateActGraph. Aimant à Événements (déjà possédée) : s'applique
    // aussi aux actes suivants générés ici.
    const nodes = generateActGraph(act, Math.random, eventBonusChance);
    // L'ennemi/boss de chaque nœud de combat est fixé ici, une fois pour toutes, plutôt qu'au
    // moment d'y entrer (cf. resolveNodeChoice) : nécessaire pour que la relique Prévoyance montre
    // le vrai ennemi qu'on affrontera, et garantit qu'aucun ennemi n'apparaît deux fois sur la
    // carte tant que le pool du tier n'est pas épuisé (cf. references/map.md).
    const combatIdentities = assignCombatIdentities(
      nodes,
      getBrainrunEnemiesByActAndTier(act, "CLASSIC"),
      getBrainrunEnemiesByActAndTier(act, "ELITE"),
      getBrainrunBossesByAct(act),
    );
    const identityByKey = new Map(combatIdentities.map((i) => [`${i.row}:${i.col}`, i]));
    // L'événement de chaque nœud EVENT est lui aussi fixé ici, tiré sans remise dans le pool de
    // l'acte (aucun doublon d'Événement possible sur une run, cf. assignEventIdentities).
    const eventIdentities = assignEventIdentities(
      nodes.filter((node) => node.type === "EVENT"),
      getBrainrunEventIdsByAct(act),
      Math.random,
    );
    const eventIdByKey = new Map(eventIdentities.map((e) => [`${e.row}:${e.col}`, e.eventId]));
    await prisma.brainrunRoom.createMany({
      data: nodes.map((node) => {
        const identity = identityByKey.get(`${node.row}:${node.col}`)!;
        return {
          runId,
          act,
          row: node.row,
          col: node.col,
          nextCols: node.nextCols,
          type: node.type,
          enemyId: identity.enemyId,
          bossId: identity.bossId,
          eventId: eventIdByKey.get(`${node.row}:${node.col}`) ?? null,
        };
      }),
    });
    if (act === 1) {
      // Le nœud Neutre (rangée 1 de l'acte 1) est cosmétique : la run démarre directement dessus,
      // déjà nettoyé, sans que le joueur ait besoin de cliquer dessus pour révéler l'étage 1
      // (cf. references/map.md).
      await prisma.brainrunRoom.updateMany({
        where: { runId, act: 1, row: 1, type: "NEUTRAL" },
        data: { status: "CLEARED" },
      });
      await prisma.brainrunRun.update({ where: { id: runId }, data: { currentRow: 2 } });
    }
  }

  private async advanceAfterRoomClear(runId: string, act: number, row: number): Promise<void> {
    const outcome = nextRowAfterClear(act, row);

    if (outcome.kind === "RUN_WON") {
      await this.finalizeRun(runId, "WON");
      return;
    }

    let coinsGranted = 0;
    let actStartShieldCharges: number | undefined;
    if (outcome.act !== act) {
      // act = l'acte dont le Boss vient d'être nettoyé : palier de pièces correspondant
      // (server/utils/brainrunConfig.ts BRAINRUN_COINS_PER_ACT), plafonné par jour. Une run
      // touchée par le debug (cf. debugSetStats/debugJumpToNode) n'en rapporte aucune.
      const currentRun = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
      coinsGranted = currentRun.isDebugRun
        ? 0
        : await grantBrainrunActCoins(currentRun.userId, BRAINRUN_COINS_PER_ACT[act - 1]!);

      const nextActSeeded = await prisma.brainrunRoom.findFirst({
        where: { runId, act: outcome.act },
      });
      if (!nextActSeeded) {
        const effects = getActiveRelicEffects(currentRun.relics);
        await this.seedActGraph(runId, outcome.act, effects.eventBonusChance);
      }

      // Talent Bouclier d'Acte : octroie 1 charge de Bouclier au début de chaque nouvel Acte
      // (l'Acte 1 est couvert dès createRun). Le boss venant d'être vaincu, healthPoint est déjà
      // remonté au maximum (cf. submitAnswer) au moment où ce code s'exécute.
      const talentEffects = getActiveTalentEffects(
        (await getMetaProgress(currentRun.userId)).unlockedTalents,
      );
      if (talentEffects.hasShieldOnActStart) {
        actStartShieldCharges = grantShieldCharge(currentRun.shieldCharges, currentRun.healthPoint);
      }
    }

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: {
        currentAct: outcome.act,
        currentRow: outcome.row,
        currentCol: null,
        ...(coinsGranted > 0 ? { coinsEarned: { increment: coinsGranted } } : {}),
        ...(actStartShieldCharges !== undefined ? { shieldCharges: actStartShieldCharges } : {}),
      },
    });
  }

  private async finalizeRun(runId: string, status: "WON" | "LOST"): Promise<void> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });

    const clearedRooms = run.rooms
      .filter((r) => r.status === "CLEARED")
      .map((r) => ({ type: r.type as BrainrunRoomType }));
    // Une run touchée par le debug (cf. debugSetStats/debugJumpToNode) ne rapporte rien de
    // persistant — ni XP, ni pièces, ni Points de Savoir, et ne compte pas dans les achievements
    // (filtré via isDebugRun sur les comptages totalGames/totalWins ci-dessous) : c'est un outil
    // de test, pas une vraie partie.
    const xpEarned = run.isDebugRun ? 0 : calculBrainrunUserXP(clearedRooms, status === "WON");
    const { total: knowledgePointsEarned, bonus: knowledgePointsBonus } = run.isDebugRun
      ? { total: 0, bonus: 0 }
      : await this.knowledgePointsForRun(run.userId, run.gold);
    // Palier du 3e acte (Boss final vaincu) : les actes 1/2 sont déjà crédités au moment de
    // leur transition, cf. advanceAfterRoomClear. Rien pour LOST/ABANDONED (acte en cours non
    // complété).
    const coinsGranted =
      !run.isDebugRun && status === "WON"
        ? await grantBrainrunActCoins(run.userId, BRAINRUN_COINS_PER_ACT[2]!)
        : 0;

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: {
        status,
        endDate: new Date(),
        xpEarned,
        knowledgePointsEarned,
        knowledgePointsBonus,
        ...(coinsGranted > 0 ? { coinsEarned: { increment: coinsGranted } } : {}),
      },
    });
    if (!run.isDebugRun) {
      const activityMultiplier = await dailyRewardService.getActivityStreakMultiplier(run.userId);
      const multipliedXpEarned = Math.ceil(xpEarned * activityMultiplier);
      await updateUserProgress(run.userId, multipliedXpEarned);
      await grantKnowledgePoints(run.userId, knowledgePointsEarned);
    }

    // Une run de debug ne débloque aucun haut fait (mêmes règles que XP/pièces/PS ci-dessus).
    if (!run.isDebugRun) {
      await this.awardBrainrunProgressAchievements(run.userId);
      await this.awardBrainrunRunRecordAchievements(run.userId, run.rooms);

      if (status === "WON") {
        const totalWins = await prisma.brainrunRun.count({
          where: { userId: run.userId, status: "WON", isDebugRun: false },
        });
        await checkAndAwardAchievements(run.userId, "brainrunWins", totalWins);

        const combatResponses = this.collectCombatResponses(run.rooms);
        // « Sans une égratignure » : run gagnée sans jamais perdre de PV (Bouclier inclus, qui
        // ramène hpLoss à 0 — cf. consumeShieldCharge).
        if (!combatResponses.some((r) => r.hpLoss > 0)) {
          await checkAndAwardAchievements(run.userId, "brainrunFlawlessWin", 1);
        }
        // « Sur le fil du rasoir » : victoire en terminant à 1 PV.
        if (run.healthPoint === 1) {
          await checkAndAwardAchievements(run.userId, "brainrunLowHpWin", 1);
        }
        // « Marche forcée » : victoire sans avoir nettoyé la moindre Bibliothèque (REST).
        if (!run.rooms.some((r) => r.type === "REST" && r.status === "CLEARED")) {
          await checkAndAwardAchievements(run.userId, "brainrunNoRestWin", 1);
        }
        // « Revenant » : victoire après avoir déclenché au moins un filet de résurrection
        // (consommable Dernier Souffle, relique Seconde Chance ou talent Second Souffle —
        // tous trois marquent la réponse d'un extraLifeUsed).
        if (combatResponses.some((r) => r.extraLifeUsed)) {
          await checkAndAwardAchievements(run.userId, "brainrunReviveWin", 1);
        }
      }
    }
  }

  /** Aplati les réponses des salles de combat d'une run, dans l'ordre de progression
   * (acte → rangée → colonne), pour dériver les records d'une partie. */
  private collectCombatResponses(
    rooms: { act: number; row: number; col: number; type: string; responses: unknown }[],
  ): BrainrunRoomResponse[] {
    return rooms
      .filter((r) => BRAINRUN_COMBAT_ROOM_TYPES.includes(r.type as BrainrunRoomType))
      .sort((a, b) => a.act - b.act || a.row - b.row || a.col - b.col)
      .flatMap((r) => (r.responses as BrainrunRoomResponse[] | null) ?? []);
  }

  /** Hauts faits « record dans une seule run » (bonnes réponses, plus longue série, or amassé) —
   * comptent quel que soit le résultat de la run (victoire comme défaite). */
  private async awardBrainrunRunRecordAchievements(
    userId: string,
    rooms: {
      act: number;
      row: number;
      col: number;
      type: string;
      goldEarned: number;
      responses: unknown;
    }[],
  ): Promise<void> {
    const combatResponses = this.collectCombatResponses(rooms);

    const correct = combatResponses.filter((r) => r.success).length;
    await checkAndAwardAchievements(userId, "brainrunRunCorrect", correct);

    let streak = 0;
    let bestStreak = 0;
    for (const response of combatResponses) {
      streak = response.success ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
    }
    await checkAndAwardAchievements(userId, "brainrunRunStreak", bestStreak);

    const gold = rooms.reduce((sum, r) => sum + r.goldEarned, 0);
    await checkAndAwardAchievements(userId, "brainrunRunGold", gold);
  }

  /**
   * Hauts faits dérivés de l'ensemble des runs terminées et du métagame : assiduité, étage max
   * atteint, PV max, élites/boss vaincus, découvertes complètes de catalogue. Déclenchés aussi
   * bien en fin de run qu'à l'abandon ; l'appelant garantit que la run n'est pas une run de debug.
   * Les « toutes/tous » comparent au catalogue courant, donc s'adaptent automatiquement si on
   * ajoute une relique/consommable/talent.
   */
  private async awardBrainrunProgressAchievements(userId: string): Promise<void> {
    const finishedRunFilter = {
      userId,
      status: { in: ["WON", "LOST", "ABANDONED"] },
      isDebugRun: false,
    };

    const finishedRuns = await prisma.brainrunRun.findMany({
      where: finishedRunFilter,
      select: { currentAct: true, currentRow: true, maxHealthPoint: true },
    });
    await checkAndAwardAchievements(userId, "brainrunGames", finishedRuns.length);

    const maxFloor = finishedRuns.reduce(
      (max, r) => Math.max(max, brainrunGlobalFloor(r.currentAct, r.currentRow)),
      0,
    );
    await checkAndAwardAchievements(userId, "brainrunMaxFloor", maxFloor);

    const maxHp = finishedRuns.reduce((max, r) => Math.max(max, r.maxHealthPoint), 0);
    await checkAndAwardAchievements(userId, "brainrunMaxHp", maxHp);

    const [elitesDefeated, bossesDefeated] = await Promise.all([
      prisma.brainrunRoom.count({
        where: { type: "ELITE", status: "CLEARED", run: finishedRunFilter },
      }),
      prisma.brainrunRoom.count({
        where: { type: "BOSS", status: "CLEARED", run: finishedRunFilter },
      }),
    ]);
    await checkAndAwardAchievements(userId, "brainrunElitesDefeated", elitesDefeated);
    await checkAndAwardAchievements(userId, "brainrunBossesDefeated", bossesDefeated);

    const meta = await getMetaProgress(userId);
    const allRelics = Object.keys(BRAINRUN_RELICS).every((id) =>
      meta.discoveredRelics.includes(id),
    );
    await checkAndAwardAchievements(userId, "brainrunAllRelicsDiscovered", allRelics ? 1 : 0);
    const allConsumables = Object.keys(BRAINRUN_CONSUMABLES).every((id) =>
      meta.discoveredConsumables.includes(id),
    );
    await checkAndAwardAchievements(
      userId,
      "brainrunAllConsumablesDiscovered",
      allConsumables ? 1 : 0,
    );
  }

  /**
   * Tire la prochaine question d'un combat de boss en cours, en excluant les questions déjà
   * posées dans la run. Si le palier de difficulté n'a plus de question inédite disponible
   * (run très longue), on retombe sur n'importe quelle question de ce palier plutôt que
   * d'échouer — le combat de boss ne doit jamais se retrouver bloqué faute de question.
   */
  private async getNextBossQuestionId(
    run: {
      currentAct: number;
      themeCoefficients: unknown;
      bannedThemes: string[];
      excludedQuestionIds: number[];
    },
    bossThemes: string[],
    excludeIds: number[],
    userId: string,
  ): Promise<number> {
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE.BOSS;
    // Comme la 1re question du combat (chooseNode), les questions suivantes du boss sont tirées en
    // pondérant les thèmes par les coefficients du joueur + le bonus du boss (acte × ×3).
    const themeWeights = buildCombatThemeWeights(
      (run.themeCoefficients as Record<string, number>) ?? {},
      effectiveThemes(bossThemes, run.bannedThemes),
      enemyThemeBonus(run.currentAct, "BOSS"),
      run.bannedThemes,
    );
    const [id] = await questionService.getRandomIdsByThemeWeights(
      themeWeights,
      minDifficulty,
      maxDifficulty,
      1,
      excludeIds,
      userId,
      { culture_generale: BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[run.currentAct]! },
      run.bannedThemes,
      run.excludedQuestionIds,
    );
    if (id !== undefined) return id;

    // Filet ultime : n'importe quelle question du palier, questions déjà vues comprises (run très
    // longue) — le combat de boss ne doit jamais se bloquer faute de question inédite.
    const [fallbackId] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      [],
      userId,
    );
    if (fallbackId === undefined) {
      throw createError({ statusCode: 500, statusMessage: "Aucune question de boss disponible." });
    }
    return fallbackId;
  }

  private async getOwnedInProgressRun(runId: string, userId: string) {
    const run = await prisma.brainrunRun.findFirst({
      where: { id: runId, userId },
      include: { rooms: true },
    });
    if (!run) {
      throw createError({ statusCode: 404, statusMessage: "Run introuvable." });
    }
    if (run.status !== "IN_PROGRESS") {
      throw createError({ statusCode: 409, statusMessage: "Cette run est déjà terminée." });
    }
    return run;
  }

  /** Nœud actif (en cours de résolution), quand run.currentCol est défini. */
  private getActiveNode<T extends { act: number; row: number; col: number }>(run: {
    currentAct: number;
    currentRow: number;
    currentCol: number | null;
    rooms: T[];
  }): T {
    if (run.currentCol === null) {
      throw createError({ statusCode: 500, statusMessage: "Aucun nœud actif : choix en attente." });
    }
    const room = run.rooms.find(
      (r) => r.act === run.currentAct && r.row === run.currentRow && r.col === run.currentCol,
    );
    if (!room) {
      throw createError({ statusCode: 500, statusMessage: "Salle active introuvable." });
    }
    return room;
  }

  /** Nœuds accessibles sur run.currentRow depuis la dernière salle nettoyée (ou tous les nœuds
   * de la rangée 1 en début d'acte) ; pertinent uniquement quand run.currentCol est null. */
  private getCandidateNodes<
    T extends { act: number; row: number; col: number; status: string; nextCols: number[] },
  >(run: { currentAct: number; currentRow: number; rooms: T[] }): T[] {
    const actRooms = run.rooms.filter((r) => r.act === run.currentAct);
    const cols = getCandidateCols(actRooms, run.currentRow);
    return actRooms.filter((r) => r.row === run.currentRow && cols.includes(r.col));
  }

  private async buildState(
    run: BrainrunRunRow & { rooms: BrainrunRoomRow[] },
  ): Promise<BrainrunStateDTO> {
    const awaitingChoice = run.currentCol === null;
    const actRooms = run.rooms.filter((r) => r.act === run.currentAct);

    let currentQuestion = null;
    let previewQuestion: BrainrunQuestionPreviewDTO | null = null;
    let activeRoom: BrainrunRoomRow | null = null;
    if (!awaitingChoice) {
      activeRoom = this.getActiveNode(run);
      if (activeRoom.status === "ACTIVE") {
        const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
        const bossDef =
          activeRoom.type === "BOSS" ? getBrainrunBossById(activeRoom.bossId) : undefined;
        const alainIntro = isAlainMemoryIntro(
          bossDef?.malus,
          responses.length,
          activeRoom.questionIds.length,
        );
        // Malus "Alain" (memory_recall) : tant qu'on est dans la lecture forcée de la 1re
        // question (alainIntro), rien à valider — currentQuestion reste null, seul son énoncé
        // est exposé via previewQuestion, ci-dessous. Passé ce cap, currentQuestion redevient la
        // question à valider comme pour tout autre boss (celle de l'étape précédente pour Alain).
        const validateQuestionId = alainIntro
          ? undefined
          : activeRoom.questionIds[responses.length];
        if (validateQuestionId !== undefined) {
          const question = await questionService.getById(validateQuestionId);
          if (question) {
            const questionData = question.data as unknown as QuestionDataDTO;
            questionData.propositions = questionService.shuffleArray(questionData.propositions);
            currentQuestion = sanitizeQuestionForClient({ ...question, data: questionData });
          }
        }

        if (bossDef?.malus === "memory_recall") {
          const previewIndex = alainIntro ? responses.length : responses.length + 1;
          const previewQuestionId = activeRoom.questionIds[previewIndex];
          if (previewQuestionId !== undefined) {
            const preview = await questionService.getById(previewQuestionId);
            if (preview) {
              const previewData = preview.data as unknown as QuestionDataDTO;
              previewQuestion = {
                id: preview.id,
                libelle: previewData.libelle,
                img: previewData.img,
                themes: preview.themes,
              };
            }
          }
        }
      }
    }

    const effects = getActiveRelicEffects(run.relics);
    const candidateCols = awaitingChoice ? getCandidateCols(actRooms, run.currentRow) : null;
    // Plus de brouillard de guerre : toutes les salles de l'acte affichent toujours leur type.
    // Prévoyance (hasForesight) expose en plus les thèmes de l'ennemi/boss de chaque nœud de
    // combat, pour la modale de prévisualisation côté client (cf. references/map.md).
    const mapNodes: BrainrunMapNodeDTO[] = actRooms.map((r) => {
      const isCombatNode = r.type === "STANDARD" || r.type === "ELITE" || r.type === "BOSS";
      const combatDef =
        effects.hasForesight && isCombatNode
          ? r.type === "BOSS"
            ? getBrainrunBossById(r.bossId)
            : getBrainrunEnemyById(r.enemyId)
          : undefined;
      return {
        row: r.row,
        col: r.col,
        nextCols: r.nextCols,
        status: r.status as BrainrunRoomStatus,
        type: r.type as BrainrunRoomType,
        themes: combatDef ? effectiveThemes(combatDef.themes, run.bannedThemes) : null,
      };
    });

    return {
      run: this.toRunDTO(run),
      currentRoom: activeRoom ? this.toRoomDTO(activeRoom, effects) : null,
      currentQuestion,
      previewQuestion,
      awaitingChoice,
      mapNodes,
      candidateCols,
    };
  }

  private toRunDTO(run: BrainrunRunRow): BrainrunRunDTO {
    return {
      id: run.id,
      userId: run.userId,
      status: run.status as BrainrunRunDTO["status"],
      currentAct: run.currentAct,
      currentRow: run.currentRow,
      currentCol: run.currentCol,
      healthPoint: run.healthPoint,
      maxHealthPoint: run.maxHealthPoint,
      gold: run.gold,
      xpEarned: run.xpEarned,
      knowledgePointsEarned: run.knowledgePointsEarned,
      knowledgePointsBonus: run.knowledgePointsBonus,
      coinsEarned: run.coinsEarned,
      createDate: run.createDate,
      endDate: run.endDate,
      relics: run.relics as BrainrunRunDTO["relics"],
      consumables: (run.consumables as ConsumableCounts) ?? {},
      maxConsumables: this.maxConsumableSlots(run.relics),
      shieldCharges: run.shieldCharges,
      fiftyFiftyCharges: run.fiftyFiftyCharges,
      themeCoefficients: (run.themeCoefficients as Record<string, number>) ?? {},
      bannedThemes: run.bannedThemes,
      pendingThemeBanChoice: run.pendingThemeBanChoice,
      // Utilisé à la fois par le choix de thème de la relique Purge Thématique
      // (pendingThemeBanChoice) et par la Bibliothèque (resolveRest) : toujours calculé, léger
      // (dérivé des catalogues statiques + bannedThemes) et sans effet de bord à exposer au repos.
      availableThemesToBan: this.computeAvailableThemesToBan(run.bannedThemes),
      isDebugRun: run.isDebugRun,
    };
  }

  /**
   * Thèmes non bannis encore présents dans les pools d'ennemis/boss (les 3 actes confondus),
   * triés par ordre alphabétique. `culture_generale` n'est jamais bannissable (inclus
   * systématiquement dans les boss, cf. shared/brainrunBosses.ts), tout comme les thèmes de
   * computeUnsafeToBanThemes.
   */
  private computeAvailableThemesToBan(bannedThemes: string[]): string[] {
    const allThemes = [
      ...BRAINRUN_ENEMIES.flatMap((e) => e.themes),
      ...BRAINRUN_BOSSES.flatMap((b) => b.themes),
    ];
    const unsafeThemes = this.computeUnsafeToBanThemes();
    return [...new Set(allThemes)]
      .filter(
        (theme) =>
          theme !== "culture_generale" && !bannedThemes.includes(theme) && !unsafeThemes.has(theme),
      )
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * Thèmes qu'il ne faut jamais laisser bannir : un thème partagé par tous les boss d'un même
   * acte (ex. "anime-manga", commun aux 2 boss de l'Acte 2) viderait entièrement le pool de boss
   * de cet acte si banni, ce qui ferait retomber chooseNode sur le pool complet non filtré
   * (cf. bossCandidates) — annulant silencieusement le ban pour ce combat précis.
   */
  private computeUnsafeToBanThemes(): Set<string> {
    const acts = [...new Set(BRAINRUN_BOSSES.map((b) => b.act))];
    const unsafe = new Set<string>();
    for (const act of acts) {
      const [first, ...rest] = getBrainrunBossesByAct(act);
      if (!first) continue;
      first.themes
        .filter((theme) => rest.every((b) => b.themes.includes(theme)))
        .forEach((theme) => unsafe.add(theme));
    }
    return unsafe;
  }

  private toRoomDTO(room: BrainrunRoomRow, effects: BrainrunRelicEffects): BrainrunRoomDTO {
    const reveal = (room.consumableReveal as ConsumableReveal | null) ?? {};
    const responses = (room.responses as unknown as BrainrunRoomResponse[]) ?? [];
    const bossDef = room.type === "BOSS" ? getBrainrunBossById(room.bossId) : undefined;
    const alainIntro = isAlainMemoryIntro(
      bossDef?.malus,
      responses.length,
      room.questionIds.length,
    );
    const questionDeadline =
      room.type === "BOSS" && room.status === "ACTIVE" && room.questionStartedAt
        ? new Date(
            room.questionStartedAt.getTime() +
              (alainIntro
                ? BRAINRUN_ALAIN_INTRO_MS
                : bossQuestionTimeMsWithRelics(effects) +
                  (reveal.chronoBonusMs ?? 0) +
                  flashMalusBonusTimeMs(bossDef?.malus, responses.length, reveal.malusCancelled)),
          )
        : null;

    return {
      id: room.id,
      runId: room.runId,
      act: room.act,
      row: room.row,
      col: room.col,
      nextCols: room.nextCols,
      type: room.type as BrainrunRoomType,
      status: room.status as BrainrunRoomDTO["status"],
      enemyId: room.enemyId,
      bossId: room.bossId,
      questionIds: room.questionIds,
      responses,
      goldEarned: room.goldEarned,
      bossHealthPoint: room.bossHealthPoint,
      bossMaxHealthPoint: room.bossMaxHealthPoint,
      bossPhase: room.bossPhase,
      questionDeadline,
      questionStartedAt:
        room.type === "BOSS" && room.status === "ACTIVE" ? room.questionStartedAt : null,
      offers: (room.offers as unknown as BrainrunOffer[] | null) ?? null,
      offersRequireChoice: room.offersRequireChoice,
      offersResolved: room.offersResolved,
      themeCardOffer: (room.themeCardOffer as unknown as BrainrunThemeCardDTO[] | null) ?? null,
      themeCardResolved: room.themeCardResolved,
      eventId: room.eventId,
      eventOutcome: (room.eventOutcome as unknown as BrainrunEventOutcomeDTO | null) ?? null,
      consumableReveal:
        (room.consumableReveal as unknown as BrainrunRoomDTO["consumableReveal"]) ?? null,
    };
  }
}

type BrainrunRunRow = Awaited<ReturnType<typeof prisma.brainrunRun.findUniqueOrThrow>>;
type BrainrunRoomRow = Awaited<ReturnType<typeof prisma.brainrunRoom.findFirstOrThrow>>;

export const brainrunService = new BrainrunService();
