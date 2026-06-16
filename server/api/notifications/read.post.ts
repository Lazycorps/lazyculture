import { getAuthenticatedUser } from "~~/server/utils/auth";
import prisma from "~~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);

  const body = await readBody<{ id?: string }>(event).catch(() => null);
  const notifId = body?.id;

  if (notifId) {
    // Marquer une notification spécifique comme lue
    await prisma.notification.updateMany({
      where: {
        id: notifId,
        userId: user.id,
      },
      data: {
        read: true,
      },
    });
  } else {
    // Tout marquer comme lu
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }

  return { success: true };
});
