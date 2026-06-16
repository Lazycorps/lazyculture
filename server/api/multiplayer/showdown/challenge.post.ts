import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import { showdownManager } from "~~/server/utils/showdownManager";
import { sendPushToUser } from "~~/server/utils/pushNotification";
import { followService } from "~~/server/services/FollowService";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const body = await readBody<{ targetUserId?: string }>(event).catch(
    () => ({}) as { targetUserId?: string },
  );
  const targetUserId = body?.targetUserId;

  if (!targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant du joueur à défier requis",
    });
  }

  if (targetUserId === userConnected.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Vous ne pouvez pas vous défier vous-même",
    });
  }

  // Anti-spam : seuls les joueurs suivis peuvent être défiés
  const isFollowing = await followService.isFollowing(userConnected.id, targetUserId);
  if (!isFollowing) {
    throw createError({
      statusCode: 403,
      statusMessage: "Vous devez suivre ce joueur pour le défier.",
    });
  }

  const challenger = await prisma.user.findUnique({
    where: { id: userConnected.id },
    select: { name: true },
  });
  const challengerName = challenger?.name || "Un joueur";

  const result = await showdownManager.createChallenge(
    { id: userConnected.id, name: challengerName },
    targetUserId,
  );

  if (!result.ok) {
    const messages: Record<string, string> = {
      challenger_busy: "Vous avez déjà une partie en cours.",
      target_busy: "Ce joueur est déjà en partie.",
      already_pending: "Vous avez déjà un défi en attente contre ce joueur.",
    };
    throw createError({
      statusCode: 409,
      statusMessage: messages[result.reason] || "Impossible de créer le défi.",
    });
  }

  // Notifier la cible (best-effort)
  sendPushToUser(targetUserId, {
    title: "Défi Showdown ⚔️",
    body: `${challengerName} te provoque en duel !`,
    url: `/series/showdown?challenge=${result.challengeId}`,
    metadata: {
      type: "showdown_challenge",
      challengeId: result.challengeId,
    },
  }).catch((e) => console.error("Erreur push défi:", e));

  return { challengeId: result.challengeId };
});
