import type { BrainrunBonusChoiceDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunBonusChoiceDTO>(event);
  return brainrunService.resolveBonus(body.runId, body.pick, userConnected.id);
});
