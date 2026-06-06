import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);

  const { matchId, propositionId } = body;

  if (!matchId || propositionId === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "Paramètres matchId et propositionId requis",
    });
  }

  const result = battleRoyaleManager.submitAnswer(matchId, userConnected.id, Number(propositionId));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.message,
    });
  }

  return {
    success: true,
  };
});
