import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant utilisateur manquant." });
  }

  return await questionSubmissionService.getContributorTrustScore(userId);
});
