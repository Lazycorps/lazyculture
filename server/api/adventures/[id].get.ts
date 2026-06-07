import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const adventureId = Number(event.context.params?.id);

  if (isNaN(adventureId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de l'aventure invalide.",
    });
  }

  const adventure = await prisma.adventure.findUnique({
    where: { id: adventureId },
    include: {
      stages: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          sequence: true,
          type: true,
          title: true,
        },
      },
      progresses: {
        where: { userId: userConnected.id },
      },
    },
  });

  if (!adventure) {
    throw createError({
      statusCode: 404,
      statusMessage: "Aventure introuvable.",
    });
  }

  const progress = adventure.progresses[0];

  return {
    id: adventure.id,
    title: adventure.title,
    themeSlug: adventure.themeSlug,
    stages: adventure.stages,
    currentStage: progress ? progress.currentStage : 1,
    completed: progress ? progress.completed : false,
    stageScores: progress ? progress.stageScores || {} : {},
  };
});
