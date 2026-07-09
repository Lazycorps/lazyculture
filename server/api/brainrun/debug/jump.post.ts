import type { BrainrunDebugJumpDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunDebugJumpDTO>(event);
  return brainrunService.debugJumpToNode(body.runId, userConnected.id, {
    act: body.act,
    row: body.row,
    col: body.col,
    roomType: body.roomType,
    forcedCombatId: body.forcedCombatId,
  });
});
