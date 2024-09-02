import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  let randomQuestion: any = null;
  if (query.theme) {
    return await prisma.question.findFirst({
      where: {
        data: {
          path: ["thème"],
          equals: query.theme as string,
        },
        Response: {
          none: {}, // Cela signifie qu'aucune réponse ne doit exister pour cette question
        },
      },
    });
  } else {
    randomQuestion =
      await prisma.$queryRaw`SELECT * FROM "Question" ORDER BY RANDOM() LIMIT 1;`;
    return randomQuestion ? randomQuestion[0] : null;
  }
});
