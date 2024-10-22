import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import { UserAchievementDTO } from "~/models/DTO/achievementDTO";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected?.id) return;

  const dailySeriesCount = await prisma.questionSeriesResponse.count({
    where: {
      userId: userConnected.id,
      seriesType: "daily",
    },
  });
  const dailySeriesAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "dailySeries",
    dailySeriesCount
  );

  const dailySeriesStreak = await checkDailySeriesStreak(userConnected.id);

  return [...dailySeriesAchievement, ...dailySeriesStreak];
});

async function checkDailySeriesStreak(
  userId: string
): Promise<UserAchievementDTO[]> {
  const seriesList = await prisma.questionSeries.findMany({
    orderBy: { createDate: "desc" },
    take: 360,
    select: {
      id: true,
    },
  });
  const userSeries = await prisma.questionSeriesResponse.findMany({
    where: { userId, seriesType: "daily" },
    orderBy: { createDate: "desc" },
    take: 360,
    select: {
      id: true,
      seriesId: true,
    },
  });

  let currentStreak = 0;

  for (const series of seriesList) {
    if (userSeries.some((us) => us.seriesId == series.id)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return await checkAndAwardAchievements(
    userId,
    "dailySeriesStreak",
    currentStreak
  );
}
