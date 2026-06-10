import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";
import { sendPushToUser } from "~~/server/utils/pushNotification";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const body = await readBody<{ matchId?: string; friendIds?: string[] }>(event).catch(
    () => ({}) as { matchId?: string; friendIds?: string[] },
  );

  const matchId = body?.matchId;
  if (!matchId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de salon requis",
    });
  }

  const match = battleRoyaleManager.getMatch(matchId);
  if (!match || match.status !== "WAITING") {
    throw createError({
      statusCode: 404,
      statusMessage: "Le salon demandé n'existe pas ou a déjà démarré.",
    });
  }

  if (!match.players.some((p) => p.userId === userConnected.id)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Vous devez être dans le salon pour inviter des amis.",
    });
  }

  // Cibles : uniquement parmi les joueurs que l'inviteur suit (anti-spam)
  const following = await prisma.follow.findMany({
    where: { followerId: userConnected.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const targetIds = (
    body?.friendIds?.length
      ? body.friendIds.filter((id) => followingIds.includes(id))
      : followingIds
  ).filter((id) => !match.players.some((p) => p.userId === id));

  const inviter = await prisma.user.findUnique({
    where: { id: userConnected.id },
    select: { name: true },
  });
  const inviterName = inviter?.name || "Un joueur";

  const results = await Promise.all(
    targetIds.map((targetId) =>
      sendPushToUser(targetId, {
        title: "Invitation Battle Royale ⚔️",
        body: `${inviterName} t'invite à rejoindre son salon !`,
        url: `/series/battle-royale?matchId=${matchId}`,
      }).catch(() => ({ successCount: 0, failureCount: 0 })),
    ),
  );

  return {
    sent: results.filter((r) => r.successCount > 0).length,
    invited: targetIds.length,
  };
});
