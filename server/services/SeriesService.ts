import type { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import type {
  QuestionSeriesData,
  QuestionSeriesDTO,
  QuestionSeriesResponseDTO,
  QuestionSeriesResponseData,
  QuestionSeriesResponseDataResponse,
  UserSeriesDTO,
} from "#shared/series";
import type { QuestionSeriesAscensionResponseData } from "#shared/series/seriesAscension";
import type {
  SpeedrunSurvivalResponseData,
  UserSpeedrunSurvivalDTO,
  SpeedrunSurvivalRankingDTO,
  SpeedrunSprintResponseData,
  UserSpeedrunSprintDTO,
  SpeedrunSprintRankingDTO,
} from "#shared/series/seriesSpeedrun";
import { QuestionDataDTO } from "#shared/question";
import type { SeriesResponseDTO } from "#shared/DTO/seriesResponseDTO";
import type { DailyStatsDTO } from "#shared/DTO/dailyStatsDTO";
import { coinsFromXp, grantCoins } from "~~/server/utils/walletHelper";

type DailySeriesRankingDTO = {
  userId: string;
  userName: string;
  score: number;
  elapsedTime: string;
  avatarUrl: string | null;
  frameStyleKey: string | null;
};

export class SeriesService {
  // ===================== Daily =====================

  async getDailySeries(userId: string): Promise<UserSeriesDTO> {
    const today = new Date().toJSON().slice(0, 10);

    let currentDailySeries = await prisma.questionSeries.findFirst({
      where: { date: new Date(today) },
    });

    if (!currentDailySeries) {
      let dailyNumber = await prisma.questionSeries.count({
        where: { type: "daily" },
      });
      dailyNumber++;
      const questionsIds = await this.getRandomDailyQuestionsIds();
      const newSeries: Prisma.QuestionSeriesCreateInput = {
        date: new Date(today),
        difficulty: 1,
        title: `Daily ${dailyNumber}`,
        type: "daily",
        userCreate: "Auto",
        userUpdate: "Auto",
        data: {
          id: dailyNumber,
          questionsIds,
        },
      };
      currentDailySeries = await prisma.questionSeries.create({
        data: newSeries,
      });
    }

    const userResponse = await prisma.questionSeriesResponse.findFirst({
      where: { seriesId: currentDailySeries.id, userId },
    });

    return {
      series: currentDailySeries as unknown as QuestionSeriesDTO,
      userResponse: (userResponse as unknown as QuestionSeriesResponseDTO) ?? null,
    } as UserSeriesDTO;
  }

  async submitDailyResponse(body: SeriesResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });

    if (!question?.data) return;

    const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

    const series = await prisma.questionSeries.findFirst({
      where: { id: body.seriesId },
    });
    if (!series) return;

    const seriesResponse = await prisma.questionSeriesResponse.findFirst({
      where: { seriesId: body.seriesId, userId },
    });

    const seriesResponseToAdd: QuestionSeriesResponseDataResponse = {
      questionId: body.questionId,
      responseId: body.userResponseId,
      success,
      elapsedTime: 0,
    };

    if (!seriesResponse) {
      return await prisma.questionSeriesResponse.create({
        data: {
          seriesId: body.seriesId,
          userId,
          seriesType: "daily",
          data: {
            responses: [seriesResponseToAdd as any],
            nextQuestion: (series.data as any as QuestionSeriesData).questionsIds[1],
          },
        },
      });
    } else {
      const responseData = seriesResponse.data as any as QuestionSeriesResponseData;
      //Si la question envoyé est != de la question suivante pas normal ! CHEAT !
      if (body.questionId != responseData.nextQuestion) return seriesResponse;
      const countSeriesQuestions = (series.data as any as QuestionSeriesData).questionsIds.length;
      const seriesAlreadyEnded = responseData.responses.length == countSeriesQuestions;
      if (seriesAlreadyEnded) return;
      responseData.responses.push(seriesResponseToAdd);
      const countResponse = responseData.responses.length;
      const countSuccessResponse = responseData.responses.filter((c) => c.success).length;
      const seriesEnded = countResponse == countSeriesQuestions;
      let xpEarned = 0;
      if (seriesEnded) {
        xpEarned = await this.calculDailyUserXP(countSeriesQuestions, countSuccessResponse, userId);
      }

      responseData.xpEarned = xpEarned;
      responseData.score =
        Math.round(((countSuccessResponse / countSeriesQuestions) * 10 + Number.EPSILON) * 100) /
        100;

      responseData.nextQuestion =
        (series.data as any as QuestionSeriesData).questionsIds[countResponse] ?? 0;

      return await prisma.questionSeriesResponse.update({
        where: { id: seriesResponse.id },
        data: {
          data: responseData as any,
          updateDate: new Date(),
          result: responseData.score,
        },
      });
    }
  }

  /** Participation du jour : joueurs ayant commencé / terminé la série quotidienne. */
  async getDailyStats(): Promise<DailyStatsDTO> {
    const today = new Date().toJSON().slice(0, 10);
    const currentDailySeries = await prisma.questionSeries.findFirst({
      where: { type: "daily", date: new Date(today) },
    });
    if (!currentDailySeries) return { participants: 0, finishers: 0 };

    const questionCount = (currentDailySeries.data as any as QuestionSeriesData).questionsIds
      .length;
    const responses = await prisma.questionSeriesResponse.findMany({
      where: { seriesId: currentDailySeries.id },
      select: { data: true },
    });
    const finishers = responses.filter(
      (r) =>
        ((r.data as any as QuestionSeriesResponseData).responses?.length ?? 0) >= questionCount,
    ).length;

    return { participants: responses.length, finishers };
  }

  async getDailyRanking() {
    const lastSeries = await prisma.questionSeries.findFirst({
      where: { type: "daily" },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (!lastSeries) return;

    const usersResponses = await prisma.questionSeriesResponse.findMany({
      where: { seriesId: lastSeries.id },
      include: {
        user: {
          include: {
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
          },
        },
      },
    });

    const ranking = usersResponses
      .filter((u) => (u.data as any).score)
      .sort((a, b) => {
        const aData = a.data as any as QuestionSeriesResponseData;
        const bData = b.data as any as QuestionSeriesResponseData;
        if (aData.score < bData.score) return 1;
        if (aData.score > bData.score) return -1;
        // Si les scores sont égaux, comparer les temps
        const elapsedA = a.updateDate.getTime() - a.createDate.getTime();
        const elapsedB = b.updateDate.getTime() - b.createDate.getTime();
        if (elapsedA < elapsedB) return -1;
        if (elapsedA > elapsedB) return 1;
        return 0;
      });

    return ranking.map((r) => {
      const data = r.data as any as QuestionSeriesResponseData;
      return {
        userId: r.userId,
        userName: r.user.name ?? "Anonymous",
        score: data.score,
        elapsedTime: this.millisToMinutesAndSeconds(
          r.updateDate.getTime() - r.createDate.getTime(),
        ),
        avatarUrl: r.user.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: r.user.equippedFrame?.styleKey ?? null,
      } as DailySeriesRankingDTO;
    });
  }

  // ===================== Ascent =====================

  async getUserAscent(userId: string): Promise<UserSeriesDTO> {
    const userSeriesDTO = {} as UserSeriesDTO;
    const lastUserAscent = await this.getLastUserAscent(userId);
    if (lastUserAscent) {
      const lastUserAscentData = lastUserAscent.data as QuestionSeriesAscensionResponseData;
      if (!lastUserAscentData.ended) {
        userSeriesDTO.series = lastUserAscent.series as QuestionSeriesDTO;
        userSeriesDTO.userResponse = lastUserAscent as any as QuestionSeriesResponseDTO;
      } else {
        const { nextUserAscentSeries, nextAscentId } = await this.getNextUserAscentSeries(
          lastUserAscent.series.data as any as QuestionSeriesData,
        );
        if (nextUserAscentSeries) {
          userSeriesDTO.series = nextUserAscentSeries as any as QuestionSeriesDTO;
        } else {
          userSeriesDTO.series = await this.generateNewAscentSeries(nextAscentId);
        }
      }
    } else {
      const firstAscentSeries = await this.getFirstAscentSeries();
      if (firstAscentSeries) userSeriesDTO.series = firstAscentSeries as QuestionSeriesDTO;
      else userSeriesDTO.series = await this.generateNewAscentSeries(1);
    }

    return userSeriesDTO;
  }

  async submitAscentResponse(body: SeriesResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });

    if (!question?.data) return;

    const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

    const series = (await prisma.questionSeries.findFirst({
      where: { id: body.seriesId },
    })) as QuestionSeriesDTO;
    if (!series) return;

    const seriesResponse = await prisma.questionSeriesResponse.findFirst({
      where: { seriesId: body.seriesId, userId },
    });

    const seriesResponseToAdd: QuestionSeriesResponseDataResponse = {
      questionId: body.questionId,
      responseId: body.userResponseId,
      success,
      elapsedTime: 0,
    };

    if (!seriesResponse) {
      const seriesHealtPoint = (series.data as QuestionSeriesData).healthPoint;
      const currentHealthPoint = success ? seriesHealtPoint : seriesHealtPoint - 1;
      const seriesEnded = currentHealthPoint == 0;
      return await prisma.questionSeriesResponse.create({
        data: {
          seriesId: body.seriesId,
          userId,
          result: 0,
          seriesType: "ascent",
          data: {
            responses: [seriesResponseToAdd as any],
            healthPoint: currentHealthPoint,
            ended: seriesEnded,
            nextQuestion: (series.data as any as QuestionSeriesData).questionsIds[1],
            seriesType: "ascent",
          },
        },
      });
    } else {
      const responseData = seriesResponse.data as any as QuestionSeriesAscensionResponseData;
      //Si la question envoyé est != de la question suivante pas normal ! CHEAT !
      if (body.questionId != responseData.nextQuestion) return seriesResponse;
      const userHealthPoint = responseData.healthPoint;
      responseData.healthPoint = success ? userHealthPoint : userHealthPoint - 1;
      const countSeriesQuestions = series.data.questionsIds.length;
      const seriesAlreadyEnded = responseData.responses.length == countSeriesQuestions;
      if (seriesAlreadyEnded) return;

      responseData.responses.push(seriesResponseToAdd);
      const countResponse = responseData.responses.length;
      const countSuccessResponse = responseData.responses.filter((c) => c.success).length;

      responseData.ended =
        responseData.healthPoint == 0 ||
        responseData.responses.length >= series.data.questionsIds.length;

      let xpEarned = 0;
      if (responseData.ended) {
        xpEarned = await this.calculAscentUserXP(countSuccessResponse, userId);
      }

      responseData.xpEarned = xpEarned;
      responseData.score = countSuccessResponse;

      responseData.nextQuestion =
        (series.data as any as QuestionSeriesData).questionsIds[countResponse] ?? 0;

      return await prisma.questionSeriesResponse.update({
        where: { id: seriesResponse.id },
        data: {
          data: responseData as any,
          updateDate: new Date(),
          result: countSuccessResponse,
          seriesType: "ascent",
        },
      });
    }
  }

  // ===================== Helpers partagés =====================

  private async getMinMaxId() {
    const result = await prisma.question.aggregate({
      _max: { id: true },
      _min: { id: true },
    });
    return { minId: result._min.id, maxId: result._max.id };
  }

  private async isQuestionExists(id: number): Promise<boolean> {
    const question = await prisma.question.findUnique({
      where: { id, deleted: false },
      select: { id: true },
    });
    return question !== null;
  }

  // ===================== Helpers daily =====================

  private getRandomIdAvoiding(minId: number, maxId: number, idToIgnore: number[]): number {
    let randomId;
    do {
      randomId = Math.floor(Math.random() * (maxId - minId + 1) + minId);
    } while (idToIgnore.includes(randomId));
    return randomId;
  }

  /** 10 questions aléatoires uniques, en évitant celles des 30 dernières séries daily. */
  private async getRandomDailyQuestionsIds() {
    const { minId, maxId } = await this.getMinMaxId();
    const uniqueIds = new Set<number>();
    const previousSeries = await prisma.questionSeries.findMany({
      where: {
        type: "daily",
      },
      orderBy: { id: "desc" },
      take: 30,
    });

    let questionIdsToIgnore: number[] = [];
    previousSeries.forEach(
      (p) =>
        (questionIdsToIgnore = questionIdsToIgnore.concat(
          (p.data as any as QuestionSeriesData).questionsIds,
        )),
    );

    while (uniqueIds.size < 10) {
      const randomId = this.getRandomIdAvoiding(minId!, maxId!, questionIdsToIgnore);
      if (await this.isQuestionExists(randomId)) {
        uniqueIds.add(randomId);
      }
    }

    return Array.from(uniqueIds);
  }

  private async calculDailyUserXP(
    countSeriesQuestions: number,
    countSuccessResponse: number,
    userId: string,
  ) {
    const multiplicator = 10 * (1 + countSuccessResponse / countSeriesQuestions);
    const userXpWin = Math.ceil(countSuccessResponse * multiplicator);

    const userProgress = await prisma.userProgress.findFirst({
      where: { userId },
    });

    if (userProgress) {
      const userXpTot = userProgress.xp + userXpWin;
      const level = await prisma.level.findFirst({
        where: { xp_threshold: { lte: userXpTot } },
        orderBy: { xp_threshold: "desc" },
      });
      await prisma.userProgress.update({
        where: { userId },
        data: {
          xp: { increment: userXpWin },
          levelId: level?.id,
        },
      });
    }

    await grantCoins(userId, coinsFromXp(userXpWin));

    return userXpWin;
  }

  private millisToMinutesAndSeconds(millis: number) {
    const minutes = Math.floor(millis / 60000);
    const seconds = +((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  // ===================== Helpers ascent =====================

  private getRandomIdBetween(minId: number, maxId: number): number {
    return Math.floor(Math.random() * (maxId - minId + 1) + minId);
  }

  /** 100 questions aléatoires uniques existantes. */
  private async getRandomAscentQuestionsIds() {
    const { minId, maxId } = await this.getMinMaxId();
    const uniqueIds = new Set<number>();

    while (uniqueIds.size < 100) {
      const randomId = this.getRandomIdBetween(minId!, maxId!);
      if (await this.isQuestionExists(randomId)) {
        uniqueIds.add(randomId);
      }
    }

    return Array.from(uniqueIds);
  }

  private async generateNewAscentSeries(seriesId: number) {
    const questionsIds = await this.getRandomAscentQuestionsIds();
    const newSeries: Prisma.QuestionSeriesCreateInput = {
      date: new Date(),
      difficulty: 1,
      title: `Ascension ${seriesId}`,
      type: "ascent",
      userCreate: "Auto",
      userUpdate: "Auto",
      data: {
        id: seriesId,
        questionsIds,
        healthPoint: 2,
        seriesType: "ascent",
      },
    };
    return (await prisma.questionSeries.create({
      data: newSeries,
    })) as any as QuestionSeriesDTO;
  }

  private async getNextUserAscentSeries(lastUserAscentSeries: QuestionSeriesData) {
    const nextAscentId = lastUserAscentSeries.id + 1;
    const nextUserAscentSeries = await prisma.questionSeries.findFirst({
      where: {
        type: "ascent",
        data: {
          path: ["id"],
          equals: nextAscentId,
        },
      },
    });
    return { nextUserAscentSeries, nextAscentId };
  }

  private async getLastUserAscent(userId: string) {
    return await prisma.questionSeriesResponse.findFirst({
      where: {
        userId,
        data: {
          path: ["seriesType"],
          equals: "ascent",
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 1,
      include: {
        series: true,
      },
    });
  }

  private async getFirstAscentSeries() {
    return await prisma.questionSeries.findFirst({
      where: {
        type: "ascent",
      },
      orderBy: { id: "asc" },
      take: 1,
    });
  }

  private async calculAscentUserXP(countSuccessResponse: number, userId: string) {
    const fiveXp = Math.floor(countSuccessResponse / 5) * 20;
    const tenXp = Math.floor(countSuccessResponse / 10) * 40;
    const twentyFiveXp = Math.floor(countSuccessResponse / 25) * 100;
    const fiftyXp = Math.floor(countSuccessResponse / 50) * 200;
    const hundredXp = Math.floor(countSuccessResponse / 100) * 500;
    const userXpWin = fiveXp + tenXp + twentyFiveXp + fiftyXp + hundredXp;

    const userProgress = await prisma.userProgress.findFirst({
      where: { userId },
    });

    if (userProgress) {
      const userXpTot = userProgress.xp + userXpWin;
      const level = await prisma.level.findFirst({
        where: { xp_threshold: { lte: userXpTot } },
        orderBy: { xp_threshold: "desc" },
      });
      await prisma.userProgress.update({
        where: { userId },
        data: {
          xp: { increment: userXpWin },
          levelId: level?.id,
        },
      });
    }

    await grantCoins(userId, coinsFromXp(userXpWin));

    return userXpWin;
  }

  // ===================== Speedrun Survival =====================

  async getOrCreateSpeedrunSeries(): Promise<number> {
    let series = await prisma.questionSeries.findFirst({
      where: { type: "speedrun_survival" },
    });
    if (!series) {
      series = await prisma.questionSeries.create({
        data: {
          type: "speedrun_survival",
          difficulty: 1,
          title: "Speedrun Survie Flash",
          date: new Date(),
          userCreate: "Auto",
          userUpdate: "Auto",
          data: {},
        },
      });
    }
    return series.id;
  }

  async getActiveSpeedrunSurvival(userId: string): Promise<UserSpeedrunSurvivalDTO> {
    const seriesId = await this.getOrCreateSpeedrunSeries();
    const activeResponse = await prisma.questionSeriesResponse.findFirst({
      where: {
        seriesId,
        userId,
        seriesType: "speedrun_survival",
      },
      orderBy: { id: "desc" },
    });

    const series = await prisma.questionSeries.findUnique({
      where: { id: seriesId },
    });

    if (activeResponse) {
      const data = activeResponse.data as any as SpeedrunSurvivalResponseData;
      const elapsedMs = Date.now() - activeResponse.createDate.getTime();
      const elapsedSec = elapsedMs / 1000;
      const limit = 120 - (data.penalties || 0);
      if (!data.ended && elapsedSec < limit) {
        return {
          series: series as unknown as QuestionSeriesDTO,
          userResponse: activeResponse as unknown as any,
        };
      } else if (!data.ended) {
        data.ended = true;
        await prisma.questionSeriesResponse.update({
          where: { id: activeResponse.id },
          data: { data: data as any },
        });
      }
    }

    return {
      series: series as unknown as QuestionSeriesDTO,
      userResponse: null,
    };
  }

  async startSpeedrunSurvival(userId: string): Promise<UserSpeedrunSurvivalDTO> {
    const seriesId = await this.getOrCreateSpeedrunSeries();

    // Find if there is an active speedrun
    const activeResponse = await prisma.questionSeriesResponse.findFirst({
      where: {
        seriesId,
        userId,
        seriesType: "speedrun_survival",
      },
      orderBy: { id: "desc" },
    });

    const series = await prisma.questionSeries.findUnique({
      where: { id: seriesId },
    });

    if (activeResponse) {
      const data = activeResponse.data as any as SpeedrunSurvivalResponseData;
      const elapsedMs = Date.now() - activeResponse.createDate.getTime();
      const elapsedSec = elapsedMs / 1000;
      const limit = 120 - (data.penalties || 0);
      if (!data.ended && elapsedSec < limit) {
        return {
          series: series as unknown as QuestionSeriesDTO,
          userResponse: activeResponse as unknown as any,
        };
      } else if (!data.ended) {
        data.ended = true;
        await prisma.questionSeriesResponse.update({
          where: { id: activeResponse.id },
          data: { data: data as any },
        });
      }
    }

    const firstQuestionId = await this.getRandomQuestionId([]);
    if (!firstQuestionId) {
      throw new Error("No questions available");
    }

    const newResponseData: SpeedrunSurvivalResponseData = {
      seriesType: "speedrun_survival",
      responses: [],
      score: 0,
      penalties: 0,
      ended: false,
      nextQuestion: firstQuestionId,
      answeredQuestionIds: [firstQuestionId],
      xpEarned: 0,
    };

    const newResponse = await prisma.questionSeriesResponse.create({
      data: {
        seriesId,
        userId,
        seriesType: "speedrun_survival",
        result: 0,
        data: newResponseData as any,
      },
    });

    return {
      series: series as unknown as QuestionSeriesDTO,
      userResponse: newResponse as unknown as any,
    };
  }

  async submitSpeedrunSurvivalResponse(body: SeriesResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });
    if (!question?.data) return;

    const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

    const seriesResponse = await prisma.questionSeriesResponse.findFirst({
      where: { seriesId: body.seriesId, userId, seriesType: "speedrun_survival" },
      orderBy: { id: "desc" },
    });
    if (!seriesResponse) return;

    const responseData = seriesResponse.data as any as SpeedrunSurvivalResponseData;
    if (responseData.ended) return seriesResponse;

    if (body.questionId != responseData.nextQuestion) return seriesResponse;

    const elapsedMs = Date.now() - seriesResponse.createDate.getTime();
    const elapsedSec = elapsedMs / 1000;
    const currentLimit = 120 - responseData.penalties;

    if (elapsedSec >= currentLimit) {
      responseData.ended = true;
      return await prisma.questionSeriesResponse.update({
        where: { id: seriesResponse.id },
        data: {
          data: responseData as any,
          updateDate: new Date(),
        },
      });
    }

    const responseToAdd: QuestionSeriesResponseDataResponse = {
      questionId: body.questionId,
      responseId: body.userResponseId,
      success,
      elapsedTime: Math.round(elapsedMs),
    };

    responseData.responses.push(responseToAdd);

    if (success) {
      responseData.score++;
    } else {
      responseData.penalties += 5;
    }

    const newLimit = 120 - responseData.penalties;
    const finalElapsedMs = Date.now() - seriesResponse.createDate.getTime();
    const finalElapsedSec = finalElapsedMs / 1000;
    const timeExpired = finalElapsedSec >= newLimit;

    if (timeExpired) {
      responseData.ended = true;
    } else {
      const nextQId = await this.getRandomQuestionId(responseData.answeredQuestionIds);
      if (nextQId) {
        responseData.nextQuestion = nextQId;
        responseData.answeredQuestionIds.push(nextQId);
      } else {
        responseData.ended = true;
      }
    }

    if (responseData.ended) {
      const xpEarned = await this.calculSpeedrunUserXP(responseData.score, userId);
      responseData.xpEarned = xpEarned;
    }

    return await prisma.questionSeriesResponse.update({
      where: { id: seriesResponse.id },
      data: {
        data: responseData as any,
        updateDate: new Date(),
        result: responseData.score,
      },
    });
  }

  private async getRandomQuestionId(excludeIds: number[]): Promise<number | null> {
    const { minId, maxId } = await this.getMinMaxId();
    if (!minId || !maxId) return null;

    for (let i = 0; i < 30; i++) {
      const randomId = Math.floor(Math.random() * (maxId - minId + 1) + minId);
      if (!excludeIds.includes(randomId) && (await this.isQuestionExists(randomId))) {
        return randomId;
      }
    }

    const questions = await prisma.question.findMany({
      where: {
        deleted: false,
        id: { notIn: excludeIds },
      },
      select: { id: true },
      take: 10,
    });
    if (questions.length > 0) {
      const q = questions[Math.floor(Math.random() * questions.length)];
      return q ? q.id : null;
    }
    return null;
  }

  private async calculSpeedrunUserXP(score: number, userId: string) {
    const xpPerCorrect = 5;
    const userXpWin = score * xpPerCorrect;
    if (userXpWin <= 0) return 0;

    const userProgress = await prisma.userProgress.findFirst({
      where: { userId },
    });

    if (userProgress) {
      const userXpTot = userProgress.xp + userXpWin;
      const level = await prisma.level.findFirst({
        where: { xp_threshold: { lte: userXpTot } },
        orderBy: { xp_threshold: "desc" },
      });
      await prisma.userProgress.update({
        where: { userId },
        data: {
          xp: { increment: userXpWin },
          levelId: level?.id,
        },
      });
    }

    await grantCoins(userId, coinsFromXp(userXpWin));
    return userXpWin;
  }

  async getSpeedrunSurvivalRanking(): Promise<SpeedrunSurvivalRankingDTO[]> {
    const seriesId = await this.getOrCreateSpeedrunSeries();

    const topResponses = await prisma.questionSeriesResponse.findMany({
      where: {
        seriesId,
        seriesType: "speedrun_survival",
      },
      orderBy: [{ result: "desc" }, { createDate: "asc" }],
      include: {
        user: {
          include: {
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
          },
        },
      },
      take: 200,
    });

    const seenUsers = new Set<string>();
    const ranking: SpeedrunSurvivalRankingDTO[] = [];
    let rank = 1;

    for (const r of topResponses) {
      if (seenUsers.has(r.userId)) continue;
      seenUsers.add(r.userId);

      ranking.push({
        userId: r.userId,
        userName: r.user.name ?? "Anonymous",
        score: Number(r.result),
        avatarUrl: r.user.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: r.user.equippedFrame?.styleKey ?? null,
        rank: rank++,
      });

      if (ranking.length >= 50) break;
    }

    return ranking;
  }

  // ===================== Speedrun Sprint =====================

  async getOrCreateSpeedrunSprintSeries(): Promise<number> {
    let series = await prisma.questionSeries.findFirst({
      where: { type: "speedrun_sprint" },
    });
    if (!series) {
      series = await prisma.questionSeries.create({
        data: {
          type: "speedrun_sprint",
          difficulty: 1,
          title: "Speedrun Sprint 20",
          date: new Date(),
          userCreate: "Auto",
          userUpdate: "Auto",
          data: {},
        },
      });
    }
    return series.id;
  }

  async getActiveSpeedrunSprint(userId: string): Promise<UserSpeedrunSprintDTO> {
    const seriesId = await this.getOrCreateSpeedrunSprintSeries();
    const activeResponse = await prisma.questionSeriesResponse.findFirst({
      where: {
        seriesId,
        userId,
        seriesType: "speedrun_sprint",
      },
      orderBy: { id: "desc" },
    });

    const series = await prisma.questionSeries.findUnique({
      where: { id: seriesId },
    });

    if (activeResponse) {
      const data = activeResponse.data as any as SpeedrunSprintResponseData;
      if (!data.ended) {
        return {
          series: series as unknown as QuestionSeriesDTO,
          userResponse: activeResponse as unknown as any,
        };
      }
    }

    return {
      series: series as unknown as QuestionSeriesDTO,
      userResponse: null,
    };
  }

  async startSpeedrunSprint(userId: string): Promise<UserSpeedrunSprintDTO> {
    const seriesId = await this.getOrCreateSpeedrunSprintSeries();

    const activeRun = await this.getActiveSpeedrunSprint(userId);
    if (activeRun.userResponse) {
      return activeRun;
    }

    const firstQuestionId = await this.getRandomQuestionId([]);
    if (!firstQuestionId) {
      throw new Error("No questions available");
    }

    const newResponseData: SpeedrunSprintResponseData = {
      seriesType: "speedrun_sprint",
      responses: [],
      score: 0,
      penalties: 0,
      ended: false,
      nextQuestion: firstQuestionId,
      answeredQuestionIds: [firstQuestionId],
      xpEarned: 0,
    };

    const newResponse = await prisma.questionSeriesResponse.create({
      data: {
        seriesId,
        userId,
        seriesType: "speedrun_sprint",
        result: 9999999, // default high time
        data: newResponseData as any,
      },
    });

    return {
      series: activeRun.series,
      userResponse: newResponse as unknown as any,
    };
  }

  async submitSpeedrunSprintResponse(body: SeriesResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });
    if (!question?.data) return;

    const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

    const seriesResponse = await prisma.questionSeriesResponse.findFirst({
      where: { seriesId: body.seriesId, userId, seriesType: "speedrun_sprint" },
      orderBy: { id: "desc" },
    });
    if (!seriesResponse) return;

    const responseData = seriesResponse.data as any as SpeedrunSprintResponseData;
    if (responseData.ended) return seriesResponse;

    if (body.questionId != responseData.nextQuestion) return seriesResponse;

    const elapsedMs = Date.now() - seriesResponse.createDate.getTime();

    const responseToAdd: QuestionSeriesResponseDataResponse = {
      questionId: body.questionId,
      responseId: body.userResponseId,
      success,
      elapsedTime: Math.round(elapsedMs),
    };

    responseData.responses.push(responseToAdd);

    if (success) {
      responseData.score++;
    } else {
      responseData.penalties += 5;
    }

    // Target: 20 correct answers
    if (responseData.score >= 20) {
      responseData.ended = true;
      const finalTimeMs = elapsedMs + responseData.penalties * 1000;

      const xpEarned = await this.calculSpeedrunUserXP(responseData.score, userId);
      responseData.xpEarned = xpEarned;

      return await prisma.questionSeriesResponse.update({
        where: { id: seriesResponse.id },
        data: {
          data: responseData as any,
          updateDate: new Date(),
          result: finalTimeMs,
        },
      });
    } else {
      const nextQId = await this.getRandomQuestionId(responseData.answeredQuestionIds);
      if (nextQId) {
        responseData.nextQuestion = nextQId;
        responseData.answeredQuestionIds.push(nextQId);
      } else {
        responseData.ended = true;
      }
    }

    return await prisma.questionSeriesResponse.update({
      where: { id: seriesResponse.id },
      data: {
        data: responseData as any,
        updateDate: new Date(),
        result: 9999999,
      },
    });
  }

  async getSpeedrunSprintRanking(): Promise<SpeedrunSprintRankingDTO[]> {
    const seriesId = await this.getOrCreateSpeedrunSprintSeries();

    const topResponses = await prisma.questionSeriesResponse.findMany({
      where: {
        seriesId,
        seriesType: "speedrun_sprint",
        data: {
          path: ["ended"],
          equals: true,
        },
      },
      orderBy: [{ result: "asc" }, { createDate: "asc" }],
      include: {
        user: {
          include: {
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
          },
        },
      },
      take: 200,
    });

    const seenUsers = new Set<string>();
    const ranking: SpeedrunSprintRankingDTO[] = [];
    let rank = 1;

    for (const r of topResponses) {
      if (seenUsers.has(r.userId)) continue;
      seenUsers.add(r.userId);

      ranking.push({
        userId: r.userId,
        userName: r.user.name ?? "Anonymous",
        elapsedTimeMs: Number(r.result),
        avatarUrl: r.user.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: r.user.equippedFrame?.styleKey ?? null,
        rank: rank++,
      });

      if (ranking.length >= 50) break;
    }

    return ranking;
  }
}

export const seriesService = new SeriesService();
