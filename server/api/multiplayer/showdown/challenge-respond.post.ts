import { getAuthenticatedUser } from "~~/server/utils/auth";
import { showdownManager } from "~~/server/utils/showdownManager";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const body = await readBody<{ challengeId?: string; accept?: boolean }>(event).catch(
    () => ({}) as { challengeId?: string; accept?: boolean },
  );

  const challengeId = body?.challengeId;
  if (!challengeId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de défi requis",
    });
  }

  const result = await showdownManager.respondChallenge(
    challengeId,
    userConnected.id,
    body?.accept === true,
  );

  if (!result.ok) {
    const messages: Record<string, { statusCode: number; statusMessage: string }> = {
      not_found: { statusCode: 404, statusMessage: "Ce défi n'existe plus ou a expiré." },
      not_target: { statusCode: 403, statusMessage: "Ce défi ne vous est pas destiné." },
      creation_failed: { statusCode: 500, statusMessage: "Impossible de créer la partie." },
    };
    const error = messages[result.reason] || messages.not_found!;
    throw createError(error);
  }

  if (result.accepted) {
    await dailyRewardService.incrementQuestProgress(
      userConnected.id,
      "PLAY_MULTIPLAYER_OR_SOLO",
      1,
    );
    return { accepted: true, matchId: result.matchId };
  }

  return { accepted: false };
});
