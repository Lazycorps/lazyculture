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
  getActiveRelicEffects,
  getActiveTalentEffects,
  goldToKnowledgePoints,
  instantRoomHealthDelta,
  isBossAnswerTimedOut,
  nextRoomAfterClear,
  pickFiftyFiftyEliminations,
  pickPhoneAFriendHint,
  resolveEventOption,
  type BrainrunRelicEffects,
} from "~~/server/utils/brainrunLogic";
import {
  getMetaProgress,
  grantKnowledgePoints,
  unlockTalent as unlockTalentPersist,
} from "~~/server/utils/brainrunMetaHelper";
import {
  BRAINRUN_BOSS_MAX_HP,
  BRAINRUN_DIFFICULTY_BY_ACT,
  BRAINRUN_GOLD_BY_ROOM_TYPE,
  BRAINRUN_MAX_HP,
  BRAINRUN_QUESTIONS_PER_ROOM,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_START_HP,
} from "~~/server/utils/brainrunConfig";
import { QuestionDataDTO } from "#shared/question";
import {
  BRAINRUN_EVENTS,
  type BrainrunConsumableId,
  type BrainrunOffer,
} from "#shared/brainrunItems";
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
type ConsumableReveal = { eliminatedIds?: number[]; hintId?: number };

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
          offers: generateShopOffers(run.relics, Math.random, talentEffects.rareRelicWeightBonus),
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
      const questionIds = await questionService.getRandomIdsByDifficulty(
        minDifficulty,
        maxDifficulty,
        count,
        run.usedQuestionIds,
        userId,
      );

      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          type: choice,
          status: "ACTIVE",
          questionIds,
          responses: [],
          ...(combatType === "BOSS"
            ? {
                bossHealthPoint: BRAINRUN_BOSS_MAX_HP,
                bossMaxHealthPoint: BRAINRUN_BOSS_MAX_HP,
                questionStartedAt: new Date(),
              }
            : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { usedQuestionIds: [...run.usedQuestionIds, ...questionIds] },
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
    const elapsedMs = activeRoom.questionStartedAt
      ? Date.now() - activeRoom.questionStartedAt.getTime()
      : 0;
    // Contre-la-montre : passé le délai imparti (+ bonus éventuel de la relique Chronomètre
    // Brisé), la réponse est forcée en échec, quelle que soit la proposition envoyée par le client.
    const timedOut = isBossRoom && isBossAnswerTimedOut(elapsedMs, effects.bossTimeBonusMs);
    const success = !timedOut && isCorrectAnswer(question, userResponseId);
    const rawHpLoss = success ? 0 : brainrunHpLossForDifficulty(question.difficulty);
    const relicAdjustedHpLoss = applyRelicsToHpLoss(rawHpLoss, effects);
    const { hpLoss, shieldConsumed } = consumeShieldIfArmed(run.shieldArmed, relicAdjustedHpLoss);
    const bossDamage = isBossRoom
      ? (() => {
          // Bonus de talent ("Frappe assurée") additionné au bonus de relique (Adrénaline),
          // jamais appliqué sur un coup raté (comme applyRelicsToBossDamage).
          const relicDamage = applyRelicsToBossDamage(
            brainrunBossDamage(elapsedMs, success, effects.bossTimeBonusMs),
            effects,
          );
          return relicDamage > 0 ? relicDamage + talentEffects.bonusBossDamagePerHit : 0;
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
    // Seconde Chance : consommée une fois, annule la mort et remonte à 1 PV.
    const extraLifeUsed = died && effects.hasExtraLife;
    if (extraLifeUsed) {
      newHealthPoint = 1;
      died = false;
      newResponses[newResponses.length - 1]!.extraLifeUsed = true;
    }
    const newBossHealthPoint = isBossRoom
      ? Math.max((activeRoom.bossHealthPoint ?? BRAINRUN_BOSS_MAX_HP) - bossDamage, 0)
      : null;
    const bossDefeated = isBossRoom && newBossHealthPoint === 0;
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
        );
        updatedQuestionIds = [...activeRoom.questionIds, nextQuestionId];
        await prisma.brainrunRun.update({
          where: { id: run.id },
          data: { usedQuestionIds: updatedUsedQuestionIds },
        });
      }

      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          responses: newResponses,
          questionIds: updatedQuestionIds,
          // Réinitialisé pour la prochaine question : l'effet 50/50 / Appel à un ami ne
          // s'applique qu'à la question sur laquelle il a été utilisé.
          consumableReveal: Prisma.JsonNull,
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
      await this.grantOffer(run.id, offer);
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

    await this.grantOffer(run.id, offer);
    const remainingOffers = offers.filter((_, i) => i !== offerIndex);
    await prisma.brainrunRoom.update({
      where: { id: activeRoom.id },
      data: { offers: remainingOffers },
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
    const newHealthPoint = Math.min(run.maxHealthPoint, run.healthPoint - hpLoss + hpReward);
    const died = newHealthPoint <= 0;

    let updatedRelics = run.relics;
    if (resolved.relicLost) {
      updatedRelics = updatedRelics.filter((r) => r !== resolved.relicLost);
    }
    if (resolved.relicGranted) {
      updatedRelics = [...updatedRelics, resolved.relicGranted];
    }

    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: {
        healthPoint: Math.max(newHealthPoint, 0),
        gold: Math.max(0, run.gold + resolved.goldDelta),
        ...(shieldConsumed ? { shieldArmed: false } : {}),
        ...(resolved.relicLost || resolved.relicGranted ? { relics: updatedRelics } : {}),
      },
    });
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
   * Utilise un consommable : décrémente l'inventaire. Le Bouclier arme `shieldArmed` (non
   * stackable). 50/50 et Appel à un ami calculent et persistent leur effet sur la question en
   * cours (`consumableReveal`), lu tel quel côté client puisqu'il a déjà `data.response`/
   * `data.propositions` — un seul usage par question et par type.
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

    if (activeRoom.type === null || activeRoom.status !== "ACTIVE") {
      throw createError({ statusCode: 409, statusMessage: "Aucune question en cours." });
    }
    const responses = (activeRoom.responses as unknown as BrainrunRoomResponse[]) ?? [];
    const questionId = activeRoom.questionIds[responses.length];
    if (questionId === undefined) {
      throw createError({ statusCode: 409, statusMessage: "Aucune question en cours." });
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
    } else {
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

  /** Applique le gain d'une offre (bonus post-combat ou achat en Boutique) au run. */
  private async grantOffer(runId: string, offer: BrainrunOffer): Promise<void> {
    if (offer.kind === "RELIC") {
      await prisma.brainrunRun.update({
        where: { id: runId },
        data: { relics: { push: offer.id } },
      });
    } else if (offer.kind === "CONSUMABLE") {
      await this.grantConsumable(runId, offer.id as BrainrunConsumableId, 1);
    } else {
      await prisma.brainrunRun.update({
        where: { id: runId },
        data: { gold: { increment: offer.amount ?? 0 } },
      });
    }
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

    if (activeRoom.questionStartedAt === null) {
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { questionStartedAt: new Date() },
      });
    }

    return this.getStateById(run.id);
  }

  async getMetaProgressDTO(userId: string): Promise<BrainrunMetaProgressDTO> {
    const progress = await getMetaProgress(userId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
    };
  }

  async unlockTalent(userId: string, talentId: BrainrunTalentId): Promise<BrainrunMetaProgressDTO> {
    const progress = await unlockTalentPersist(userId, talentId);
    return {
      knowledgePoints: progress.knowledgePoints,
      unlockedTalents: progress.unlockedTalents as BrainrunTalentId[],
    };
  }

  private async getStateById(runId: string): Promise<BrainrunStateDTO> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });
    return this.buildState(run);
  }

  private async seedAct(runId: string, act: number): Promise<void> {
    // La toute première salle de l'acte 1 doit d'office être un combat (pas de Boutique/
    // Repos/Événement dès le début de la run) ; les autres actes restent entièrement aléatoires.
    const choicePoints = generateActChoicePoints(Math.random, act === 1);
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
        await this.seedAct(runId, outcome.act);
      }
    }

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: { currentAct: outcome.act, currentSequence: outcome.sequence },
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
  ): Promise<number> {
    const [minDifficulty, maxDifficulty] = BRAINRUN_DIFFICULTY_BY_ACT[act]!.BOSS;
    const [id] = await questionService.getRandomIdsByDifficulty(
      minDifficulty,
      maxDifficulty,
      1,
      excludeIds,
      userId,
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

    return {
      run: this.toRunDTO(run),
      currentRoom: this.toRoomDTO(activeRoom, getActiveRelicEffects(run.relics)),
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
    };
  }

  private toRoomDTO(room: BrainrunRoomRow, effects: BrainrunRelicEffects): BrainrunRoomDTO {
    const questionDeadline =
      room.type === "BOSS" && room.status === "ACTIVE" && room.questionStartedAt
        ? new Date(room.questionStartedAt.getTime() + bossQuestionTimeMsWithRelics(effects))
        : null;

    return {
      id: room.id,
      runId: room.runId,
      act: room.act,
      sequence: room.sequence,
      type: room.type as BrainrunRoomType | null,
      status: room.status as BrainrunRoomDTO["status"],
      choiceTypes: room.choiceTypes as BrainrunRoomType[],
      questionIds: room.questionIds,
      responses: (room.responses as unknown as BrainrunRoomResponse[]) ?? [],
      goldEarned: room.goldEarned,
      bossHealthPoint: room.bossHealthPoint,
      bossMaxHealthPoint: room.bossMaxHealthPoint,
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
