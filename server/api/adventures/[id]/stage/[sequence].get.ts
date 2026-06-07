import { adventureService } from "~~/server/services/AdventureService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const id = Number(event.context.params?.id);
  const sequence = Number(event.context.params?.sequence);

  if (isNaN(id) || isNaN(sequence)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de l'aventure ou de l'étape invalide.",
    });
  }

  return adventureService.getStageQuestions(userConnected.id, id, sequence);
});
