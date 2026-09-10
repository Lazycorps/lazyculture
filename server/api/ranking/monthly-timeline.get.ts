import { rankingService } from "~~/server/services/RankingService";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  return await rankingService.getMonthlyTimeline(user?.id);
});
