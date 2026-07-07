import prisma from "~~/server/utils/prisma";
import { checkAndAwardAchievements } from "~~/server/utils/achievementHelper";
import { AchievementDTO, UserAchievementDTO } from "#shared/DTO/achievementDTO";

export class AchievementService {
  async getUserAchievements(userId: string) {
    const achivements = await prisma.achievement.findMany();
    const userAchievement = await prisma.userAchievement.findMany({
      where: { userId },
    });

    const achivementsDTO = achivements.map((a) => {
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        createdAt: "",
        xpEarned: a.xpEarned,
        hidden: a.hidden,
      } as AchievementDTO;
    });

    const userAchivementsDTO = userAchievement.map((a) => {
      return {
        achievementId: a.achievementId,
        userId: a.userId,
      } as UserAchievementDTO;
    });

    return {
      achivements: achivementsDTO,
      userAchievements: userAchivementsDTO,
    };
  }

  async checkAnswerAchievements(userId: string) {
    const reponseCount = await prisma.questionResponse.count({
      where: { userId },
    });
    const answerAchievement = await checkAndAwardAchievements(userId, "answer", reponseCount);

    const reponseSuccessCount = await prisma.questionResponse.count({
      where: { userId, success: true },
    });
    const answerCorrectAchievement = await checkAndAwardAchievements(
      userId,
      "answerCorrect",
      reponseSuccessCount,
    );

    const reponseFailedCount = await prisma.questionResponse.count({
      where: { userId, success: false },
    });
    const answerFailedAchievement = await checkAndAwardAchievements(
      userId,
      "answerFailed",
      reponseFailedCount,
    );

    const answerStreak = await this.checkResponseStreak(userId);

    return [
      ...answerAchievement,
      ...answerCorrectAchievement,
      ...answerFailedAchievement,
      ...answerStreak,
    ];
  }

  async checkAscentAchievements(userId: string) {
    const ascentSeriesCount = await prisma.questionSeriesResponse.count({
      where: { userId, seriesType: "ascent" },
    });
    const ascentsAchievement = await checkAndAwardAchievements(userId, "ascent", ascentSeriesCount);

    const ascentMaxScore = await prisma.questionSeriesResponse.findMany({
      where: { userId, seriesType: "ascent" },
      orderBy: { result: "desc" },
      select: { result: true },
      take: 1,
    });
    const ascentsMaxScoreAchievement = await checkAndAwardAchievements(
      userId,
      "ascentMaxScore",
      ascentMaxScore[0]?.result?.toNumber() ?? 0,
    );

    return [...ascentsAchievement, ...ascentsMaxScoreAchievement];
  }

  async checkDailyAchievements(userId: string) {
    const dailySeriesCount = await prisma.questionSeriesResponse.count({
      where: { userId, seriesType: "daily" },
    });
    const dailySeriesAchievement = await checkAndAwardAchievements(
      userId,
      "dailySeries",
      dailySeriesCount,
    );

    const dailySeriesStreak = await this.checkDailySeriesStreak(userId);

    return [...dailySeriesAchievement, ...dailySeriesStreak];
  }

  private async checkResponseStreak(userId: string): Promise<UserAchievementDTO[]> {
    const responses = await prisma.questionResponse.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: {
        success: true,
      },
      take: 100,
    });

    const firstResponse = responses[0];
    if (!firstResponse) return [];
    let currentStreak = 0;
    const isSuccessStreak = firstResponse.success;

    for (const response of responses) {
      if (response.success === isSuccessStreak) {
        currentStreak++;
      } else {
        break;
      }
    }

    return await checkAndAwardAchievements(
      userId,
      isSuccessStreak ? "answerCorrectStreak" : "answerFailedStreak",
      currentStreak,
    );
  }

  private async checkDailySeriesStreak(userId: string): Promise<UserAchievementDTO[]> {
    const seriesList = await prisma.questionSeries.findMany({
      where: { type: "daily" },
      orderBy: { createDate: "desc" },
      take: 360,
      select: {
        id: true,
      },
    });
    const userSeries = await prisma.questionSeriesResponse.findMany({
      where: { userId, seriesType: "daily" },
      orderBy: { createDate: "desc" },
      take: 360,
      select: {
        id: true,
        seriesId: true,
      },
    });
    let currentStreak = 0;

    for (const series of seriesList) {
      if (userSeries.some((us) => us.seriesId == series.id)) {
        currentStreak++;
      } else {
        break;
      }
    }
    return await checkAndAwardAchievements(userId, "dailySeriesStreak", currentStreak);
  }

  async checkBattleRoyaleAchievements(
    userId: string,
    playerStats?: {
      lives: number;
      roundsPlayed: number;
      isWinner: boolean;
      correctStreak: number;
    },
  ) {
    const brRank = await prisma.battleRoyaleRank.findUnique({
      where: { userId },
    });
    if (!brRank) return [];

    const gamesPlayedAchievement = await checkAndAwardAchievements(
      userId,
      "brGames",
      brRank.gamesPlayed,
    );

    const winsAchievement = await checkAndAwardAchievements(userId, "brWins", brRank.wins);

    const extraAchievements: UserAchievementDTO[] = [];

    if (brRank.points !== undefined && brRank.points !== null) {
      const pointsAchievements = await checkAndAwardAchievements(
        userId,
        "brRankPoints",
        brRank.points,
      );
      extraAchievements.push(...pointsAchievements);
    }

    if (playerStats) {
      if (playerStats.isWinner) {
        if (playerStats.lives === 3) {
          const perfectWin = await checkAndAwardAchievements(userId, "brPerfectWin", 1);
          extraAchievements.push(...perfectWin);
        }
        if (playerStats.lives === 1) {
          const clutchWin = await checkAndAwardAchievements(userId, "brClutchWin", 1);
          extraAchievements.push(...clutchWin);
        }
      }

      const roundAchievement = await checkAndAwardAchievements(
        userId,
        "brRounds",
        playerStats.roundsPlayed,
      );
      extraAchievements.push(...roundAchievement);

      const streakAchievement = await checkAndAwardAchievements(
        userId,
        "brStreak",
        playerStats.correctStreak,
      );
      extraAchievements.push(...streakAchievement);
    }

    return [...gamesPlayedAchievement, ...winsAchievement, ...extraAchievements];
  }

  async checkShowdownAchievements(userId: string) {
    const showdownRank = await prisma.showdownRank.findUnique({
      where: { userId },
    });
    if (!showdownRank) return [];

    const gamesPlayedAchievement = await checkAndAwardAchievements(
      userId,
      "showdownGames",
      showdownRank.gamesPlayed,
    );

    const winsAchievement = await checkAndAwardAchievements(
      userId,
      "showdownWins",
      showdownRank.wins,
    );

    return [...gamesPlayedAchievement, ...winsAchievement];
  }
}

export const achievementService = new AchievementService();
