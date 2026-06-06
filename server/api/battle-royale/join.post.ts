import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Récupérer le pseudo et le niveau de l'utilisateur
  const { name, level } = await battleRoyaleManager.getPlayerInfo(userConnected.id);

  // 2. Récupérer, créer ou rejoindre un match en attente
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

  // 3. Ajouter le joueur
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
