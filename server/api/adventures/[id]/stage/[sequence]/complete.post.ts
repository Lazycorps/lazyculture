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

  const body = await readBody<{ answers: Record<number, number> }>(event);

  if (!body || !body.answers) {
    throw createError({
      statusCode: 400,
      statusMessage: "Les réponses sont requises pour valider l'étape.",
    });
  }

  return adventureService.completeStage(userConnected.id, id, sequence, body.answers);
});
