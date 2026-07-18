import { getAuthenticatedUser } from "~~/server/utils/auth";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  if (!userConnected.id) {
    throw createError({ statusCode: 401, statusMessage: "Non connecté" });
  }

  const body = await readBody<{ catchUp?: boolean }>(event).catch(() => null);
  const catchUp = body?.catchUp === true;

  return await dailyRewardService.claimDailyLoginReward(userConnected.id, catchUp);
});
