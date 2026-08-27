import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const idParam = getRouterParam(event, "id");
  const submissionId = parseInt(idParam || "", 10);

  if (isNaN(submissionId)) {
    throw createError({ statusCode: 400, statusMessage: "ID de soumission invalide." });
  }

  await questionSubmissionService.deleteSubmission(submissionId, userConnected.id);
  return { success: true, message: "Soumission supprimée avec succès." };
});
