import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const targetUserId = getRouterParam(event, "id");
  if (!targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant utilisateur manquant",
    });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "Utilisateur non trouvé",
    });
  }

  // Empêcher l'administrateur connecté de se retirer ses propres droits admin
  if (targetUserId === userConnected.id && targetUser.admin) {
    throw createError({
      statusCode: 400,
      statusMessage: "Vous ne pouvez pas révoquer vos propres droits d'administrateur.",
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      admin: !targetUser.admin,
      updateDate: new Date(),
    },
    select: {
      id: true,
      name: true,
      admin: true,
    },
  });

  return {
    success: true,
    user: updatedUser,
  };
});
