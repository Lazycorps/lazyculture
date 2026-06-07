import { adventureService } from "~~/server/services/AdventureService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  return adventureService.getPathsAndProgress(userConnected.id);
});
