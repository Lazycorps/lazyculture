import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const pathId = Number(event.context.params?.id);

  if (isNaN(pathId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant du parcours invalide.",
    });
  }

  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
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

  if (!path) {
    throw createError({
      statusCode: 404,
      statusMessage: "Parcours d'aventure introuvable.",
    });
  }

  const progress = path.progresses[0];

  return {
    id: path.id,
    title: path.title,
    themeSlug: path.themeSlug,
    stages: path.stages,
    currentStage: progress ? progress.currentStage : 1,
    completed: progress ? progress.completed : false,
    stageScores: progress ? progress.stageScores || {} : {},
  };
});
