import { getAuthenticatedUser } from "~~/server/utils/auth";
import prisma from "~~/server/utils/prisma";
import { notificationStreamManager } from "~~/server/utils/notificationStreamManager";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createDate: "desc" },
    take: 50,
  });

  const resolvedNotifications = [];

  for (const notif of notifications) {
    const status = await notificationStreamManager.resolveNotificationStatus(notif);
    resolvedNotifications.push({
      ...notif,
      status,
    });
  }

  return resolvedNotifications;
});
