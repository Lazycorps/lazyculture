import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const stats = await questionSubmissionService.getReviewStats(user?.id);
  return {
    count: stats.pendingCount,
    pendingCount: stats.pendingCount,
    validatedCount: stats.validatedCount,
  };
});
