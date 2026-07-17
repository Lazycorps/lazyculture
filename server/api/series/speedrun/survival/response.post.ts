import type { SeriesResponseDTO } from "#shared/DTO/seriesResponseDTO";
import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<SeriesResponseDTO>(event);
  return await seriesService.submitSpeedrunSurvivalResponse(body, userConnected.id);
});
