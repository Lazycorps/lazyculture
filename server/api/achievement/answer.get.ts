import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import { UserAchievementDTO } from "~/models/DTO/achievementDTO";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected?.id) return;

  const reponseCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
    },
  });
  const answerAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "answer",
    reponseCount
  );
  const reponseSuccessCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
      success: true,
    },
  });
  const answerCorrectAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "answerCorrect",
    reponseSuccessCount
  );
  const reponseFailedCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
      success: false,
    },
  });
  const answerFailedAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "answerFailed",
    reponseFailedCount
  );

  const answerStreak = await checkResponseStreak(userConnected.id);

  return [
    ...answerAchievement,
    ...answerCorrectAchievement,
    ...answerFailedAchievement,
    ...answerStreak,
  ];
});

async function checkResponseStreak(
  userId: string
): Promise<UserAchievementDTO[]> {
  const responses = await prisma.questionResponse.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: {
      success: true,
    },
    take: 100,
  });

  let currentStreak = 0;
  const isSuccessStreak = responses[0].success;

  for (const response of responses) {
    if (response.success === isSuccessStreak) {
      currentStreak++;
    } else {
      break;
    }
  }

  return await checkAndAwardAchievements(
    userId,
    isSuccessStreak ? "answerCorrectStreak" : "answerFailedStreak",
    currentStreak
  );
}
