import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);
  const { matchId, isReady } = body;

  if (!matchId || isReady === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "matchId et isReady sont requis.",
    });
  }

  battleRoyaleManager.setPlayerReady(matchId, userConnected.id, Boolean(isReady));

  return {
    success: true,
  };
});
