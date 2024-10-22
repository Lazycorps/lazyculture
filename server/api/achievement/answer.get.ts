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
  await checkAndAwardAchievements(
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
  await checkAndAwardAchievements(
    prisma,
    userConnected.id,
    "answerCorret",
    reponseSuccessCount
  );
  const reponseBadCount = await prisma.questionResponse.count({
    where: {
      userId: userConnected.id,
    },
  });
  await checkAndAwardAchievements(
    prisma,
    userConnected.id,
    "answerBad",
    reponseBadCount
  );
});
