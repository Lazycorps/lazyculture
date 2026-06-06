import { getAuthenticatedUser } from "~~/server/utils/auth";
import { showdownManager } from "~~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const status = showdownManager.getQueueStatus(userConnected.id);

  return status;
});
