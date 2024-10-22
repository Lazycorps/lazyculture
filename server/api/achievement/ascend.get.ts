import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected?.id) return;

  const ascendSeriesCount = await prisma.questionSeriesResponse.count({
    where: {
      userId: userConnected.id,
      seriesType: "ascend",
    },
  });
  const ascendsAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "ascend",
    ascendSeriesCount
  );

  const ascendMaxScore = await prisma.questionSeriesResponse.findMany({
    where: {
      userId: userConnected.id,
      seriesType: "ascend",
    },
    orderBy: {
      result: "desc",
    },
    select: {
      result: true,
    },
    take: 1,
  });
  const ascendsMaxScoreAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "ascendMaxScore",
    ascendMaxScore[0].result?.toNumber()
  );

  return [...ascendsAchievement, ...ascendsMaxScoreAchievement];
});
