import { questionService, sanitizeQuestionForClient } from "~~/server/services/QuestionService";

export default defineEventHandler(async (event) => {
  const userConnected = event.context.user;
  const query = getQuery(event);
  const question = await questionService.getRandom(query.theme as string, userConnected?.id);
  return sanitizeQuestionForClient(question);
});
