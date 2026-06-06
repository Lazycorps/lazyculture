import { QuestionDTO } from "#shared/question";
import { questionService } from "~~/server/services/QuestionService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);
  const question = await readBody<QuestionDTO>(event);
  return questionService.update(question);
});
