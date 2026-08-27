import { getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import type { CreateSubmissionPayload } from "#shared/DTO/questionSubmissionDTO";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  const body = await readBody<CreateSubmissionPayload>(event);

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "Corps de requête manquant." });
  }

  return await questionSubmissionService.createSubmission(user.id, body);
});
