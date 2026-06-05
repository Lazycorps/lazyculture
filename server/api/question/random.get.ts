import { questionService } from "~/server/services/QuestionService";

export default defineEventHandler((event) => {
  const userConnected = event.context.user;
  const query = getQuery(event);
  return questionService.getRandom(query.theme as string, userConnected?.id);
});
