import prisma from "~~/server/utils/prisma";
import { isCorrectAnswer, questionService } from "~~/server/services/QuestionService";
import { updateUserProgress } from "~~/server/utils/userProgressHelper";
import { checkAndAwardAchievements } from "~~/server/utils/achievementHelper";
import {
  brainrunBossDamage,
  brainrunHpLossForDifficulty,
  calculBrainrunUserXP,
  generateActChoicePoints,
  instantRoomHealthDelta,
  isBossAnswerTimedOut,
  nextRoomAfterClear,
} from "~~/server/utils/brainrunLogic";
import {
  BRAINRUN_BOSS_MAX_HP,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_DIFFICULTY_BY_ACT,
  BRAINRUN_GOLD_BY_ROOM_TYPE,
  BRAINRUN_MAX_HP,
  BRAINRUN_QUESTIONS_PER_ROOM,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_START_HP,
} from "~~/server/utils/brainrunConfig";
import { QuestionDataDTO } from "#shared/question";
import type {
  BrainrunRoomDTO,
  BrainrunRoomResponse,
  BrainrunRoomType,
  BrainrunRunDTO,
  BrainrunStateDTO,
} from "#shared/brainrun";

type CombatRoomType = "STANDARD" | "ELITE" | "BOSS";

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
    const created = await prisma.brainrunRun.create({
      data: {
        userId,
        healthPoint: BRAINRUN_START_HP,
        maxHealthPoint: BRAINRUN_MAX_HP,
      },
    });
    await this.seedAct(created.id, 1);
    return this.getStateById(created.id);
  }

  async abandonRun(userId: string): Promise<void> {
    const run = await prisma.brainrunRun.findFirst({ where: { userId, status: "IN_PROGRESS" } });
    if (!run) return;
    await prisma.brainrunRun.update({
      where: { id: run.id },
      data: { status: "ABANDONED", endDate: new Date() },
    });
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
    } else if (choice === "SHOP" || choice === "EVENT") {
      // Aucun effet de jeu ; l'écran "en construction" côté client fait déjà office
      // de confirmation avant l'appel, donc on avance directement.
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: { type: choice, status: "CLEARED", goldEarned: 0 },
      });
      await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentSequence);
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
    const elapsedMs = activeRoom.questionStartedAt
      ? Date.now() - activeRoom.questionStartedAt.getTime()
      : 0;
    // Contre-la-montre : passé le délai imparti, la réponse est forcée en échec, quelle
    // que soit la proposition envoyée par le client (le boss riposte).
    const timedOut = isBossRoom && isBossAnswerTimedOut(elapsedMs);
    const success = !timedOut && isCorrectAnswer(question, userResponseId);
    const hpLoss = success ? 0 : brainrunHpLossForDifficulty(question.difficulty);
    const bossDamage = isBossRoom ? brainrunBossDamage(elapsedMs, success) : 0;
    const newResponses: BrainrunRoomResponse[] = [
      ...responses,
      {
        questionId,
        responseId: userResponseId,
        success,
        hpLoss,
        ...(isBossRoom ? { bossDamage, timedOut } : {}),
      },
    ];
    const newHealthPoint = run.healthPoint - hpLoss;
    const died = newHealthPoint <= 0;
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
      data: { healthPoint: Math.max(newHealthPoint, 0) },
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
      const goldEarned = BRAINRUN_GOLD_BY_ROOM_TYPE[activeRoom.type as CombatRoomType];
      await prisma.brainrunRoom.update({
        where: { id: activeRoom.id },
        data: {
          responses: newResponses,
          status: "CLEARED",
          goldEarned,
          ...(isBossRoom ? { bossHealthPoint: newBossHealthPoint } : {}),
        },
      });
      await prisma.brainrunRun.update({
        where: { id: run.id },
        data: { gold: { increment: goldEarned } },
      });
      // L'avancée vers la salle suivante est différée : acknowledgeRoom() la déclenche
      // une fois que le joueur a vu le récap (or gagné / PV perdus) de cette salle.
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

    await this.advanceAfterRoomClear(run.id, run.currentAct, run.currentSequence);
    return this.getStateById(run.id);
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

  private async getStateById(runId: string): Promise<BrainrunStateDTO> {
    const run = await prisma.brainrunRun.findUniqueOrThrow({
      where: { id: runId },
      include: { rooms: true },
    });
    return this.buildState(run);
  }

  private async seedAct(runId: string, act: number): Promise<void> {
    const choicePoints = generateActChoicePoints();
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

    await prisma.brainrunRun.update({
      where: { id: runId },
      data: { status, endDate: new Date(), xpEarned },
    });
    await updateUserProgress(run.userId, xpEarned);

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
          currentQuestion = { ...question, data: questionData } as any;
        }
      }
    }

    return {
      run: this.toRunDTO(run),
      currentRoom: this.toRoomDTO(activeRoom),
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
      createDate: run.createDate,
      endDate: run.endDate,
    };
  }

  private toRoomDTO(room: BrainrunRoomRow): BrainrunRoomDTO {
    const questionDeadline =
      room.type === "BOSS" && room.status === "ACTIVE" && room.questionStartedAt
        ? new Date(room.questionStartedAt.getTime() + BRAINRUN_BOSS_QUESTION_TIME_MS)
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
    };
  }
}

type BrainrunRunRow = Awaited<ReturnType<typeof prisma.brainrunRun.findUniqueOrThrow>>;
type BrainrunRoomRow = Awaited<ReturnType<typeof prisma.brainrunRoom.findFirstOrThrow>>;

export const brainrunService = new BrainrunService();
