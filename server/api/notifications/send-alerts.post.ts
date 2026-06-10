import webpush from "web-push";
import prisma from "~~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const publicKey = config.public.vapidPublicKey;
  const privateKey = config.vapidPrivateKey;

  if (!publicKey || !privateKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "VAPID keys are not configured on the server.",
    });
  }

  // Configurer web-push
  webpush.setVapidDetails("mailto:admin@lazyculture.fr", publicKey as string, privateKey as string);

  // Authentification
  const authHeader = getHeader(event, "Authorization");
  const query = getQuery(event);
  const token = authHeader ? authHeader.replace("Bearer ", "") : (query.key as string);
  const serverApiKey = config.apiKey || process.env.NUXT_API_KEY;

  const isAuthenticatedByApiKey = token && token === serverApiKey;
  const currentUser = event.context.user;

  const body = await readBody(event).catch(() => ({}));
  const targetUserId = body?.userId;
  const isTest = body?.testNotification === true;

  let authorized = false;
  let userIdToProcess = targetUserId;

  if (isAuthenticatedByApiKey) {
    authorized = true;
  } else if (currentUser) {
    if (!targetUserId || targetUserId === currentUser.id) {
      authorized = true;
      userIdToProcess = currentUser.id;
    }
  }

  if (!authorized) {
    throw createError({
      statusCode: 401,
      statusMessage: "Non autorisé. Clé API invalide ou non connecté.",
    });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Récupérer aujourd'hui pour les Dailies (UTC selon le standard du projet)
  const todayStrUTC = new Date().toJSON().slice(0, 10);
  const todayDateUTC = new Date(todayStrUTC);

  const currentDailySeries = await prisma.questionSeries.findFirst({
    where: {
      type: "daily",
      date: todayDateUTC,
    },
  });

  // Récupérer les abonnements push
  let subscriptions: any[] = [];
  if (userIdToProcess) {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: userIdToProcess },
    });
  } else {
    subscriptions = await prisma.pushSubscription.findMany({});
  }

  if (subscriptions.length === 0) {
    return {
      success: true,
      message: "Aucun abonnement trouvé.",
      notificationsSent: 0,
    };
  }

  // Regrouper par utilisateur
  const userSubsMap: Record<string, any[]> = {};
  for (const sub of subscriptions) {
    if (!userSubsMap[sub.userId]) {
      userSubsMap[sub.userId] = [];
    }
    userSubsMap[sub.userId]!.push(sub);
  }

  let notificationsSentCount = 0;
  const details = [];

  for (const userId of Object.keys(userSubsMap)) {
    const userSubs = userSubsMap[userId] || [];

    // Si c'est un test, envoyer immédiatement
    if (isTest) {
      const sendResult = await sendPush(
        userSubs,
        "Test de notification 🔔",
        "Félicitations ! Vos notifications push Lazyculture fonctionnent parfaitement. 🎉",
        "/user/profil",
      );
      notificationsSentCount += sendResult.successCount;
      details.push({ userId, type: "test", results: sendResult.results });
      continue;
    }

    // Alerte Daily manquée : n'a pas terminé le défi quotidien d'aujourd'hui
    let dailyIncomplete = true;
    if (currentDailySeries) {
      const dailyResponse = await prisma.questionSeriesResponse.findFirst({
        where: {
          seriesId: currentDailySeries.id,
          userId,
        },
      });
      if (dailyResponse) {
        const responseData = dailyResponse.data as any;
        const seriesData = currentDailySeries.data as any;
        const totalQuestions = seriesData?.questionsIds?.length || 10;
        if (responseData?.responses?.length === totalQuestions) {
          dailyIncomplete = false;
        }
      }
    } else {
      dailyIncomplete = false; // Pas de daily aujourd'hui
    }

    if (dailyIncomplete) {
      const title = "Défi Quotidien disponible 📅";
      const bodyText =
        "Votre défi quotidien vous attend ! Relevez-le maintenant pour booster votre score et gagner de l'XP. 🧠";
      const sendResult = await sendPush(userSubs, title, bodyText, "/series/daily");
      notificationsSentCount += sendResult.successCount;
      details.push({
        userId,
        type: "daily_alert",
        results: sendResult.results,
      });
    }
  }

  return {
    success: true,
    notificationsSent: notificationsSentCount,
    details,
  };

  async function sendPush(subs: any[], title: string, bodyText: string, url: string) {
    let successCount = 0;
    const results = [];

    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title,
          body: bodyText,
          data: { url },
        });

        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        results.push({ endpoint: sub.endpoint, success: true });
      } catch (err: any) {
        console.error(`Erreur d'envoi à l'endpoint : ${sub.endpoint}`);
        console.error(`Statut d'erreur HTTP : ${err.statusCode}`);
        console.error(`Corps de la réponse HTTP : ${err.body}`);
        console.error(
          `VAPID Public Key length: ${publicKey?.length}, Private Key length: ${privateKey?.length}`,
        );

        // Supprimer l'abonnement s'il est expiré ou invalide
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        results.push({
          endpoint: sub.endpoint,
          success: false,
          error: err.message,
        });
      }
    }

    return { successCount, results };
  }
});
