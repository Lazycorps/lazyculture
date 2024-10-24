import prisma from "~/lib/prisma";
import { UserRankingDTO } from "~/models/DTO/userRankingDTO";

export default defineEventHandler(async (event) => {
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
        topUsersAscent
          ?.filter((user) => user.userId == u.userId)[0]
          ?._max.result?.toNumber() ?? 0,
    });
  });
  return usersRanking;
});
