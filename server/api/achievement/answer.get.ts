import { H3Event, EventHandlerRequest } from "h3";
import prisma from "~/lib/prisma";
import { UserRankingDTO } from "~/models/DTO/userRankingDTO";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";

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
    prisma,
    userConnected.id,
    "answer",
    reponseCount
  );
  const reponseSuccessCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
    },
  });
  const answerCorrectAchievement = await checkAndAwardAchievements(
    prisma,
    userConnected.id,
    "answerCorrect",
    reponseSuccessCount
  );
  const reponseBadCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
    },
  });
  const answerBadAchievement = await checkAndAwardAchievements(
    prisma,
    userConnected.id,
    "answerBad",
    reponseBadCount
  );

  return [
    ...answerAchievement,
    ...answerCorrectAchievement,
    ...answerBadAchievement,
  ];
});
