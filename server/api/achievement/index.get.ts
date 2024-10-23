import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import {
  AchievementDTO,
  UserAchievementDTO,
} from "~/models/DTO/achievementDTO";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected?.id) return;

  const achivements = await prisma.achievement.findMany();
  const userAchievement = await prisma.userAchievement.findMany({
    where: { userId: userConnected.id },
  });

  const achivementsDTO = achivements.map((a) => {
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: "",
      createdAt: "",
      xpEarned: a.xpEarned,
    } as AchievementDTO;
  });

  const userAchivementsDTO = userAchievement.map((a) => {
    return {
      achievementId: a.achievementId,
      userId: a.userId,
    } as UserAchievementDTO;
  });

  return {
    achivements: achivementsDTO,
    userAchievements: userAchivementsDTO,
  };
});
