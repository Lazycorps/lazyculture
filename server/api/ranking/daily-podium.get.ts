import { rankingService } from "~~/server/services/RankingService";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const period = query.period as string;
  const monthly = period === "monthly";
  return await rankingService.getDailyPodiumRanking(monthly);
});
