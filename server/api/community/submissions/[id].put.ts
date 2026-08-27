import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import type { CreateSubmissionPayload } from "#shared/DTO/questionSubmissionDTO";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const idParam = getRouterParam(event, "id");
  const submissionId = parseInt(idParam || "", 10);

  if (isNaN(submissionId)) {
    throw createError({ statusCode: 400, statusMessage: "ID de soumission invalide." });
  }

  const body = await readBody<CreateSubmissionPayload>(event);
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "Données de formulaire requises." });
  }

  return await questionSubmissionService.updateSubmission(submissionId, userConnected.id, body);
});
