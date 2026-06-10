import { getAuthenticatedUser } from "~~/server/utils/auth";
import { showdownManager } from "~~/server/utils/showdownManager";

export default defineEventHandler((event) => {
  const userConnected = getAuthenticatedUser(event);

  const query = getQuery(event);
  const challengeId = typeof query.challengeId === "string" ? query.challengeId : "";

  if (!challengeId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de défi requis",
    });
  }

  return showdownManager.getChallengeStatus(challengeId, userConnected.id);
});
