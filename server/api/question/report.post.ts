import type { ReportingDTO } from "#shared/DTO/reportingDTO";
import { questionService } from "~~/server/services/QuestionService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<ReportingDTO>(event);

  // 1. Validation de l'identifiant de la question
  if (
    !body ||
    typeof body.questionId !== "number" ||
    !Number.isInteger(body.questionId) ||
    body.questionId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de question invalide.",
    });
  }

  // 2. Validation du commentaire
  if (body.comment !== undefined && typeof body.comment !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Le commentaire doit être une chaîne de caractères.",
    });
  }

  const comment = body.comment?.trim() || "";

  // Limitation à 1000 caractères pour éviter les abus de stockage de base de données
  if (comment.length > 1000) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le commentaire ne peut pas dépasser 1000 caractères.",
    });
  }

  const safeReporting: ReportingDTO = {
    questionId: body.questionId,
    comment: comment || "Question à vérifier",
  };

  await questionService.report(safeReporting, userConnected.id);
});
