import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected?.id) return;

  const ascentSeriesCount = await prisma.questionSeriesResponse.count({
    where: {
      userId: userConnected.id,
      seriesType: "ascent",
    },
  });
  const ascentsAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "ascent",
    ascentSeriesCount
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
    ascentMaxScore[0].result?.toNumber()
  );

  return [...ascentsAchievement, ...ascentsMaxScoreAchievement];
});
