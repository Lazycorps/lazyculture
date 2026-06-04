import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event).catch(() => ({}));

  const matchId = body?.matchId as string;
  const propositionId = body?.propositionId;

  if (!matchId || propositionId === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "Les paramètres matchId et propositionId sont requis.",
    });
  }

  const result = showdownManager.submitAnswer(matchId, userConnected.id, Number(propositionId));

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.message,
    });
  }

  return result;
});
