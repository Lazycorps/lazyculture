import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const query = getQuery(event);
  const themeSlug = query.themeSlug as string;

  if (!themeSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le slug du thème est requis.",
    });
  }

  const questions = await prisma.question.findMany({
    where: {
      deleted: false,
      data: {
        path: ["theme"],
        array_contains: themeSlug,
      },
    },
    select: {
      id: true,
      difficulty: true,
      data: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  return questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    libelle: (q.data as any)?.libelle || `Question #${q.id}`,
  }));
});
