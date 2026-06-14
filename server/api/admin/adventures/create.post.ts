import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

interface StageInput {
  sequence: number;
  type: string;
  title: string;
  questionIds: number[];
}

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const body = await readBody<{
    title: string;
    themeSlug: string;
    stages: StageInput[];
  }>(event);

  if (!body || !body.title || !body.themeSlug || !Array.isArray(body.stages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données de création invalides.",
    });
  }

  // Create the adventure with stages in a transaction
  const newAdventure = await prisma.adventure.create({
    data: {
      title: body.title,
      themeSlug: body.themeSlug,
      stages: {
        create: body.stages.map((stage) => ({
          sequence: stage.sequence,
          type: stage.type,
          title: stage.title,
          questionIds: stage.questionIds,
        })),
      },
    },
  });

  return { success: true, adventure: newAdventure };
});
