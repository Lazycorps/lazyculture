import prisma from "~~/server/utils/prisma";
import { UserRankingDTO } from "#shared/DTO/userRankingDTO";
import { getRankFromPoints } from "~~/server/utils/rankHelper";
import { getShowdownRankFromPoints } from "~~/server/utils/showdownRankHelper";

export class RankingService {
  async getTopUsers(): Promise<UserRankingDTO[]> {
    const userProgress = await prisma.userProgress.findMany({
      include: {
        user: true,
      },
      orderBy: [{ xp: "desc" }],
      take: 20,
    });

    const topUsersAscent = await prisma.questionSeriesResponse.groupBy({
      by: ["userId"], // Grouper par utilisateur
      where: {
        userId: { in: userProgress.map((up) => up.userId) },
        seriesType: "ascent",
      },
      _max: {
        result: true, // Prendre le meilleur résultat de chaque utilisateur
      },
      orderBy: {
        _max: {
          result: "desc", // Trier par le meilleur résultat décroissant
        },
      },
      take: 10, // Par exemple, pour récupérer les 10 meilleurs utilisateurs
    });

    const usersRanking: UserRankingDTO[] = [];
    userProgress.forEach((u) => {
      usersRanking.push({
        name: u.user.name,
        userId: u.userId,
        xp: u.xp,
        bestAscent:
          topUsersAscent?.filter((user) => user.userId == u.userId)[0]?._max.result?.toNumber() ??
          0,
      });
    });
    return usersRanking;
  }

  async getBattleRoyaleTop() {
    // Récupérer le Top 20 des joueurs classés par LP décroissants
    const topRankings = await prisma.battleRoyaleRank.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        points: "desc",
      },
      take: 20,
    });

    return topRankings.map((rankRecord) => {
      const rankInfo = getRankFromPoints(rankRecord.points);
      return {
        userId: rankRecord.userId,
        name: rankRecord.user?.name || "Anonyme",
        slug: rankRecord.user?.slug || "",
        points: rankRecord.points,
        wins: rankRecord.wins,
        gamesPlayed: rankRecord.gamesPlayed,
        rankInfo,
      };
    });
  }

  async getShowdownTop() {
    // Récupérer le Top 20 des joueurs classés par LP décroissants en mode Showdown
    const topRankings = await prisma.showdownRank.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        points: "desc",
      },
      take: 20,
    });

    return topRankings.map((rankRecord) => {
      const rankInfo = getShowdownRankFromPoints(rankRecord.points);
      return {
        userId: rankRecord.userId,
        name: rankRecord.user?.name || "Anonyme",
        slug: rankRecord.user?.slug || "",
        points: rankRecord.points,
        wins: rankRecord.wins,
        gamesPlayed: rankRecord.gamesPlayed,
        rankInfo,
      };
    });
  }
}

export const rankingService = new RankingService();
