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
  const endpoint = body?.endpoint;

  if (!endpoint) {
    throw createError({
      statusCode: 400,
      statusMessage: "Endpoint manquant.",
    });
  }

  try {
    const deleted = await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: endpoint,
      },
    });

    return { success: true, message: "Abonnement supprimé avec succès.", count: deleted.count };
  } catch (error: any) {
    console.error("Erreur lors de la désinscription aux notifications push :", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur serveur lors de la suppression de l'abonnement.",
    });
  }
});
