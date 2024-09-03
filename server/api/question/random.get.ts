import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  //const userConnected = await serverSupabaseUser(event);
  //console.log(userConnected);
  const query = getQuery(event);
  let randomQuestion: any = null;
  if (query.theme) {
    randomQuestion = await prisma.question.findFirst({
      where: {
        data: {
          path: ["theme"],
          array_contains: query.theme as string,
        },
        Response: {
          none: {
            // Si as de réponse pour ce user
            //userId: userConnected.id,
          },
        },
      },
    });
  }

  if (randomQuestion == null) {
    const q =
      await prisma.$queryRaw`SELECT * FROM "Question" ORDER BY RANDOM() LIMIT 1;`;
    randomQuestion = randomQuestion[0];
  }
  return randomQuestion;
});
