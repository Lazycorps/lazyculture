import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  // 1. Authentification et vérification des droits Admin
  const userConnected = getAuthenticatedUser(event);
  const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
  if (!user?.admin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Vous n'avez pas les droits pour réaliser cette opération.",
    });
  }

  // 2. Récupérer et grouper les statistiques de réponses par question et succès
  const stats = await prisma.questionResponse.groupBy({
    by: ["questionId", "success"],
    _count: {
      _all: true,
    },
  });

  // Associer les stats par questionId : { correct: number, total: number }
  const questionStats: Record<number, { correct: number; total: number }> = {};
  for (const item of stats) {
    if (!questionStats[item.questionId]) {
      questionStats[item.questionId] = { correct: 0, total: 0 };
    }
    const current = questionStats[item.questionId]!;
    if (item.success) {
      current.correct += item._count._all;
    }
    current.total += item._count._all;
  }

  // 3. Récupérer toutes les questions non supprimées
  const questions = await prisma.question.findMany({
    where: { deleted: false },
  });

  let updatedCount = 0;
  const MIN_RESPONSES = 3; // Minimum de réponses requis pour recalculer

  for (const question of questions) {
    const stat = questionStats[question.id];
    if (!stat || stat.total < MIN_RESPONSES) {
      continue; // Pas assez de réponses, on garde la difficulté existante
    }

    const successRate = (stat.correct / stat.total) * 100;
    let newDifficulty = question.difficulty;

    // Détermination de la difficulté selon les taux de succès
    if (successRate >= 80) {
      newDifficulty = 1; // Débutant
    } else if (successRate >= 60) {
      newDifficulty = 2; // Confirmé
    } else if (successRate >= 40) {
      newDifficulty = 3; // Expert
    } else if (successRate >= 20) {
      newDifficulty = 4; // Diabolique
    } else {
      newDifficulty = 5; // Impossible / Diabolique
    }

    if (newDifficulty !== question.difficulty) {
      const updatedData = question.data
        ? {
            ...(question.data as any),
            difficulty: newDifficulty,
          }
        : null;

      await prisma.question.update({
        where: { id: question.id },
        data: {
          difficulty: newDifficulty,
          ...(updatedData && { data: updatedData }),
        },
      });

      updatedCount++;
    }
  }

  return {
    success: true,
    updatedCount,
  };
});
