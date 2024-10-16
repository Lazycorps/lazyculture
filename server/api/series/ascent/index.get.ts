import { QuestionSeries } from "../../../../.nuxt/components";
import { Prisma } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesData,
  QuestionSeriesDTO,
  QuestionSeriesResponseDTO,
  UserSeriesDTO,
} from "~/models/series";
import { QuestionSeriesAscensionResponseData } from "~/models/series/seriesAscension";
import { User } from "@supabase/auth-js";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;
  const userSeriesDTO = {} as UserSeriesDTO;
  let lastUserAscent = await getLastUserAscent(userConnected);
  if (lastUserAscent) {
    const lastUserAscentData =
      lastUserAscent.data as QuestionSeriesAscensionResponseData;
    if (!lastUserAscentData.ended) {
      userSeriesDTO.series = lastUserAscent.series as QuestionSeriesDTO;
      userSeriesDTO.userResponse =
        lastUserAscent as any as QuestionSeriesResponseDTO;
    } else {
      var { nextUserAscentSeries, nextAscentId } =
        await getNextUserAscentSeries(
          lastUserAscent.series.data as any as QuestionSeriesData
        );
      if (nextUserAscentSeries) {
        userSeriesDTO.series = nextUserAscentSeries as any as QuestionSeriesDTO;
      } else {
        userSeriesDTO.series = await generateNewAscentSeries(nextAscentId);
      }
    }
  } else {
    var firstAscentSeries = await getFirstAscentSeries();
    if (firstAscentSeries)
      userSeriesDTO.series = firstAscentSeries as QuestionSeriesDTO;
    else userSeriesDTO.series = await generateNewAscentSeries(1);
  }

  return userSeriesDTO;
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
  const previousSeries = await prisma.questionSeries.findMany({
    orderBy: { id: "desc" },
    take: 10,
  });

  // Continuer à générer des IDs jusqu'à ce qu'on en ait 10 uniques et existants
  while (uniqueIds.size < 100) {
    const randomId = getRandomId(minId!, maxId!);
    if (await isQuestionExists(randomId)) {
      uniqueIds.add(randomId); // Ajouter seulement si l'ID existe
    }
  }

  return Array.from(uniqueIds);
}

async function generateNewAscentSeries(seriesId: number) {
  const questionsIds = await getRandomQuestionsIds();
  const newSeries: Prisma.QuestionSeriesCreateInput = {
    date: new Date(),
    difficulty: 1,
    title: `Ascension ${seriesId}`,
    type: "ascent",
    userCreate: "Auto",
    userUpdate: "Auto",
    data: {
      id: seriesId,
      questionsIds,
      healthPoint: 2,
      seriesType: "ascent",
    },
  };
  return (await prisma.questionSeries.create({
    data: newSeries,
  })) as any as QuestionSeriesDTO;
}

async function getNextUserAscentSeries(
  lastUserAscentSeries: QuestionSeriesData
) {
  const nextAscentId = lastUserAscentSeries.id + 1;
  let nextUserAscentSeries = await prisma.questionSeries.findFirst({
    where: {
      type: "ascent",
      data: {
        path: ["id"],
        equals: nextAscentId,
      },
    },
  });
  return { nextUserAscentSeries, nextAscentId };
}

async function getLastUserAscent(userConnected: User) {
  return await prisma.questionSeriesResponse.findFirst({
    where: {
      userId: userConnected.id,
      data: {
        path: ["seriesType"],
        equals: "ascent",
      },
    },
    orderBy: {
      id: "desc",
    },
    take: 1,
    include: {
      series: true,
    },
  });
}
async function getFirstAscentSeries() {
  let firstAscentSeries = await prisma.questionSeries.findFirst({
    where: {
      type: "ascent",
    },
    orderBy: { id: "asc" },
    take: 1,
  });
  return firstAscentSeries;
}
