import prisma from "~/lib/prisma";
import { getShowdownRankFromPoints } from "~/server/utils/showdownRankHelper";

export default defineEventHandler(async () => {
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
});
