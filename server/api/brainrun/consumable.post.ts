import type { BrainrunConsumableUseDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunConsumableUseDTO>(event);
  return brainrunService.useConsumable(body.runId, body.type, userConnected.id);
});
