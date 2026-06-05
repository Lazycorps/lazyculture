import type { QuestionDataDTO } from "~/models/question";
import { importService } from "~/server/services/ImportService";
import { assertApiKeyOrAdmin } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await assertApiKeyOrAdmin(event);

  const questions = await readBody<QuestionDataDTO[]>(event);
  return importService.importChatGpt(questions);
});
