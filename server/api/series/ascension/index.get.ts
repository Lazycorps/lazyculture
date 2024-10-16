import { QuestionSeries } from './../../../../.nuxt/components.d';
import { Prisma, PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesData,
  QuestionSeriesDTO,
  QuestionSeriesResponseDTO,
  UserSeriesDTO,
} from "~/models/series";
import { QuestionSeriesAscensionResponseData } from "~/models/series/seriesAscension";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);

  const today = new Date().toJSON().slice(0, 10);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;

  let lastUserAscent = await prisma.questionSeriesResponse.findFirst({
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

  const userSeriesDTO = {} as UserSeriesDTO;
  //const ascentSeries: Prisma.QuestionSeries
  if (lastUserAscent) {
    const lastUserAscentData =
      lastUserAscent.data as any as QuestionSeriesAscensionResponseData;
    if (!lastUserAscentData.ended) {
      userSeriesDTO.series = lastUserAscent.series as any as QuestionSeriesDTO;
      userSeriesDTO.userResponse =
        lastUserAscent as any as QuestionSeriesResponseDTO;
    } else {
      const lastUserAscentSeries = lastUserAscent.series
        .data as any as QuestionSeriesData;

      const nextAscentId = lastUserAscentSeries.id + 1;
      let nextUserAscentSeries = await prisma.questionSeries.findFirst({
        where: {
          data: {
            path: ["id"],
            equals: nextAscentId,
          },
        },
      });
      if (nextUserAscentSeries) {
        userSeriesDTO.series = nextUserAscentSeries as any as QuestionSeriesDTO;
      } else {
        await generateNewAscentSeries(nextAscentId);
      }
    }
  }

//   let nextUserAscent = await prisma.questionSeries.findFirst({
//     where: {
//       userId: userConnected.id,
//       data: {
//         path: ["ended"],
//         equals: false,
//       },
//     },
//   });

//   const userResponse = await prisma.questionSeriesResponse.findFirst({
//     where: { seriesId: currentDailySeries.id, userId: userConnected.id },
//   });

//   return {
//     series: currentDailySeries as unknown as QuestionSeriesDTO,
//     userResponse:
//       (userResponse as unknown as QuestionSeriesResponseDTO) ?? null,
//   } as UserSeriesDTO;
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

async function generateNewAscentSeries(seriesId: number,) {
  const questionsIds = await getRandomQuestionsIds();
  const newSeries: Prisma.QuestionSeriesCreateInput = {
    date: new Date(),
    difficulty: 1,
    title: `Ascension ${seriesId}`,
    type: "ascension",
    userCreate: "Auto",
    userUpdate: "Auto",
    data: {
      id: seriesId,
      questionsIds,
    },
  };
  return (await prisma.questionSeries.create({
    data: newSeries,
  })) as any as QuestionSeriesDTO;
}
