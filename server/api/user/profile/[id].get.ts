import prisma from "~/lib/prisma";
import type { AchievementDTO, UserAchievementDTO } from "~/models/DTO/achievementDTO";
import { getAuthenticatedUser } from "~/server/utils/auth";
import type { QuestionSeriesResponseData } from "~/models/series";
import { getRankFromPoints } from "~/server/utils/rankHelper";

export default defineEventHandler(async (event) => {
  // Vérifier l'authentification de l'utilisateur connecté
  const userConnected = getAuthenticatedUser(event);

  const targetId = getRouterParam(event, "id");
  if (!targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant utilisateur requis",
    });
  }

  // Trouver l'utilisateur ciblé par son ID ou son Slug
  let user = await prisma.user.findFirst({
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

  return {
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
    },
    achievements: achievementsDTO,
    userAchievements: userAchievementsDTO,
    battleRoyaleHistory: brHistory,
    dailyHistory,
  };
});
