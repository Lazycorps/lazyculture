import prisma from "~/lib/prisma";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import { UserAchievementDTO } from "~/models/DTO/achievementDTO";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const reponseCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
    },
  });
  const answerAchievement = await checkAndAwardAchievements(
    userConnected.id,
    "answer",
    reponseCount,
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
    reponseSuccessCount,
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
    reponseFailedCount,
  );

  const answerStreak = await checkResponseStreak(userConnected.id);

  return [
    ...answerAchievement,
    ...answerCorrectAchievement,
    ...answerFailedAchievement,
    ...answerStreak,
  ];
});

async function checkResponseStreak(userId: string): Promise<UserAchievementDTO[]> {
  const responses = await prisma.questionResponse.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: {
      success: true,
    },
    take: 100,
  });

  const firstResponse = responses[0];
  if (!firstResponse) return [];
  let currentStreak = 0;
  const isSuccessStreak = firstResponse.success;

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
    currentStreak,
  );
}
