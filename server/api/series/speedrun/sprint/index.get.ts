import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  return await seriesService.getActiveSpeedrunSprint(userConnected.id);
});
