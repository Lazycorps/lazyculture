import { getAuthenticatedUser } from "~~/server/utils/auth";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-cache, no-store, must-revalidate");
  const userConnected = getAuthenticatedUser(event);
  if (!userConnected.id) return null;

  return await dailyRewardService.getDailyLoginStatus(userConnected.id);
});
