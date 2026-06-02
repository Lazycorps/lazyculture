import prisma from "~/lib/prisma";
import { checkAndAwardAchievements } from "~/server/utils/achievementHelper";
import { AchievementDTO, UserAchievementDTO } from "~/models/DTO/achievementDTO";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const achivements = await prisma.achievement.findMany();
  const userAchievement = await prisma.userAchievement.findMany({
    where: { userId: userConnected.id },
  });

  const achivementsDTO = achivements.map((a) => {
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      createdAt: "",
      xpEarned: a.xpEarned,
      hidden: a.hidden,
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
