import webpush from "web-push";
import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  // Authentification : réservé aux administrateurs
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const config = useRuntimeConfig();
  const publicKey = config.public.vapidPublicKey;
  const privateKey = config.vapidPrivateKey;

  if (!publicKey || !privateKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Les clés VAPID ne sont pas configurées sur le serveur.",
    });
  }

  webpush.setVapidDetails("mailto:admin@lazyculture.fr", publicKey as string, privateKey as string);

  const body = await readBody<{ title?: string; body?: string; url?: string }>(event).catch(
    () => ({}) as { title?: string; body?: string; url?: string },
  );

  const title = body?.title?.trim();
  const message = body?.body?.trim();
  const url = body?.url?.trim() || "/themes";

  if (!title || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le titre et le contenu de la notification sont requis.",
    });
  }

  // Récupérer tous les abonnements push
  const subscriptions = await prisma.pushSubscription.findMany({});

  if (subscriptions.length === 0) {
    return {
      success: true,
      message: "Aucun abonnement trouvé.",
      notificationsSent: 0,
      recipients: 0,
    };
  }

  const recipients = new Set(subscriptions.map((s) => s.userId)).size;

  const payload = JSON.stringify({
    title,
    body: message,
    data: { url },
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

  return {
    success: true,
    notificationsSent: successCount,
    failureCount,
    recipients,
    totalSubscriptions: subscriptions.length,
  };
});
