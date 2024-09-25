import { Theme } from "./../../../models/theme";
import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  const query = getQuery(event);

  const questionCount = await prisma.question.count({
    where: {
      data: {
        path: ["theme"],
        array_contains: query.theme as string,
      },
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
      50
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
  return await prisma.questionResponse.findMany({
    include: {
      question: true, // Inclure les questions pour accéder au champ JSON 'data'
    },
    where: {
      question: {
        data: {
          path: ["theme"],
          array_contains: theme as string,
        },
      },
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
  return await prisma.questionResponse.findMany({
    include: {
      question: true, // Inclure les questions pour accéder au champ JSON 'data'
    },
    where: {
      question: {
        data: {
          path: ["theme"],
          array_contains: theme as string,
        },
      },
      userId: userConnected,
    },
    orderBy: [{ date: "desc" }],
    take,
  });
}
