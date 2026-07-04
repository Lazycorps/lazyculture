import { questionService, sanitizeQuestionForClient } from "~~/server/services/QuestionService";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  if (!query.id) return;
  const question = await questionService.getById(+query.id);
  return sanitizeQuestionForClient(question);
});
