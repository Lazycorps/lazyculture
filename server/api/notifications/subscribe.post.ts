import prisma from "~~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Non autorisé. Veuillez vous connecter.",
    });
  }

  const body = await readBody(event);
  const subscription = body?.subscription;

  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données d'abonnement invalides.",
    });
  }

  try {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      const updated = await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
      return { success: true, message: "Abonnement mis à jour.", id: updated.id };
    } else {
      const created = await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
      return { success: true, message: "Abonnement créé avec succès.", id: created.id };
    }
  } catch (error: any) {
    console.error("Erreur lors de l'abonnement aux notifications push :", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur serveur lors de l'enregistrement de l'abonnement.",
    });
  }
});
