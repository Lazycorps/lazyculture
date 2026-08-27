import { getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  return await questionSubmissionService.getNextForReview(user.id);
});
