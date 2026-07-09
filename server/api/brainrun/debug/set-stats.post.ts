import type { BrainrunDebugSetStatsDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunDebugSetStatsDTO>(event);
  return brainrunService.debugSetStats(body.runId, userConnected.id, {
    healthPoint: body.healthPoint,
    maxHealthPoint: body.maxHealthPoint,
    gold: body.gold,
  });
});
