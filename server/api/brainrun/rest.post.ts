import type { BrainrunRestChoiceDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunRestChoiceDTO>(event);
  return brainrunService.resolveRest(body.runId, body.choice, userConnected.id, body.theme);
});
