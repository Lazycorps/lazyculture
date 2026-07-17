import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  getAuthenticatedUser(event);
  return await seriesService.getSpeedrunSurvivalRanking();
});
