import prisma from "~/lib/prisma";
import { getRankFromPoints } from "~/server/utils/rankHelper";

export default defineEventHandler(async (event) => {
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
});
