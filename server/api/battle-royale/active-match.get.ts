import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const matchId = await battleRoyaleManager.getActiveMatchIdForUser(userConnected.id);

  return { matchId };
});
