import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<{ runId: string }>(event);
  return brainrunService.prepareNextBossQuestion(body.runId, userConnected.id);
});
