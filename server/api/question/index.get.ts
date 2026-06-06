import { questionService } from "~~/server/services/QuestionService";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  if (!query.id) return;
  return questionService.getById(+query.id);
});
