import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler((event) => {
  const userConnected = getAuthenticatedUser(event);

  const matchId = showdownManager.getActiveMatchIdForUser(userConnected.id);

  return { matchId };
});
