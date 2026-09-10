import { seriesService } from "~~/server/services/SeriesService";
import { getMonthKey, isValidMonthKey } from "#shared/dailySeason";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const month = typeof query.month === "string" ? query.month : getMonthKey();

  if (!isValidMonthKey(month)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le paramètre 'month' doit être au format YYYY-MM",
    });
  }

  const user = event.context.user;
  return await seriesService.getDailyCalendarMonth(month, user?.id);
});
