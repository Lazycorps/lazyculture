import { learningPathService } from "~~/server/services/LearningPathService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  return learningPathService.getPathsAndProgress(userConnected.id);
});
