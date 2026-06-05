import type { QuestionDataDTO } from "~/models/question";
import { importService } from "~/server/services/ImportService";
import { assertAdmin, getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const questions = await readBody<QuestionDataDTO[]>(event);
  return importService.importQuestions(questions);
});
