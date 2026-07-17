import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { responseService } from "~~/server/services/ResponseService";
import { checkRateLimit } from "~~/server/utils/rateLimiter";

export default defineEventHandler(async (event) => {
  const userConnected = event.context.user;

  if (userConnected?.id) {
    const isAllowed = checkRateLimit(userConnected.id, "answer", 12, 0.8);
    if (!isAllowed) {
      throw createError({
        statusCode: 429,
        statusMessage: "Trop de requêtes. Veuillez patienter.",
      });
    }
  }

  const body = await readBody<ResponseDTO>(event);
  return responseService.validateResponse(body, userConnected?.id);
});
