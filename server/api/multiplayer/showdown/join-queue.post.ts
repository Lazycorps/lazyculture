import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Récupérer les informations de l'utilisateur
  const dbUser = await prisma.user.findUnique({
    where: { id: userConnected.id },
  });
  const name = dbUser?.name || "Joueur";

  const progress = await prisma.userProgress.findUnique({
    where: { userId: userConnected.id },
  });
  const level = progress?.levelId || 1;

  // 2. Rejoindre la file d'attente
  const result = await showdownManager.joinQueue({ id: userConnected.id, name }, level);

  return result;
});
