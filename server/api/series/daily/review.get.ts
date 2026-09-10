import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const query = getQuery(event);
  const seriesId = query.seriesId ? Number(query.seriesId) : undefined;

  return await seriesService.getDailyReview(userConnected.id, seriesId);
});
