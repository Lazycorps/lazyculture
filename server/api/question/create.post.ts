import { QuestionDTO } from "~/models/question";
import { questionService } from "~/server/services/QuestionService";
import { assertAdmin, getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const admin = await assertAdmin(userConnected.id);
  const question = await readBody<QuestionDTO>(event);
  return questionService.create(question, admin.name);
});
