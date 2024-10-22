import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  const query = getQuery(event);
  const isNotRandom = query.theme != "random";
  const questionCount = await prisma.question.count({
    where: {
      deleted: false,
      ...(isNotRandom && {
        data: {
          path: ["theme"],
          array_contains: query.theme as string,
        },
      }),
    },
  });

  // Étape 1 : Récupérer toutes les réponses avec leurs questions associées
  let responseCount = 0;
  let mastery = 0;
  if (userConnected != null) {
    const responses = await getAllSuccessResponses(
      userConnected?.id,
      query.theme as string
    );
    const lastResponse = await getLastResponses(
      userConnected?.id,
      query.theme as string,
      isNotRandom ? 50 : 1000
    );
    responseCount = responses.length;
    const goodResponseCount = lastResponse.filter((r) => r.success).length;
    mastery =
      lastResponse.length > 20
        ? (goodResponseCount / lastResponse.length) * 10
        : 0;
  }

  return { questionCount, responseCount, mastery };
});

async function getAllSuccessResponses(userConnected: string, theme: string) {
  const isNotRandom = theme != "random";
  return await prisma.questionResponse.findMany({
    include: {
      question: true, // Inclure les questions pour accéder au champ JSON 'data'
    },
    where: {
      question: {
        deleted: false
      },
      ...(isNotRandom && {
        question: {
          deleted: false,
          data: {
            path: ["theme"],
            array_contains: theme as string,
          },
        },
      }),
      userId: userConnected,
      success: true,
    },
    distinct: ["questionId"],
  });
}
async function getLastResponses(
  userConnected: string,
  theme: string,
  take: number
) {
  const isNotRandom = theme != "random";
  return await prisma.questionResponse.findMany({
    include: {
      question: true, // Inclure les questions pour accéder au champ JSON 'data'
    },
    where: {
      ...(isNotRandom && {
        question: {
          deleted: false,
          data: {
            path: ["theme"],
            array_contains: theme as string,
          },
        },
      }),
      userId: userConnected,
    },
    orderBy: [{ date: "desc" }],
    take,
  });
}
