import { Prisma, PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesDTO,
  QuestionSeriesResponseData,
  QuestionSeriesResponseDTO,
  UserSeriesDTO,
} from "~/models/series";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);

  const today = new Date().toJSON().slice(0, 10);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;

  let currentDailySeries = await prisma.questionSeries.findFirst({
    where: { date: new Date(today) },
  });

  if (!currentDailySeries) {
    let dailyNumber = await prisma.questionSeries.count({
      where: { type: "daily" },
    });
    dailyNumber++;
    const questionsIds = await getRandomQuestionsIds();
    const newSeries: Prisma.QuestionSeriesCreateInput = {
      date: new Date(today),
      difficulty: 1,
      title: `Daily ${dailyNumber}`,
      type: "daily",
      userCreate: "Auto",
      userUpdate: "Auto",
      data: {
        id: dailyNumber,
        questionsIds,
      },
    };
    currentDailySeries = await prisma.questionSeries.create({
      data: newSeries,
    });
  }

  const userResponse = await prisma.questionSeriesResponse.findFirst({
    where: { seriesId: currentDailySeries.id, userId: userConnected.id },
  });

  return {
    series: currentDailySeries as unknown as QuestionSeriesDTO,
    userResponse:
      (userResponse as unknown as QuestionSeriesResponseDTO) ?? null,
  } as UserSeriesDTO;
});

/**
 * Récupère l'ID minimum et maximum des questions dans la base de données.
 */
async function getMinMaxId() {
  const result = await prisma.question.aggregate({
    _max: { id: true },
    _min: { id: true },
  });

  return { minId: result._min.id, maxId: result._max.id };
}

/**
 * Génère un ID aléatoire compris entre minId et maxId.
 * @param minId - L'ID minimum possible.
 * @param maxId - L'ID maximum possible.
 * @returns Un ID aléatoire.
 */
function getRandomId(minId: number, maxId: number): number {
  return Math.floor(Math.random() * (maxId - minId + 1) + minId);
}

/**
 * Vérifie si une question existe avec l'ID donné.
 * @param id - L'ID de la question à vérifier.
 * @returns True si la question existe, sinon False.
 */
async function isQuestionExists(id: number): Promise<boolean> {
  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true },
  });
  return question !== null;
}

/**
 * Récupère 10 questions aléatoires uniques existantes dans la base de données.
 * @returns Un tableau de 10 questions uniques.
 */
async function getRandomQuestionsIds() {
  const { minId, maxId } = await getMinMaxId();
  const uniqueIds = new Set<number>();

  // Continuer à générer des IDs jusqu'à ce qu'on en ait 10 uniques et existants
  while (uniqueIds.size < 10) {
    const randomId = getRandomId(minId!, maxId!);
    if (await isQuestionExists(randomId)) {
      uniqueIds.add(randomId); // Ajouter seulement si l'ID existe
    }
  }

  return Array.from(uniqueIds);
}
