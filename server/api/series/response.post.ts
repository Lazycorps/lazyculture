import type { SeriesResponseDTO } from "#shared/DTO/seriesResponseDTO";
import { seriesService } from "~~/server/services/SeriesService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import { checkRateLimit } from "~~/server/utils/rateLimiter";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  if (userConnected.id) {
    const isAllowed = checkRateLimit(userConnected.id, "answer", 12, 0.8);
    if (!isAllowed) {
      throw createError({
        statusCode: 429,
        statusMessage: "Trop de requêtes. Veuillez patienter.",
      });
    }
  }

  const body = await readBody<SeriesResponseDTO>(event);
  return seriesService.submitDailyResponse(body, userConnected.id);
});
