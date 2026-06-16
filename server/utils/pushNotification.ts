import webpush from "web-push";
import prisma from "~~/server/utils/prisma";

export interface PushNotificationContent {
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Best-effort : ne lève jamais d'erreur, les abonnements expirés sont purgés.
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotificationContent,
): Promise<{ successCount: number; failureCount: number }> {
  // Enregistrer d'abord en base de données pour la visualisation in-app (best-effort)
  await prisma.notification
    .create({
      data: {
        userId,
        title: notification.title,
        body: notification.body,
        url: notification.url || null,
        metadata: (notification.metadata as any) || null,
      },
    })
    .catch((err) => {
      console.error("Erreur lors de la création de la notification in-app :", err);
    });

  const config = useRuntimeConfig();
  const publicKey = config.public.vapidPublicKey;
  const privateKey = config.vapidPrivateKey;

  if (!publicKey || !privateKey) {
    console.error("Les clés VAPID ne sont pas configurées, notification push ignorée.");
    return { successCount: 0, failureCount: 0 };
  }

  webpush.setVapidDetails("mailto:admin@lazyculture.fr", publicKey as string, privateKey as string);

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  if (subscriptions.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    data: { url: notification.url || "/" },
  });

  let successCount = 0;
  let failureCount = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      );
      successCount++;
    } catch (err: any) {
      failureCount++;
      console.error(`Erreur d'envoi à l'endpoint : ${sub.endpoint}`);
      console.error(`Statut d'erreur HTTP : ${err.statusCode}`);

      // Supprimer l'abonnement s'il est expiré ou invalide
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return { successCount, failureCount };
}
