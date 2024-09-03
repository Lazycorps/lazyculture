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
  const responses = await prisma.questionResponse.findMany({
    include: {
      question: true, // Inclure les questions pour accéder au champ JSON 'data'
    },
    where: {
      question: {
        data: {
          path: ["theme"],
          array_contains: query.theme as string,
        },
      },
      userId: userConnected?.id,
      success: true,
    },
    distinct: ["questionId"],
  });

  return { questionCount, responseCount: responses.length };
});
