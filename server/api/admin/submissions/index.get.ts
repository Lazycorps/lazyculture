import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  await assertAdmin(user.id);

  const query = getQuery(event);
  const status = typeof query.status === "string" ? query.status : undefined;

  return await questionSubmissionService.getAllForAdmin(status);
});
