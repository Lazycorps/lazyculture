import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";
import { battleRoyaleManager } from "~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // Trouver si l'utilisateur est inscrit dans un match en attente ou en cours
  const playerMatch = await prisma.battleRoyalePlayer.findFirst({
    where: {
      userId: userConnected.id,
      match: {
        status: { in: ["WAITING", "PLAYING"] },
      },
    },
    select: {
      matchId: true,
    },
  });

  if (!playerMatch) {
    return { matchId: null };
  }

  // Vérifier si le match existe toujours dans le manager en mémoire active
  const matchInMemory = battleRoyaleManager.getMatch(playerMatch.matchId);
  if (!matchInMemory) {
    return { matchId: null };
  }

  return {
    matchId: playerMatch.matchId,
  };
});
