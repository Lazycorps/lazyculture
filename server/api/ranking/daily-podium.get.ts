import { rankingService } from "~~/server/services/RankingService";
import { getMonthKey, isValidMonthKey } from "#shared/dailySeason";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const period = query.period as string;
  const month = typeof query.month === "string" ? query.month : undefined;

  // `period=monthly` sans `month` explicite → saison en cours ; `period=alltime` → toutes les séries.
  if (month !== undefined && !isValidMonthKey(month)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le paramètre 'month' doit être au format YYYY-MM",
    });
  }

  if (month) return await rankingService.getDailyPodiumRanking(month);
  if (period === "monthly") return await rankingService.getDailyPodiumRanking(getMonthKey());
  return await rankingService.getDailyPodiumRanking();
});
