import { rankingService } from "~~/server/services/RankingService";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const currentYear = new Date().getUTCFullYear();
  const year = query.year ? Number(query.year) : currentYear;

  if (isNaN(year) || year < 2000 || year > 2100) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le paramètre 'year' doit être une année valide",
    });
  }

  const user = event.context.user;
  return await rankingService.getMonthlyCalendarYear(year, user?.id);
});
