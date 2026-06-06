import { questionService } from "~~/server/services/QuestionService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);
  const query = getQuery(event);
  await questionService.softDelete(parseInt(query.id as string, 10));
});
