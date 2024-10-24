import { User } from "@supabase/auth-js";
import { PrismaClient } from "@prisma/client";
import { UserAchievementDTO } from "~/models/DTO/achievementDTO";
import prisma from "~/lib/prisma";
import { updateUserProgress } from "./userProgressHelper";

type ActionType =
  | "answer"
  | "answerCorrect"
  | "answerCorrectStreak"
  | "answerFailed"
  | "answerFailedStreak"
  | "reachLevel"
  | "completeSeries"
  | "dailySeries"
  | "dailySeriesStreak"
  | "ascent"
  | "ascentMaxScore"
  | "changePseudo";

// Conditions d'achievement
interface AchievementCondition {
  type: ActionType;
  value: number;
}

// Définition d'un achievement avec ses conditions
interface Achievement {
  id: number;
  title: string;
  condition: AchievementCondition;
}

export async function checkAndAwardAchievements(
  userId: string,
  action: ActionType,
  actionValue: number
) {
  // Récupérer tous les achievements
  const achievements = await prisma.achievement.findMany();
  const newAchievements: UserAchievementDTO[] = [];
  for (const achievement of achievements) {
    // Vérifier si l'utilisateur a déjà cet achievement
    const userHasAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
    });

    // Si l'utilisateur n'a pas déjà l'achievement et que les conditions sont remplies
    if (
      !userHasAchievement &&
      checkAchievementCondition(achievement, action, actionValue)
    ) {
      // Attribuer l'achievement à l'utilisateur
      await prisma.userAchievement.create({
        data: {
          userId: userId,
          achievementId: achievement.id,
          unlockedAt: new Date(),
        },
      });
      newAchievements.push({
        createdAt: "",
        achievementId: achievement.id,
        description: achievement.description,
        title: achievement.title,
        userId: userId,
        xpEarned: achievement.xpEarned,
        icon: "",
      });
    }
  }

  let xpEarned = 0;
  newAchievements.forEach((a) => (xpEarned += a.xpEarned));
  await updateUserProgress(userId, xpEarned);

  return newAchievements;
}

// Fonction pour vérifier si les conditions d'un achievement sont remplies
function checkAchievementCondition(
  achievement: any,
  action: ActionType,
  actionValue: number
): boolean {
  return (
    achievement.conditionType === action &&
    actionValue >= achievement.conditionValue
  );
}
