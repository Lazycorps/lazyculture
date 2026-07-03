import type { BrainrunEventChoiceDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunEventChoiceDTO>(event);
  return brainrunService.resolveEvent(body.runId, body.optionIndex, userConnected.id);
});
