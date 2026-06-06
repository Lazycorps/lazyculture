import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { responseService } from "~~/server/services/ResponseService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<ResponseDTO>(event);
  return responseService.validateResponse(body, userConnected.id);
});
