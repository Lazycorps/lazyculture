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
  if(userConnected != null){
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
          // success: true,
        },
        orderBy: [{date:"desc"}],
        distinct: ["questionId"],
      });
    
    responseCount = responses.filter((r) => r.success).length;
    const lastResponse = responses.slice(0, 50);
    const goodResponse = lastResponse.filter(r => r.success).length;
    mastery = lastResponse.length > 20 ? goodResponse / lastResponse.length * 10 : 0;
  }

  return { questionCount, responseCount, mastery };
});
