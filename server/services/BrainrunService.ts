import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import {
  isCorrectAnswer,
  questionService,
  sanitizeQuestionForClient,
} from "~~/server/services/QuestionService";
import { updateUserProgress } from "~~/server/utils/userProgressHelper";
import { checkAndAwardAchievements } from "~~/server/utils/achievementHelper";
import { coinsFromXp, grantCoins } from "~~/server/utils/walletHelper";
import {
  applyRelicsToBossDamage,
  applyRelicsToGold,
  applyRelicsToHpLoss,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  brainrunHpLossForDifficulty,
  calculBrainrunUserXP,
  consumeShieldIfArmed,
  generateActChoicePoints,
  generateBonusOffers,
  generateShopOffers,
  generateShopReplacementOffer,
  getActiveRelicEffects,
  getActiveTalentEffects,
  goldToKnowledgePoints,
  instantRoomHealthDelta,
  isBossAnswerTimedOut,
  maybeAddEventOption,
  nextRoomAfterClear,
  pickFiftyFiftyEliminations,
  pickPhoneAFriendHint,
  pickRandomStashConsumables,
  resolveEventOption,
  type BrainrunRelicEffects,
} from "~~/server/utils/brainrunLogic";
import {
  getMetaProgress,
  grantKnowledgePoints,
  recordConsumableDiscovery,
  recordRelicDiscovery,
  unlockTalent as unlockTalentPersist,
} from "~~/server/utils/brainrunMetaHelper";
import {
  BRAINRUN_ABSOLUTE_MAX_HP,
  BRAINRUN_BOSS_MAX_HP,
  BRAINRUN_DIFFICULTY_BY_ACT,
  BRAINRUN_EVENT_MAGNET_CHANCE,
  BRAINRUN_GOLD_BY_ROOM_TYPE,
  BRAINRUN_MAX_HP,
  BRAINRUN_QUESTIONS_PER_ROOM,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_START_HP,
} from "~~/server/utils/brainrunConfig";
import { QuestionDataDTO } from "#shared/question";
import {
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
import type {
  BrainrunMetaProgressDTO,
  BrainrunRoomDTO,
  BrainrunRoomResponse,
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
    const created = await prisma.brainrunRun.create({
      data: {
        userId,
        healthPoint: BRAINRUN_START_HP + talentEffects.bonusStartHp,
        maxHealthPoint: BRAINRUN_MAX_HP + talentEffects.bonusStartHp,
        gold: talentEffects.bonusStartGold,
      },
    });
    await this.seedAct(created.id, 1);
    return this.getStateById(created.id);
  }

  async abandonRun(userId: string): Promise<void> {
    const run = await prisma.brainrunRun.findFirst({ where: { userId, status: "IN_PROGRESS" } });
    if (!run) return;
    const knowledgePointsEarned = goldToKnowledgePoints(run.gold);
    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: { status: "ABANDONED", endDate: new Date(), knowledgePointsEarned },
    });
    await grantKnowledgePoints(userId, knowledgePointsEarned);
    const totalGames = await prisma.brainrunRun.count({
      where: { userId, status: { in: ["WON", "LOST", "ABANDONED"] } },
    });
    await checkAndAwardAchievements(userId, "brainrunGames", totalGames);
  }

  async chooseOption(
    runId: string,
    choice: BrainrunRoomType,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.findActiveRoom(run);

    if (activeRoom.type !== null) {
      throw createError({ statusCode: 409, statusMessage: "Cette salle n'attend pas de choix." });
    }
    if (!activeRoom.choiceTypes.includes(choice)) {
      throw createError({ statusCode: 400, statusMessage: "Choix non proposé pour cette salle." });
    }
    const effects = getActiveRelicEffects(run.relics);

    if (choice === "REST") {
      // Salle "cleared" mais l'avancée reste différée jusqu'à acknowledgeRoom(), pour laisser
      // le temps au joueur de voir le récap (+1 PV) avant de passer à la suite.
      const newHealthPoint = Math.min(
        run.maxHealthPoint,
        run.healthPoint + instantRoomHealthDelta("REST"),
      );
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { type: choice, status: "CLEARED", goldEarned: 0 },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { healthPoint: newHealthPoint },
      });
    } else if (choice === "SHOP") {
      // Reste ACTIVE tant que le joueur n'a pas cliqué "Quitter la boutique" (cf. leaveShop) :
      // il peut acheter plusieurs offres avant de continuer sa route.
      const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          type: choice,
          status: "ACTIVE",
          offers: generateShopOffers(
            run.relics,
            Math.random,
            talentEffects.rareRelicWeightBonus,
            effects.shopPriceMultiplier,
          ),
        },
      });
    } else if (choice === "EVENT") {
      // Reste ACTIVE tant que le joueur n'a pas choisi une des 2 options (cf. resolveEvent).
      const eventIds = Object.keys(BRAINRUN_EVENTS);
      const eventId = eventIds[Math.floor(Math.random() * eventIds.length)]!;
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { type: choice, status: "ACTIVE", eventId },
      });
    } else {
      const combatType = choice as CombatRoomType;
      const [minDifficulty, maxDifficulty] =
        BRAINRUN_DIFFICULTY_BY_ACT[run.currentAct]![combatType]!;
      // Le combat de boss n'a pas de nombre de questions fixe : on n'en tire qu'une seule ici,
      // les suivantes sont générées à la volée dans submitAnswer tant que le boss n'est pas à 0 PV.
      const count = combatType === "BOSS" ? 1 : BRAINRUN_QUESTIONS_PER_ROOM[combatType];

      // Standard/Elite tirent un ennemi du pool de l'acte, en excluant ceux déjà rencontrés dans
      // cet acte (réinitialisé au changement d'acte). Boss tire un boss nommé parmi les 2 candidats
      // de l'acte (une seule salle de boss par acte, pas besoin d'exclusion). Si le pool filtré est
      // vide (run très long), retombe sur le pool complet plutôt que de bloquer la partie.
      // Purge Thématique : exclut les ennemis/boss dont un thème est banni ; retombe sur le pool
      // non filtré si l'exclusion viderait entièrement le pool (run très long / peu de contenu
      // restant), même filet de sécurité que le filtre usedEnemyIds juste après.
      const notBanned = (themes: string[]) =>
        run.bannedThemes.length === 0 || themes.every((t) => !run.bannedThemes.includes(t));

      let enemyId: string | null = null;
      let bossId: string | null = null;
      let combatThemes: string[] | undefined;
      if (combatType === "BOSS") {
        const bossPool = getBrainrunBossesByAct(run.currentAct);
        const unbannedBossPool = bossPool.filter((b) => notBanned(b.themes));
        const bossCandidates = unbannedBossPool.length > 0 ? unbannedBossPool : bossPool;
        const boss = bossCandidates[Math.floor(Math.random() * bossCandidates.length)]!;
        bossId = boss.id;
        combatThemes = boss.themes;
      } else {
        const tier = combatType === "STANDARD" ? "CLASSIC" : "ELITE";
        const pool = getBrainrunEnemiesByActAndTier(run.currentAct, tier);
        const unbannedPool = pool.filter((e) => notBanned(e.themes));
        const available = unbannedPool.filter((e) => !run.usedEnemyIds.includes(e.id));
        const candidates =
          available.length > 0 ? available : unbannedPool.length > 0 ? unbannedPool : pool;
        const enemy = candidates[Math.floor(Math.random() * candidates.length)]!;
        enemyId = enemy.id;
        combatThemes = enemy.themes;
      }

      const questionIds = await questionService.getRandomIdsByDifficulty(
        minDifficulty,
        maxDifficulty,
        count,
        run.usedQuestionIds,
        userId,
        combatThemes,
      );
      const autoHintReveal = await this.computeAutoHintReveal(questionIds[0], effects);

      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          type: choice,
          status: "ACTIVE",
          questionIds,
          responses: [],
          consumableReveal: autoHintReveal,
          ...(enemyId ? { enemyId } : {}),
          ...(combatType === "BOSS"
            ? {
                bossId,
                bossHealthPoint: BRAINRUN_BOSS_MAX_HP,
                bossMaxHealthPoint: BRAINRUN_BOSS_MAX_HP,
                bossPhase: 0,
                questionStartedAt: new Date(),
              }
            : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          usedQuestionIds: [...run.usedQuestionIds, ...questionIds],
          ...(enemyId ? { usedEnemyIds: [...run.usedEnemyIds, enemyId] } : {}),
        },
      });
    }

    return this.getStateById(run.id);
  }

  async submitAnswer(
    runId: string,
    questionId: number,
    userResponseId: number,
    userId: string,
  ): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.findActiveRoom(run);

    if (activeRoom.type === null || activeRoom.status !== "ACTIVE") {
      throw createError({
        statusCode: 409,
        statusMessage: "Aucune question en attente pour cette salle.",
      });
    }

    const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
    const expectedQuestionId = activeRoom.questionIds[responses.length];
    if (expectedQuestionId !== questionId) {
      throw createError({ statusCode: 400, statusMessage: "Cette question n'est pas attendue." });
    }

    const question = await prisma.question.findFirstOrThrow({ where: { id: questionId } });
    const isBossRoom = activeRoom.type === "BOSS";
    const effects = getActiveRelicEffects(run.relics);
    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
    const reveal = ((activeRoom.consumableReveal as ConsumableReveal | null) ??
      {}) as ConsumableReveal;
    const elapsedMs = activeRoom.questionStartedAt
      ? Date.now() - activeRoom.questionStartedAt.getTime()
      : 0;
    // Bonus de temps total : relique Chronomètre Brisé (permanent) + Sablier Fêlé (consommable,
    // une seule question).
    const bonusTimeMs = effects.bossTimeBonusMs + (reveal.chronoBonusMs ?? 0);
    // Contre-la-montre : passé le délai imparti, la réponse est forcée en échec, quelle que
    // soit la proposition envoyée par le client.
    const timedOut = isBossRoom && isBossAnswerTimedOut(elapsedMs, bonusTimeMs);
    const success = !timedOut && isCorrectAnswer(question, userResponseId);
    const rawHpLoss = success ? 0 : brainrunHpLossForDifficulty(question.difficulty);
    const relicAdjustedHpLoss = applyRelicsToHpLoss(rawHpLoss, effects);
    const { hpLoss, shieldConsumed } = consumeShieldIfArmed(run.shieldArmed, relicAdjustedHpLoss);
    const bossDamage = isBossRoom
      ? (() => {
          // Bonus de talent ("Frappe assurée") + relique (Adrénaline) + Coup de Grâce (consommable,
          // une seule question), jamais appliqués sur un coup raté (comme applyRelicsToBossDamage).
          const relicDamage = applyRelicsToBossDamage(
            brainrunBossDamage(elapsedMs, success, bonusTimeMs),
            effects,
          );
          const withTalent =
            relicDamage > 0 ? relicDamage + talentEffects.bonusBossDamagePerHit : 0;
          return withTalent > 0 ? withTalent + (reveal.damageBonus ?? 0) : 0;
        })()
      : 0;
    const questionData = question.data as any;
    const bossDef = isBossRoom ? getBrainrunBossById(activeRoom.bossId) : undefined;
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
    // Seconde Chance : consommée une fois, annule la mort et remonte à 1 PV.
    const extraLifeUsed = died && effects.hasExtraLife;
    if (extraLifeUsed) {
      newHealthPoint = 1;
      died = false;
      newResponses[newResponses.length - 1]!.extraLifeUsed = true;
    }
    // Dernier Souffle (consommable) : même effet que Seconde Chance, en secours si la relique
    // n'a pas (ou plus) sauvé le joueur.
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    const reviveTokenUsed = died && !extraLifeUsed && (consumables.REVIVE_TOKEN ?? 0) > 0;
    if (reviveTokenUsed) {
      newHealthPoint = 1;
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

    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        healthPoint: Math.max(newHealthPoint, 0),
        ...(shieldConsumed ? { shieldArmed: false } : {}),
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
      const goldEarned = applyRelicsToGold(
        BRAINRUN_GOLD_BY_ROOM_TYPE[activeRoom.type as CombatRoomType],
        effects,
      );
      // Bonus post-combat (relique/consommable au choix) uniquement après Elite/Boss —
      // les salles Standard ne rapportent que de l'or, pour garder Elite/Boss comme temps forts.
      const grantsBonus = activeRoom.type === "ELITE" || activeRoom.type === "BOSS";
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
      // une nouvelle à la volée (pas de limite de questions pour un combat de boss).
      let updatedQuestionIds = activeRoom.questionIds;
      let updatedUsedQuestionIds: number[] | undefined;
      if (isBossRoom && newResponses.length === activeRoom.questionIds.length) {
        updatedUsedQuestionIds = [...run.usedQuestionIds, ...activeRoom.questionIds];
        const nextQuestionId = await this.getNextBossQuestionId(
          run.currentAct,
          updatedUsedQuestionIds,
          userId,
          bossDef?.themes,
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
    const activeRoom = this.findActiveRoom(run);

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

    await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentSequence);
    return this.getStateById(run.id);
  }

  /**
   * Résout le bonus post-combat (Elite/Boss) : `pick` est l'id d'une relique/consommable
   * proposé dans `offers`, ou "SKIP" pour ne rien prendre. N'avance PAS la salle — c'est
   * acknowledgeRoom() qui le fait ensuite, une fois le bonus résolu.
   */
  async resolveBonus(runId: string, pick: string, userId: string): Promise<BrainrunStateDTO> {
    const run = await this.getOwnedInProgressRun(runId, userId);
    const activeRoom = this.findActiveRoom(run);

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
    const activeRoom = this.findActiveRoom(run);

    if (activeRoom.type !== "SHOP" || activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune boutique active." });
    }
    const offers = (activeRoom.offers as unknown as BrainrunOffer[]) ?? [];
    const offer = offers[offerIndex];
    if (!offer) {
      throw createError({ statusCode: 400, statusMessage: "Offre invalide." });
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
    const activeRoom = this.findActiveRoom(run);

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
    await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentSequence);
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
    const activeRoom = this.findActiveRoom(run);

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

    const talentEffects = getActiveTalentEffects((await getMetaProgress(userId)).unlockedTalents);
    const resolved = resolveEventOption(option, {
      ownedRelics: run.relics,
      rareWeightBonus: talentEffects.rareRelicWeightBonus,
    });
    const hpCost = Math.max(0, -resolved.hpDelta);
    const hpReward = Math.max(0, resolved.hpDelta);
    const { hpLoss, shieldConsumed } = consumeShieldIfArmed(run.shieldArmed, hpCost);
    let newHealthPoint = Math.min(run.maxHealthPoint, run.healthPoint - hpLoss + hpReward);
    let died = newHealthPoint <= 0;
    // Dernier Souffle (consommable) : même filet de sécurité qu'en combat (cf. submitAnswer),
    // pour un coût en PV fatal d'Événement.
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    const reviveTokenUsed = died && (consumables.REVIVE_TOKEN ?? 0) > 0;
    if (reviveTokenUsed) {
      newHealthPoint = 1;
      died = false;
    }

    let updatedRelics = run.relics;
    if (resolved.relicLost) {
      updatedRelics = updatedRelics.filter((r) => r !== resolved.relicLost);
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
        ...(shieldConsumed ? { shieldArmed: false } : {}),
        ...(resolved.relicLost || (resolved.relicGranted && !grantsThemePurge)
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
      await this.applyEventBonusToRemainingRooms(run.id, run.currentAct, run.currentSequence);
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
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { status: "CLEARED", goldEarned: Math.max(0, resolved.goldDelta) },
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
    const activeRoom = this.findActiveRoom(run);
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
      if (run.shieldArmed) {
        throw createError({ statusCode: 409, statusMessage: "Bouclier déjà armé." });
      }
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: {
          shieldArmed: true,
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
      for (const grantedId of pickRandomStashConsumables()) {
        updated[grantedId] = (updated[grantedId] ?? 0) + 1;
      }
      await prisma.brainrunRun.update({ where: { id: run.id }, data: { consumables: updated } });
      return this.getStateById(run.id);
    }

    if (activeRoom.type === null || activeRoom.status !== "ACTIVE") {
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

  /**
   * Tire une question de remplacement pour "Nouvelle Pioche" : même palier de difficulté et
   * mêmes thèmes que la salle en cours (ennemi/boss), en excluant les questions déjà tirées
   * dans la run. Si le pool filtré est épuisé, retombe sur n'importe quelle question du palier
   * plutôt que d'échouer (même stratégie que getNextBossQuestionId).
   */
  private async getReplacementQuestionId(
    run: { currentAct: number; usedQuestionIds: number[] },
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
        await this.applyEventBonusToRemainingRooms(runId, run.currentAct, run.currentSequence);
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
   * Relique Aimant à Événements : pour chaque salle non résolue de l'acte en cours qui vient
   * après la salle active (pas encore rencontrée), tire une chance d'ajouter un Événement en
   * 3e option. N'a jamais d'effet sur la salle Boss finale (choiceTypes fixe ["BOSS"]) ni sur
   * un point qui propose déjà un Événement (cf. maybeAddEventOption).
   */
  private async applyEventBonusToRemainingRooms(
    runId: string,
    act: number,
    currentSequence: number,
  ): Promise<void> {
    const remainingRooms = await prisma.brainrunRoom.findMany({
      where: { runId, act, sequence: { gt: currentSequence }, type: null },
    });
    for (const room of remainingRooms) {
      const updatedChoiceTypes = maybeAddEventOption(
        room.choiceTypes as BrainrunRoomType[],
        BRAINRUN_EVENT_MAGNET_CHANCE,
        Math.random,
      );
      if (updatedChoiceTypes.length !== room.choiceTypes.length) {
        await prisma.brainrunRoom.update({
          where: { id: room.id },
          data: { choiceTypes: updatedChoiceTypes },
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

  /** Lecture-puis-écriture (non atomique) sur le compteur JSON de consommables, comme le reste
   * de l'état Brainrun non protégé contre le double-clic (cf. limites assumées du lot). */
  private async grantConsumable(
    runId: string,
    type: BrainrunConsumableId,
    amount: number,
  ): Promise<void> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
    const consumables = (run.consumables as ConsumableCounts) ?? {};
    consumables[type] = (consumables[type] ?? 0) + amount;
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
    const activeRoom = this.findActiveRoom(run);

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
    }

    return this.getStateById(run.id);
  }

  async getMetaProgressDTO(userId: string): Promise<BrainrunMetaProgressDTO> {
    const progress = await getMetaProgress(userId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
      discoveredRelics: progress.discoveredRelics as BrainrunRelicId[],
      discoveredConsumables: progress.discoveredConsumables as BrainrunConsumableId[],
    };
  }

  async unlockTalent(userId: string, talentId: BrainrunTalentId): Promise<BrainrunMetaProgressDTO> {
    const progress = await unlockTalentPersist(userId, talentId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
      discoveredRelics: progress.discoveredRelics as BrainrunRelicId[],
      discoveredConsumables: progress.discoveredConsumables as BrainrunConsumableId[],
    };
  }

  private async getStateById(runId: string): Promise<BrainrunStateDTO> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });
    return this.buildState(run);
  }

  private async seedAct(runId: string, act: number, eventBonusChance: number = 0): Promise<void> {
    // La toute première salle de l'acte 1 doit d'office être un combat (pas de Boutique/
    // Repos/Événement dès le début de la run) ; les autres actes restent entièrement aléatoires.
    // Aimant à Événements (déjà possédée) : s'applique aussi aux actes suivants générés ici.
    const choicePoints = generateActChoicePoints(Math.random, act === 1, eventBonusChance);
    await prisma.brainrunRoom.createMany({
      data: choicePoints.map((point) => ({
        runId,
        act,
        sequence: point.sequence,
        choiceTypes: point.choiceTypes,
      })),
    });
    await prisma.brainrunRoom.create({
      data: {
        runId,
        act,
        sequence: BRAINRUN_ROOMS_PER_ACT,
        choiceTypes: ["BOSS"],
      },
    });
  }

  private async advanceAfterRoomClear(runId: string, act: number, sequence: number): Promise<void> {
    const outcome = nextRoomAfterClear(act, sequence);

    if (outcome.kind === "RUN_WON") {
      await this.finalizeRun(runId, "WON");
      return;
    }

    if (outcome.act !== act) {
      const nextActSeeded = await prisma.brainrunRoom.findFirst({
        where: { runId, act: outcome.act },
      });
      if (!nextActSeeded) {
        const currentRun = await prisma.brainrunRun.findUniqueOrThrow({ where: { id: runId } });
        const effects = getActiveRelicEffects(currentRun.relics);
        await this.seedAct(runId, outcome.act, effects.eventBonusChance);
      }
    }

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: {
        currentAct: outcome.act,
        currentSequence: outcome.sequence,
        // Le pool d'ennemis rencontrés ne s'applique qu'à l'acte en cours (chaque acte a son
        // propre roster) : on le réinitialise dès qu'on change d'acte.
        ...(outcome.act !== act ? { usedEnemyIds: [] } : {}),
      },
    });
  }

  private async finalizeRun(runId: string, status: "WON" | "LOST"): Promise<void> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });

    const clearedRooms = run.rooms
      .filter((r) => r.status === "CLEARED" && r.type !== null)
      .map((r) => ({ type: r.type as BrainrunRoomType }));
    const xpEarned = calculBrainrunUserXP(clearedRooms, status === "WON");
    const knowledgePointsEarned = goldToKnowledgePoints(run.gold);

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: { status, endDate: new Date(), xpEarned, knowledgePointsEarned },
    });
    await updateUserProgress(run.userId, xpEarned);
    await grantKnowledgePoints(run.userId, knowledgePointsEarned);
    await grantCoins(run.userId, coinsFromXp(xpEarned));

    const totalGames = await prisma.brainrunRun.count({
      where: { userId: run.userId, status: { in: ["WON", "LOST", "ABANDONED"] } },
    });
    await checkAndAwardAchievements(run.userId, "brainrunGames", totalGames);

    if (status === "WON") {
      const totalWins = await prisma.brainrunRun.count({
        where: { userId: run.userId, status: "WON" },
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
  ): Promise<number> {
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_ACT[act]!.BOSS;
    const [id] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      excludeIds,
      userId,
      themes,
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

  private findActiveRoom<T extends { act: number; sequence: number }>(run: {
    currentAct: number;
    currentSequence: number;
    rooms: T[];
  }): T {
    const room = run.rooms.find(
      (r) => r.act === run.currentAct && r.sequence === run.currentSequence,
    );
    if (!room) {
      throw createError({ statusCode: 500, statusMessage: "Salle active introuvable." });
    }
    return room;
  }

  private async buildState(
    run: BrainrunRunRow & { rooms: BrainrunRoomRow[] },
  ): Promise<BrainrunStateDTO> {
    const activeRoom = this.findActiveRoom(run);
    const awaitingChoice = activeRoom.type === null;

    let currentQuestion = null;
    if (!awaitingChoice && activeRoom.status === "ACTIVE") {
      const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
      const nextQuestionId = activeRoom.questionIds[responses.length];
      if (nextQuestionId !== undefined) {
        const question = await questionService.getById(nextQuestionId);
        if (question) {
          const questionData = question.data as unknown as QuestionDataDTO;
          questionData.propositions = questionService.shuffleArray(questionData.propositions);
          currentQuestion = sanitizeQuestionForClient({ ...question, data: questionData });
        }
      }
    }

    const effects = getActiveRelicEffects(run.relics);
    let nextChoiceTypes: BrainrunRoomType[] | null = null;
    if (awaitingChoice && effects.showsNextRoomPreview) {
      const nextRoom = run.rooms.find(
        (r) => r.act === activeRoom.act && r.sequence === activeRoom.sequence + 1,
      );
      nextChoiceTypes = (nextRoom?.choiceTypes as BrainrunRoomType[] | undefined) ?? null;
    }

    return {
      run: this.toRunDTO(run),
      currentRoom: this.toRoomDTO(activeRoom, effects, nextChoiceTypes),
      currentQuestion,
      awaitingChoice,
    };
  }

  private toRunDTO(run: BrainrunRunRow): BrainrunRunDTO {
    return {
      id: run.id,
      userId: run.userId,
      status: run.status as BrainrunRunDTO["status"],
      currentAct: run.currentAct,
      currentSequence: run.currentSequence,
      healthPoint: run.healthPoint,
      maxHealthPoint: run.maxHealthPoint,
      gold: run.gold,
      xpEarned: run.xpEarned,
      knowledgePointsEarned: run.knowledgePointsEarned,
      createDate: run.createDate,
      endDate: run.endDate,
      relics: run.relics as BrainrunRunDTO["relics"],
      consumables: (run.consumables as ConsumableCounts) ?? {},
      shieldArmed: run.shieldArmed,
      bannedThemes: run.bannedThemes,
      pendingThemeBanChoice: run.pendingThemeBanChoice,
      availableThemesToBan: run.pendingThemeBanChoice
        ? this.computeAvailableThemesToBan(run.bannedThemes)
        : [],
    };
  }

  /** Thèmes non bannis encore présents dans les pools d'ennemis/boss (les 3 actes confondus). */
  private computeAvailableThemesToBan(bannedThemes: string[]): string[] {
    const allThemes = [
      ...BRAINRUN_ENEMIES.flatMap((e) => e.themes),
      ...BRAINRUN_BOSSES.flatMap((b) => b.themes),
    ];
    return [...new Set(allThemes)].filter((theme) => !bannedThemes.includes(theme));
  }

  private toRoomDTO(
    room: BrainrunRoomRow,
    effects: BrainrunRelicEffects,
    nextChoiceTypes: BrainrunRoomType[] | null = null,
  ): BrainrunRoomDTO {
    const reveal = (room.consumableReveal as ConsumableReveal | null) ?? {};
    const questionDeadline =
      room.type === "BOSS" && room.status === "ACTIVE" && room.questionStartedAt
        ? new Date(
            room.questionStartedAt.getTime() +
              bossQuestionTimeMsWithRelics(effects) +
              (reveal.chronoBonusMs ?? 0),
          )
        : null;

    return {
      id: room.id,
      runId: room.runId,
      act: room.act,
      sequence: room.sequence,
      type: room.type as BrainrunRoomType | null,
      status: room.status as BrainrunRoomDTO["status"],
      enemyId: room.enemyId,
      bossId: room.bossId,
      choiceTypes: room.choiceTypes as BrainrunRoomType[],
      nextChoiceTypes,
      questionIds: room.questionIds,
      responses: (room.responses as unknown as BrainrunRoomResponse[]) ?? [],
      goldEarned: room.goldEarned,
      bossHealthPoint: room.bossHealthPoint,
      bossMaxHealthPoint: room.bossMaxHealthPoint,
      bossPhase: room.bossPhase,
      questionDeadline,
      offers: (room.offers as unknown as BrainrunOffer[] | null) ?? null,
      offersRequireChoice: room.offersRequireChoice,
      offersResolved: room.offersResolved,
      eventId: room.eventId,
      consumableReveal:
        (room.consumableReveal as unknown as BrainrunRoomDTO["consumableReveal"]) ?? null,
    };
  }
}

type BrainrunRunRow = Awaited<ReturnType<typeof prisma.brainrunRun.findUniqueOrThrow>>;
type BrainrunRoomRow = Awaited<ReturnType<typeof prisma.brainrunRoom.findFirstOrThrow>>;

export const brainrunService = new BrainrunService();
