import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const userConnected = getAuthenticatedUser(event);
  return seriesService.getDailySeries(userConnected.id);
});
