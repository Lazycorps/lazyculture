import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";
import { battleRoyaleManager } from "~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Récupérer le pseudo de l'utilisateur
  const dbUser = await prisma.user.findUnique({
    where: { id: userConnected.id },
  });
  const name = dbUser?.name || "Joueur";

  // 2. Récupérer le niveau de l'utilisateur
  const progress = await prisma.userProgress.findUnique({
    where: { userId: userConnected.id },
  });
  const level = progress?.levelId || 1;

  // 3. Récupérer, créer ou rejoindre un match en attente
  const body = await readBody(event).catch(() => ({}));
  const action = body?.action || "join_or_create";
  const targetMatchId = body?.matchId;

  let match;

  if (action === "create") {
    match = await battleRoyaleManager.createNewMatch();
  } else if (action === "join" && targetMatchId) {
    match = battleRoyaleManager.getMatch(targetMatchId);
    if (!match || match.status !== "WAITING") {
      throw createError({
        statusCode: 404,
        statusMessage: "Le salon demandé n'existe pas ou a déjà démarré.",
      });
    }
  } else {
    match = await battleRoyaleManager.getOrCreateWaitingMatch();
  }

  // 4. Ajouter le joueur
  const success = await battleRoyaleManager.addPlayerToMatch(
    match.matchId,
    { id: userConnected.id, name },
    level,
  );

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Impossible de rejoindre le salon de jeu.",
    });
  }

  return {
    matchId: match.matchId,
  };
});
