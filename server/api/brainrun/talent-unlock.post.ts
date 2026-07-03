import type { BrainrunTalentUnlockDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunTalentUnlockDTO>(event);
  return brainrunService.unlockTalent(userConnected.id, body.talentId);
});
