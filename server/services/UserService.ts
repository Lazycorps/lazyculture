import prisma from "~~/server/utils/prisma";
import { getRankFromPoints } from "~~/server/utils/rankHelper";
import { getShowdownRankFromPoints } from "~~/server/utils/showdownRankHelper";
import type { AchievementDTO, UserAchievementDTO } from "#shared/DTO/achievementDTO";
import type { QuestionSeriesResponseData } from "#shared/series";
import { themeService } from "~~/server/services/ThemeService";
import { followService } from "~~/server/services/FollowService";

export class UserService {
  async getCurrentUser(userId: string, email: string | undefined) {
    let user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        UserProgress: { include: { level: true } },
        BattleRoyaleRank: true,
        ShowdownRank: true,
      },
    });

    if (user == null) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: "",
          slug: "",
          createDate: new Date(),
          updateDate: new Date(),
        },
        include: {
          UserProgress: { include: { level: true } },
          BattleRoyaleRank: true,
          ShowdownRank: true,
        },
      });
    }

    let nextLevelTreshold = 100;
    if (user?.UserProgress?.levelId) {
      const nextLevel = await prisma.level.findFirst({
        where: { id: user.UserProgress.levelId + 1 },
        include: { UserProgress: true },
      });
      nextLevelTreshold = nextLevel?.xp_threshold ?? 100;
    }
    const brRank = user.BattleRoyaleRank || { points: 0, wins: 0, gamesPlayed: 0 };
    const rankInfo = getRankFromPoints(brRank.points);

    const showdownRankRecord = user.ShowdownRank || { points: 0, wins: 0, gamesPlayed: 0 };
    const showdownRankInfo = getShowdownRankFromPoints(showdownRankRecord.points);

    return {
      ...user,
      email,
      nextLevelTreshold,
      brRank: {
        points: brRank.points,
        wins: brRank.wins,
        gamesPlayed: brRank.gamesPlayed,
        rankInfo,
      },
      showdownRank: {
        points: showdownRankRecord.points,
        wins: showdownRankRecord.wins,
        gamesPlayed: showdownRankRecord.gamesPlayed,
        rankInfo: showdownRankInfo,
      },
    };
  }

  async createUserIfMissing(userId: string, name: string, slug: string) {
    const userInDb = await prisma.user.findFirst({
      where: { id: userId },
    });
    if (userInDb == null) {
      await prisma.user.create({
        data: {
          id: userId,
          name,
          slug,
          createDate: new Date(),
          updateDate: new Date(),
        },
      });
    }
  }

  async setUsername(userId: string, email: string | undefined, username: string) {
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: username,
        slug: this.slugify(username),
      },
      create: {
        id: userId,
        name: username,
        slug: this.slugify(username),
      },
    });

    return {
      ...user,
      email,
    };
  }

  async getProfile(targetId: string, viewerId?: string) {
    // Trouver l'utilisateur ciblé par son ID ou son Slug
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: targetId }, { slug: targetId }],
      },
      include: {
        UserProgress: {
          include: {
            level: true,
          },
        },
        BattleRoyaleRank: true,
        ShowdownRank: true,
      },
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: "Utilisateur non trouvé",
      });
    }

    // Calcul du seuil d'expérience pour le prochain niveau
    let nextLevelTreshold = 100;
    if (user?.UserProgress?.levelId) {
      const nextLevel = await prisma.level.findFirst({
        where: { id: user.UserProgress.levelId + 1 },
      });
      nextLevelTreshold = nextLevel?.xp_threshold ?? 100;
    }

    // Récupération des Exploits / Achievements
    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
    });

    const achievementsDTO = allAchievements.map((a) => {
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

    const userAchievementsDTO = userAchievements.map((ua) => {
      return {
        achievementId: ua.achievementId,
        userId: ua.userId,
      } as UserAchievementDTO;
    });

    // Récupération de l'historique Battle Royale
    const brParticipations = await prisma.battleRoyalePlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
      take: 20,
    });

    const brHistory = brParticipations.map((part) => {
      const match = part.match;
      // Calculer le classement de l'utilisateur dans ce match
      const sortedPlayers = [...match.players].sort((a, b) => {
        // Joueurs encore vivants d'abord
        if (a.lives !== b.lives) {
          return b.lives - a.lives;
        }
        // Ensuite triés par round d'élimination
        const aElim = a.eliminatedAtRound || 0;
        const bElim = b.eliminatedAtRound || 0;
        if (aElim !== bElim) {
          return bElim - aElim;
        }
        // En cas d'égalité, par vitesse de dernière réponse
        const aTime = a.lastAnswerTime?.getTime() || Infinity;
        const bTime = b.lastAnswerTime?.getTime() || Infinity;
        return aTime - bTime;
      });

      const rank = sortedPlayers.findIndex((p) => p.userId === user.id) + 1;
      const winnerPlayer = match.winnerId
        ? match.players.find((p) => p.userId === match.winnerId)
        : null;
      const winnerName = winnerPlayer?.user?.name || "Inconnu";

      return {
        matchId: match.id,
        status: match.status,
        currentRound: match.currentRound,
        winnerId: match.winnerId,
        winnerName: match.winnerId ? winnerName : null,
        createdAt: match.createdAt,
        joinedAt: part.joinedAt,
        livesLeft: part.lives,
        eliminatedAtRound: part.eliminatedAtRound,
        xpEarned: part.xpEarned,
        rank,
        totalPlayers: match.players.length,
      };
    });

    // Récupération de l'historique Daily Challenges
    const dailyResponses = await prisma.questionSeriesResponse.findMany({
      where: {
        userId: user.id,
        seriesType: "daily",
      },
      include: {
        series: true,
      },
      orderBy: {
        createDate: "desc",
      },
      take: 20,
    });

    const dailyHistory = dailyResponses.map((resp) => {
      const data = resp.data as any as QuestionSeriesResponseData;
      const seriesData = resp.series.data as any;
      const totalQuestions = seriesData?.questionsIds?.length || 10;
      const correctCount = data?.responses?.filter((r) => r.success).length ?? 0;

      return {
        responseId: resp.id,
        seriesId: resp.seriesId,
        title: resp.series.title,
        date: resp.series.date,
        score: data?.score ?? Number(resp.result),
        totalQuestions,
        correctCount,
        xpEarned: data?.xpEarned ?? 0,
        elapsedTime: resp.updateDate.getTime() - resp.createDate.getTime(),
        createDate: resp.createDate,
        updateDate: resp.updateDate,
      };
    });

    const brRank = user.BattleRoyaleRank || { points: 0, wins: 0, gamesPlayed: 0 };
    const rankInfo = getRankFromPoints(brRank.points);

    const showdownRankRecord = user.ShowdownRank || { points: 0, wins: 0, gamesPlayed: 0 };
    const showdownRankInfo = getShowdownRankFromPoints(showdownRankRecord.points);

    // Récupération de l'historique Showdown
    const showdownParticipations = await prisma.showdownPlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
      take: 20,
    });

    const showdownHistory = showdownParticipations.map((part) => {
      const match = part.match;
      const opponentPlayer = match.players.find((p) => p.userId !== user.id);
      const opponentName = opponentPlayer?.user?.name || "Adversaire";

      const won = match.winnerId === user.id;
      const draw = match.status === "FINISHED" && !match.winnerId;

      return {
        matchId: match.id,
        status: match.status,
        currentRound: match.currentRound,
        winnerId: match.winnerId,
        opponentName,
        opponentId: opponentPlayer?.userId || null,
        createdAt: match.createdAt,
        joinedAt: part.joinedAt,
        hpLeft: part.hp,
        opponentHpLeft: opponentPlayer?.hp ?? 0,
        xpEarned: part.xpEarned,
        won,
        draw,
      };
    });

    const themes = await prisma.questionTheme.findMany({
      orderBy: { name: "asc" },
    });
    const progressMap = await themeService.getAllThemesProgress(user.id);
    const themeProgress = themes.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      picture: t.picture,
      questionCount: progressMap[t.slug]?.questionCount ?? 0,
      responseCount: progressMap[t.slug]?.responseCount ?? 0,
      mastery: progressMap[t.slug]?.mastery ?? 0,
    }));

    // Calcul des statistiques globales
    const totalQuestions = await prisma.questionResponse.count({
      where: { userId: user.id },
    });
    const correctQuestions = await prisma.questionResponse.count({
      where: { userId: user.id, success: true },
    });

    // Calcul de la série de jours actifs consécutifs (streak)
    const lastResponses = await prisma.questionResponse.findMany({
      where: { userId: user.id },
      select: { date: true },
      orderBy: { date: "desc" },
      take: 500,
    });

    const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const dates = lastResponses.map((r) => toLocalDateStr(r.date));
    const uniqueDates = Array.from(new Set(dates));

    let currentStreak = 0;
    const today = new Date();
    const todayStr = toLocalDateStr(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    if (uniqueDates.includes(todayStr)) {
      currentStreak = 1;
      const checkDate = new Date();
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = toLocalDateStr(checkDate);
        if (uniqueDates.includes(checkStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (uniqueDates.includes(yesterdayStr)) {
      currentStreak = 1;
      const checkDate = new Date(yesterday);
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = toLocalDateStr(checkDate);
        if (uniqueDates.includes(checkStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Données sociales (abonnés/abonnements) vis-à-vis du visiteur
    const { followersCount, followingCount } = await followService.getCounts(user.id);
    const [isFollowing, isFollowedBy] =
      viewerId && viewerId !== user.id
        ? await Promise.all([
            followService.isFollowing(viewerId, user.id),
            followService.isFollowing(user.id, viewerId),
          ])
        : [false, false];

    return {
      social: {
        followersCount,
        followingCount,
        isFollowing,
        isFollowedBy,
      },
      user: {
        id: user.id,
        name: user.name,
        slug: user.slug,
        createDate: user.createDate,
        level: user.UserProgress?.levelId ?? 1,
        xp: user.UserProgress?.xp ?? 0,
        xpThreshold: user.UserProgress?.level?.xp_threshold ?? 0,
        nextLevelTreshold,
        brRank: {
          points: brRank.points,
          wins: brRank.wins,
          gamesPlayed: brRank.gamesPlayed,
          rankInfo,
        },
        showdownRank: {
          points: showdownRankRecord.points,
          wins: showdownRankRecord.wins,
          gamesPlayed: showdownRankRecord.gamesPlayed,
          rankInfo: showdownRankInfo,
        },
      },
      achievements: achievementsDTO,
      userAchievements: userAchievementsDTO,
      battleRoyaleHistory: brHistory,
      showdownHistory,
      dailyHistory,
      themeProgress,
      globalStats: {
        totalQuestions,
        correctQuestions,
        accuracy: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0,
        currentStreak,
        totalPvPMatches: brRank.gamesPlayed + showdownRankRecord.gamesPlayed,
        totalPvPWins: brRank.wins + showdownRankRecord.wins,
        pvpWinRate:
          brRank.gamesPlayed + showdownRankRecord.gamesPlayed > 0
            ? Math.round(
                ((brRank.wins + showdownRankRecord.wins) /
                  (brRank.gamesPlayed + showdownRankRecord.gamesPlayed)) *
                  100,
              )
            : 0,
        achievementsUnlocked: userAchievements.length,
        totalAchievements: allAchievements.length,
      },
    };
  }

  private slugify(str: string) {
    str = str.replace(/^\s+|\s+$/g, ""); // trim leading/trailing white space
    str = str.toLowerCase(); // convert string to lowercase
    str = str
      .replace(/[^a-z0-9 -]/g, "") // remove any non-alphanumeric characters
      .replace(/\s+/g, "_") // replace spaces with hyphens
      .replace(/-+/g, "_"); // remove consecutive hyphens
    return str;
  }
}

export const userService = new UserService();
