import { achievementService } from "~~/server/services/AchievementService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const userConnected = getAuthenticatedUser(event);
  return achievementService.checkBattleRoyaleAchievements(userConnected.id);
});
