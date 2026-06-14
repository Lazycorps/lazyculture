import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const id = Number(event.context.params?.id);

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de l'aventure invalide.",
    });
  }

  const adventure = await prisma.adventure.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!adventure) {
    throw createError({
      statusCode: 404,
      statusMessage: "Aventure introuvable.",
    });
  }

  // Fetch info for all questions in the stages
  const questionIds = Array.from(new Set(adventure.stages.flatMap((s) => s.questionIds)));

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      difficulty: true,
      data: true,
    },
  });

  const questionsMap = new Map(
    questions.map((q) => [
      q.id,
      {
        id: q.id,
        difficulty: q.difficulty,
        libelle: (q.data as any)?.libelle || `Question #${q.id}`,
      },
    ]),
  );

  const stages = adventure.stages.map((stage) => ({
    id: stage.id,
    sequence: stage.sequence,
    type: stage.type,
    title: stage.title,
    questionIds: stage.questionIds,
    questions: stage.questionIds.map((qId) => questionsMap.get(qId)).filter(Boolean),
  }));

  return {
    id: adventure.id,
    title: adventure.title,
    themeSlug: adventure.themeSlug,
    stages,
  };
});
