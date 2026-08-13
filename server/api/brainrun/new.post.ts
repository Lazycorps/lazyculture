import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import type { BrainrunNewRunDTO } from "#shared/DTO/brainrunResponseDTO";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  // Corps optionnel : une requête sans payload démarre une run standard (Érudition 0). Le niveau
  // demandé est de toute façon re-borné au niveau débloqué côté service.
  const body = await readBody<BrainrunNewRunDTO | undefined>(event).catch(() => undefined);
  return brainrunService.startNewRun(userConnected.id, body?.erudition ?? 0);
});
