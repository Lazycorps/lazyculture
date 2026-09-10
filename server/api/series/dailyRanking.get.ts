import { seriesService } from "~~/server/services/SeriesService";
import { isValidDayKey } from "#shared/dailySeason";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const date = typeof query.date === "string" ? query.date : undefined;
  const seriesId = query.seriesId ? Number(query.seriesId) : undefined;

  if (date !== undefined && !isValidDayKey(date)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le paramètre 'date' doit être au format YYYY-MM-DD",
    });
  }

  return await seriesService.getDailyRanking({ date, seriesId });
});
