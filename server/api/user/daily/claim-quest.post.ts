import { getAuthenticatedUser } from "~~/server/utils/auth";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  if (!userConnected.id) {
    throw createError({ statusCode: 401, statusMessage: "Non connecté" });
  }

  const body = await readBody<{ questId?: number }>(event);
  const questId = body?.questId;
  if (!questId) {
    throw createError({ statusCode: 400, statusMessage: "questId est requis." });
  }

  return await dailyRewardService.claimDailyQuest(userConnected.id, questId);
});
