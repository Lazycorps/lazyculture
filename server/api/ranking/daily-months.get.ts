import { rankingService } from "~~/server/services/RankingService";

export default defineEventHandler(async () => {
  return await rankingService.getDailyMonths();
});
