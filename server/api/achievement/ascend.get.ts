import prisma from "~/lib/prisma";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const ascentSeriesCount = await prisma.questionSeriesResponse.count({
    where: {
      userId: userConnected.id,
      seriesType: "ascent",
    },
  });
  const ascentsAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "ascent",
    ascentSeriesCount,
  );

  const ascentMaxScore = await prisma.questionSeriesResponse.findMany({
    where: {
      userId: userConnected.id,
      seriesType: "ascent",
    },
    orderBy: {
      result: "desc",
    },
    select: {
      result: true,
    },
    take: 1,
  });
  const ascentsMaxScoreAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "ascentMaxScore",
    ascentMaxScore[0]?.result?.toNumber() ?? 0,
  );

  return [...ascentsAchievement, ...ascentsMaxScoreAchievement];
});
