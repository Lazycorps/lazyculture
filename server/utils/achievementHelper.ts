import { UserAchievementDTO } from "#shared/DTO/achievementDTO";
import prisma from "~~/server/utils/prisma";
import { updateUserProgress } from "./userProgressHelper";
import { coinsFromXp, grantCoins } from "./walletHelper";

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
  | "changePseudo"
  | "brGames"
  | "brWins"
  | "showdownGames"
  | "showdownWins"
  | "brainrunGames"
  | "brainrunWins"
  | "brainrunMaxFloor"
  | "brainrunMaxHp"
  | "brainrunElitesDefeated"
  | "brainrunBossesDefeated"
  | "brainrunAllRelicsDiscovered"
  | "brainrunAllConsumablesDiscovered"
  | "brainrunTalentsUnlocked"
  | "brainrunAllTalentsUnlocked"
  | "brainrunRunCorrect"
  | "brainrunRunStreak"
  | "brainrunRunGold"
  | "brainrunFlawlessWin"
  | "brainrunLowHpWin"
  | "brainrunNoRestWin"
  | "brainrunReviveWin"
  | "brPerfectWin"
  | "brClutchWin"
  | "brRounds"
  | "brRankPoints"
  | "brStreak"
  | "speedrunGames"
  | "speedrunSurvivalMaxScore"
  | "speedrunSprintBestTime";

export async function checkAndAwardAchievements(
  userId: string,
  action: ActionType,
  actionValue: number,
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
    if (!userHasAchievement && checkAchievementCondition(achievement, action, actionValue)) {
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
        coinsEarned: coinsFromXp(achievement.xpEarned),
        icon: achievement.icon,
      });
    }
  }

  let xpEarned = 0;
  let coinsGranted = 0;
  newAchievements.forEach((a) => {
    xpEarned += a.xpEarned;
    coinsGranted += a.coinsEarned;
  });
  await updateUserProgress(userId, xpEarned);
  if (coinsGranted > 0) {
    await grantCoins(userId, coinsGranted);
  }

  return newAchievements;
}

function checkAchievementCondition(
  achievement: any,
  action: ActionType,
  actionValue: number,
): boolean {
  if (achievement.conditionType !== action) return false;
  if (action === "speedrunSprintBestTime") {
    // A lower time is better, so actionValue (final time) must be <= target conditionValue
    return actionValue <= achievement.conditionValue;
  }
  return actionValue >= achievement.conditionValue;
}
