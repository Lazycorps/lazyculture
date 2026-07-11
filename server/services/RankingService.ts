import prisma from "~~/server/utils/prisma";
import { UserRankingDTO } from "#shared/DTO/userRankingDTO";
import { DailyPodiumRankingDTO } from "#shared/DTO/dailyPodiumRankingDTO";
import { BrainrunRankingDTO } from "#shared/DTO/brainrunRankingDTO";
import { getRankFromPoints } from "~~/server/utils/rankHelper";
import { getShowdownRankFromPoints } from "~~/server/utils/showdownRankHelper";
import { rankBrainrunPlayers } from "~~/server/utils/brainrunLogic";

export class RankingService {
  async getTopUsers(): Promise<UserRankingDTO[]> {
    const userProgress = await prisma.userProgress.findMany({
      include: {
        user: {
          include: {
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
          },
        },
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
        avatarUrl: u.user.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: u.user.equippedFrame?.styleKey ?? null,
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
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
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
        avatarUrl: rankRecord.user?.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: rankRecord.user?.equippedFrame?.styleKey ?? null,
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
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
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
        avatarUrl: rankRecord.user?.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: rankRecord.user?.equippedFrame?.styleKey ?? null,
      };
    });
  }

  /** Classement Brainrun : Top 20 par étage max atteint (les vainqueurs en tête), départage par
   * nombre de runs. Toute la logique de tri est dans rankBrainrunPlayers (server/utils/brainrunLogic.ts).
   * Exclut les runs de debug et les runs en cours, comme BrainrunService.getRunStats. */
  async getBrainrunTop(): Promise<BrainrunRankingDTO[]> {
    const runs = await prisma.brainrunRun.findMany({
      where: {
        status: { in: ["WON", "LOST", "ABANDONED"] },
        isDebugRun: false,
      },
      select: { userId: true, status: true, currentAct: true, currentRow: true, createDate: true },
    });

    const ranked = rankBrainrunPlayers(runs).slice(0, 20);
    if (ranked.length === 0) return [];

    // Hydrater les infos d'affichage des joueurs classés en une seule requête.
    const users = await prisma.user.findMany({
      where: { id: { in: ranked.map((r) => r.userId) } },
      select: {
        id: true,
        name: true,
        equippedAvatar: { select: { imageUrl: true } },
        equippedFrame: { select: { styleKey: true } },
      },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    return ranked.map((entry) => {
      const user = usersById.get(entry.userId);
      return {
        userId: entry.userId,
        name: user?.name || "Anonyme",
        avatarUrl: user?.equippedAvatar?.imageUrl ?? null,
        frameStyleKey: user?.equippedFrame?.styleKey ?? null,
        bestAct: entry.bestAct,
        bestRow: entry.bestRow,
        isVictory: entry.isVictory,
        victoryCount: entry.victoryCount,
        totalRuns: entry.totalRuns,
      };
    });
  }

  async getDailyPodiumRanking(monthly?: boolean): Promise<DailyPodiumRankingDTO[]> {
    const dateFilter: any = {};
    if (monthly) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      dateFilter.date = { gte: oneMonthAgo };
    }

    // 1. Récupérer toutes les séries daily correspondantes
    const dailySeries = await prisma.questionSeries.findMany({
      where: {
        type: "daily",
        ...dateFilter,
      },
      select: {
        id: true,
      },
    });

    const seriesIds = dailySeries.map((s) => s.id);
    if (seriesIds.length === 0) return [];

    // 2. Récupérer toutes les réponses associées à ces séries
    const responses = await prisma.questionSeriesResponse.findMany({
      where: {
        seriesId: { in: seriesIds },
        seriesType: "daily",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            equippedAvatar: { select: { imageUrl: true } },
            equippedFrame: { select: { styleKey: true } },
          },
        },
      },
    });

    // 3. Grouper les réponses par seriesId
    const responsesBySeries: Record<number, typeof responses> = {};
    for (const resp of responses) {
      let seriesResps = responsesBySeries[resp.seriesId];
      if (!seriesResps) {
        seriesResps = [];
        responsesBySeries[resp.seriesId] = seriesResps;
      }
      seriesResps.push(resp);
    }

    // 4. Calculer les podiums pour chaque série
    const userPodiums: Record<string, DailyPodiumRankingDTO> = {};

    const getOrCreateUserPodium = (
      userId: string,
      user: {
        name: string;
        equippedAvatar: { imageUrl: string } | null;
        equippedFrame: { styleKey: string } | null;
      },
    ): DailyPodiumRankingDTO => {
      if (!userPodiums[userId]) {
        userPodiums[userId] = {
          userId,
          name: user.name || "Anonyme",
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          score: 0,
          avatarUrl: user.equippedAvatar?.imageUrl ?? null,
          frameStyleKey: user.equippedFrame?.styleKey ?? null,
        };
      }
      return userPodiums[userId];
    };

    for (const seriesId of Object.keys(responsesBySeries)) {
      const seriesResponses = responsesBySeries[Number(seriesId)];
      if (!seriesResponses) continue;

      // Filtrer les réponses qui ont un score
      const validResponses = seriesResponses.filter((u) => {
        const data = u.data as any;
        return data && data.score !== undefined && data.score !== null;
      });

      // Trier les réponses par score desc, puis temps asc (updateDate - createDate)
      const sorted = validResponses.sort((a, b) => {
        const aData = a.data as any;
        const bData = b.data as any;
        const aScore = aData?.score ?? 0;
        const bScore = bData?.score ?? 0;

        if (aScore < bScore) return 1;
        if (aScore > bScore) return -1;

        const elapsedA = a.updateDate.getTime() - a.createDate.getTime();
        const elapsedB = b.updateDate.getTime() - b.createDate.getTime();

        if (elapsedA < elapsedB) return -1;
        if (elapsedA > elapsedB) return 1;

        return 0;
      });

      // Distribuer les places de podium (top 3)
      if (sorted[0]) {
        const up = getOrCreateUserPodium(sorted[0].userId, sorted[0].user);
        up.firstPlaces++;
      }
      if (sorted[1]) {
        const up = getOrCreateUserPodium(sorted[1].userId, sorted[1].user);
        up.secondPlaces++;
      }
      if (sorted[2]) {
        const up = getOrCreateUserPodium(sorted[2].userId, sorted[2].user);
        up.thirdPlaces++;
      }
    }

    // 5. Calculer le score et trier la liste finale
    const rankingList = Object.values(userPodiums).map((user) => {
      user.score = user.firstPlaces * 3 + user.secondPlaces * 2 + user.thirdPlaces * 1;
      return user;
    });

    rankingList.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.firstPlaces !== b.firstPlaces) return b.firstPlaces - a.firstPlaces;
      if (a.secondPlaces !== b.secondPlaces) return b.secondPlaces - a.secondPlaces;
      if (a.thirdPlaces !== b.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;
      return a.name.localeCompare(b.name);
    });

    return rankingList;
  }
}

export const rankingService = new RankingService();
