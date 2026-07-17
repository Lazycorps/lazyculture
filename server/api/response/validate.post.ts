import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { responseService } from "~~/server/services/ResponseService";

export default defineEventHandler(async (event) => {
  const userConnected = event.context.user;
  const body = await readBody<ResponseDTO>(event);
  return responseService.validateResponse(body, userConnected?.id);
});
