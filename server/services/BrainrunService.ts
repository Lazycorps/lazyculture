import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import {
  isCorrectAnswer,
  questionService,
  sanitizeQuestionForClient,
} from "~~/server/services/QuestionService";
import { updateUserProgress } from "~~/server/utils/userProgressHelper";
import { checkAndAwardAchievements } from "~~/server/utils/achievementHelper";
import {
  applyBossMalusToDamage,
  applyRelicsToBossDamage,
  applyRelicsToGold,
  applyTalentsToGold,
  assignCombatIdentities,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  calculBrainrunUserXP,
  consumeShieldCharge,
  effectiveThemes,
  flashMalusBonusTimeMs,
  generateActGraph,
  generateBonusOffers,
  generateShopOffers,
  generateShopReplacementOffer,
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
  BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT,
  BRAINRUN_DIFFICULTY_BY_ACT,
  BRAINRUN_EVENT_MAGNET_CHANCE,
  BRAINRUN_GOLD_BY_ROOM_TYPE,
  BRAINRUN_MAX_HP,
  BRAINRUN_QUESTIONS_PER_ROOM,
  BRAINRUN_START_HP,
  BRAINRUN_TOTAL_ACTS,
  getBrainrunActRowWidths,
} from "~~/server/utils/brainrunConfig";
import { assertDebugAccess } from "~~/server/utils/auth";
import { QuestionDataDTO } from "#shared/question";
import {
  BRAINRUN_BONUS_OFFER_COUNT,
  BRAINRUN_CHRONO_BOOST_MS,
  BRAINRUN_DAMAGE_BOOST_AMOUNT,
  BRAINRUN_EVENTS,
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
import type { BrainrunTalentId } from "#shared/brainrunTalents";
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
    const created = await prisma.brainrunRun.create({
      data: {
        userId,
        healthPoint: startHealthPoint,
        maxHealthPoint: startMaxHealthPoint,
        gold: talentEffects.bonusStartGold,
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
    }
    const totalGames = await prisma.brainrunRun.count({
      where: { userId, status: { in: ["WON", "LOST", "ABANDONED"] }, isDebugRun: false },
    });
    await checkAndAwardAchievements(userId, "brainrunGames", totalGames);
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
      // Reste ACTIVE tant que le joueur n'a pas choisi une des 2 options (cf. resolveEvent).
      const eventIds = Object.keys(BRAINRUN_EVENTS);
      const eventId = eventIds[Math.floor(Math.random() * eventIds.length)]!;
      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: { status: "ACTIVE", eventId },
      });
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { currentCol: col } });
    } else {
      const combatType = choice as CombatRoomType;
      const [minDifficulty, maxDifficulty] =
        BRAINRUN_DIFFICULTY_BY_ACT[run.currentAct]![combatType]!;
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

      const questionIds = await questionService.getRandomIdsByDifficulty(
        minDifficulty,
        maxDifficulty,
        count,
        run.usedQuestionIds,
        userId,
        combatThemes,
        { culture_generale: BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[run.currentAct]! },
        run.bannedThemes,
      );
      const autoHintReveal = await this.computeAutoHintReveal(questionIds[0], effects);
      // Talent Faille d'Entrée : le boss démarre le combat avec un pourcentage de PV en moins.
      const bossStartHp =
        combatType === "BOSS" && talentEffects.bossHpReductionPct > 0
          ? Math.round(BRAINRUN_BOSS_MAX_HP * (1 - talentEffects.bossHpReductionPct / 100))
          : BRAINRUN_BOSS_MAX_HP;

      await prisma.brainrunRoom.update({
        where: { id: node.id },
        data: {
          status: "ACTIVE",
          questionIds,
          responses: [],
          consumableReveal: autoHintReveal,
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
    patch: { healthPoint?: number; maxHealthPoint?: number; gold?: number },
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

    await prisma.brainrunRun.update({
      where: { id: runId },
      // isDebugRun : marque la run une fois pour toutes (jamais réinitialisé) — bloque XP/pièces/
      // Points de Savoir et l'incrémentation des achievements en fin de run, cf. finalizeRun/
      // advanceAfterRoomClear/abandonRun.
      data: { healthPoint, maxHealthPoint, gold, isDebugRun: true },
    });
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
    const actRowWidths = getBrainrunActRowWidths(target.act);
    const lastRow = actRowWidths.length;
    if (target.row < 1 || target.row > lastRow) {
      throw createError({ statusCode: 400, statusMessage: "Rangée invalide." });
    }
    const width = actRowWidths[target.row - 1]!;
    if (target.col < 0 || target.col >= width) {
      throw createError({ statusCode: 400, statusMessage: "Colonne invalide pour cette rangée." });
    }
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

    let actRooms = run.rooms.filter((r) => r.act === target.act);
    if (actRooms.length === 0) {
      const effects = getActiveRelicEffects(run.relics);
      await this.seedActGraph(runId, target.act, effects.eventBonusChance);
      actRooms = await prisma.brainrunRoom.findMany({ where: { runId, act: target.act } });
    }
    let node = actRooms.find((r) => r.row === target.row && r.col === target.col);
    if (!node) {
      throw createError({
        statusCode: 500,
        statusMessage: "Nœud introuvable après génération de l'acte.",
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

    const question = await prisma.question.findFirstOrThrow({ where: { id: questionId } });
    const effects = getActiveRelicEffects(run.relics);
    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
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
      const grantsBonus = activeRoom.type === "ELITE" || activeRoom.type === "BOSS";
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
          run.currentAct,
          updatedUsedQuestionIds,
          userId,
          bossDef?.themes,
          run.bannedThemes,
        );
        updatedQuestionIds = [...activeRoom.questionIds, nextQuestionId];
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { usedQuestionIds: updatedUsedQuestionIds },
        });
      }

      // Réinitialisé pour la prochaine question : l'effet 50/50 / Appel à un ami ne s'applique
      // qu'à la question sur laquelle il a été utilisé ; Sixième Sens est re-tiré pour la
      // nouvelle question (cf. computeAutoHintReveal).
      const nextConsumableReveal = await this.computeAutoHintReveal(
        updatedQuestionIds[newResponses.length],
        effects,
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
    let newHealthPoint = Math.min(run.maxHealthPoint, run.healthPoint - hpLoss + hpReward);
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
    let newMaxHealthPoint: number | undefined;
    if (resolved.relicGranted && !grantsThemePurge) {
      updatedRelics = [...updatedRelics, resolved.relicGranted];
      if (resolved.relicGranted === "EXTRA_HEART") {
        newMaxHealthPoint = Math.min(run.maxHealthPoint + 1, BRAINRUN_ABSOLUTE_MAX_HP);
        newHealthPoint = Math.min(newHealthPoint + 1, newMaxHealthPoint);
      }
    }

    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        healthPoint: Math.max(newHealthPoint, 0),
        gold: Math.max(0, run.gold + resolved.goldDelta),
        shieldCharges: shieldChargesRemaining,
        ...(talentReviveUsed ? { talentReviveUsed: true } : {}),
        ...(resolved.relicLost || (resolved.relicGranted && !grantsThemePurge) || extraLifeUsed
          ? { relics: updatedRelics }
          : {}),
        ...(grantsThemePurge ? { pendingThemeBanChoice: true } : {}),
        ...(newMaxHealthPoint !== undefined ? { maxHealthPoint: newMaxHealthPoint } : {}),
        ...(reviveTokenUsed
          ? { consumables: { ...consumables, REVIVE_TOKEN: consumables.REVIVE_TOKEN! - 1 } }
          : {}),
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
      // Résultat réellement appliqué (post-Bouclier/tirages aléatoires), affiché tel quel côté
      // client à la place du récap générique une fois la salle CLEARED (cf. BrainrunEvent.vue).
      const outcome: BrainrunEventOutcomeDTO = {
        optionIndex,
        hpDelta: hpReward - hpLoss,
        goldDelta: resolved.goldDelta,
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
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_ACT[run.currentAct]![combatType]!;
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
    for (const room of candidates) {
      const converted = maybeConvertNodeToEvent(
        room.type as BrainrunRoomType,
        BRAINRUN_EVENT_MAGNET_CHANCE,
        Math.random,
      );
      if (converted !== room.type) {
        await prisma.brainrunRoom.update({
          where: { id: room.id },
          data: { type: converted },
        });
      }
    }
  }

  /**
   * Relique Sixième Sens : tire, pour la question donnée, une chance de révéler la bonne réponse
   * (après un délai géré côté client, cf. BRAINRUN_SIXTH_SENSE_DELAY_MS). Retourne un reveal vide
   * si la relique n'est pas possédée, si le tirage échoue, ou si la question n'existe pas.
   */
  private async computeAutoHintReveal(
    questionId: number | undefined,
    effects: BrainrunRelicEffects,
  ): Promise<ConsumableReveal> {
    if (questionId === undefined || effects.autoHintChance <= 0) return {};
    if (Math.random() >= effects.autoHintChance) return {};
    const question = await questionService.getById(questionId);
    if (!question) return {};
    const questionData = question.data as unknown as QuestionDataDTO;
    return { autoHintId: questionData.response };
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
          run.currentAct,
          usedQuestionIdsForDraw,
          userId,
          bossDef?.themes,
          run.bannedThemes,
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
      await updateUserProgress(run.userId, xpEarned);
      await grantKnowledgePoints(run.userId, knowledgePointsEarned);
    }

    const totalGames = await prisma.brainrunRun.count({
      where: {
        userId: run.userId,
        status: { in: ["WON", "LOST", "ABANDONED"] },
        isDebugRun: false,
      },
    });
    await checkAndAwardAchievements(run.userId, "brainrunGames", totalGames);

    if (status === "WON") {
      const totalWins = await prisma.brainrunRun.count({
        where: { userId: run.userId, status: "WON", isDebugRun: false },
      });
      await checkAndAwardAchievements(run.userId, "brainrunWins", totalWins);
    }
  }

  /**
   * Tire la prochaine question d'un combat de boss en cours, en excluant les questions déjà
   * posées dans la run. Si le palier de difficulté n'a plus de question inédite disponible
   * (run très longue), on retombe sur n'importe quelle question de ce palier plutôt que
   * d'échouer — le combat de boss ne doit jamais se retrouver bloqué faute de question.
   */
  private async getNextBossQuestionId(
    act: number,
    excludeIds: number[],
    userId: string,
    themes?: string[],
    bannedThemes?: string[],
  ): Promise<number> {
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_ACT[act]!.BOSS;
    const [id] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      excludeIds,
      userId,
      themes,
      undefined,
      bannedThemes,
    );
    if (id !== undefined) return id;

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
      offers: (room.offers as unknown as BrainrunOffer[] | null) ?? null,
      offersRequireChoice: room.offersRequireChoice,
      offersResolved: room.offersResolved,
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
