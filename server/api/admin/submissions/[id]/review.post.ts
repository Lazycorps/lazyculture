import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import type { QuestionDataDTO } from "#shared/question";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  await assertAdmin(user.id);

  const idParam = getRouterParam(event, "id");
  const submissionId = Number(idParam);
  if (!submissionId || isNaN(submissionId)) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant de soumission invalide." });
  }

  const body = await readBody<{
    action: "APPROVE" | "REJECT";
    editedData?: QuestionDataDTO;
    rejectionReason?: string;
  }>(event);

  if (!body || !["APPROVE", "REJECT"].includes(body.action)) {
    throw createError({ statusCode: 400, statusMessage: "Action de modération invalide." });
  }

  return await questionSubmissionService.adminReview(
    user.id,
    submissionId,
    body.action,
    body.editedData,
    body.rejectionReason,
  );
});
