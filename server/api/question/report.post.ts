import type { ReportingDTO } from "#shared/DTO/reportingDTO";
import { questionService } from "~~/server/services/QuestionService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<ReportingDTO>(event);
  await questionService.report(body, userConnected.id);
});
