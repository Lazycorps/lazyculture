import type { BrainrunChoiceDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunChoiceDTO>(event);
  return brainrunService.chooseOption(body.runId, body.choice, userConnected.id);
});
