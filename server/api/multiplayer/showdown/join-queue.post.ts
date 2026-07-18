import { getAuthenticatedUser } from "~~/server/utils/auth";
import { showdownManager } from "~~/server/utils/showdownManager";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Récupérer le pseudo et le niveau de l'utilisateur
  const { name, level } = await showdownManager.getPlayerInfo(userConnected.id);

  // 2. Rejoindre la file d'attente
  const result = await showdownManager.joinQueue({ id: userConnected.id, name }, level);
  await dailyRewardService.incrementQuestProgress(userConnected.id, "PLAY_MULTIPLAYER_OR_SOLO", 1);
  return result;
});
