import { getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  const body = await readBody<{ submissionId: number; userResponseId: number }>(event);

  if (!body || typeof body.submissionId !== "number" || typeof body.userResponseId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Paramètres de réponse invalides." });
  }

  return await questionSubmissionService.revealForReview(
    user.id,
    body.submissionId,
    body.userResponseId,
  );
});
