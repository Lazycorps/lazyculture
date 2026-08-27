import { getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import type { SubmissionVoteType } from "#shared/DTO/questionSubmissionDTO";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  const body = await readBody<{
    submissionId: number;
    vote: SubmissionVoteType;
    rejectionReason?: string;
  }>(event);

  if (
    !body ||
    typeof body.submissionId !== "number" ||
    !["APPROVE", "REJECT"].includes(body.vote)
  ) {
    throw createError({ statusCode: 400, statusMessage: "Paramètres de vote invalides." });
  }

  return await questionSubmissionService.submitReviewVote(
    user.id,
    body.submissionId,
    body.vote,
    body.rejectionReason,
  );
});
