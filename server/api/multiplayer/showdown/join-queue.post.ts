import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Récupérer le pseudo et le niveau de l'utilisateur
  const { name, level } = await showdownManager.getPlayerInfo(userConnected.id);

  // 2. Rejoindre la file d'attente
  return showdownManager.joinQueue({ id: userConnected.id, name }, level);
});
