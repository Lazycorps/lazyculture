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

  const id = Number(event.context.params?.id);

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de l'aventure invalide.",
    });
  }

  const body = await readBody<{
    title: string;
    themeSlug: string;
    stages: StageInput[];
  }>(event);

  if (!body || !body.title || !body.themeSlug || !Array.isArray(body.stages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données de mise à jour invalides.",
    });
  }

  // Update in a transaction to ensure database consistency
  const updatedAdventure = await prisma.$transaction(async (tx) => {
    // 1. Update adventure details
    const adventure = await tx.adventure.update({
      where: { id },
      data: {
        title: body.title,
        themeSlug: body.themeSlug,
        updateDate: new Date(),
      },
    });

    // 2. Delete all existing stages
    await tx.adventureStage.deleteMany({
      where: { adventureId: id },
    });

    // 3. Create new stages
    await tx.adventureStage.createMany({
      data: body.stages.map((stage) => ({
        adventureId: id,
        sequence: stage.sequence,
        type: stage.type,
        title: stage.title,
        questionIds: stage.questionIds,
      })),
    });

    return adventure;
  });

  return { success: true, adventure: updatedAdventure };
});
