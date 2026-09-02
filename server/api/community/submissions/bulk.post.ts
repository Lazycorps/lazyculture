import { getAuthenticatedUser } from "~~/server/utils/auth";
import { questionSubmissionService } from "~~/server/services/QuestionSubmissionService";
import type { BulkSubmissionRowPayload } from "#shared/DTO/questionSubmissionDTO";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);
  const body = await readBody<{ themeSlug: string; rows: BulkSubmissionRowPayload[] }>(event);

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "Corps de requête manquant." });
  }

  if (typeof body.themeSlug !== "string" || !body.themeSlug.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Le thème de l'import est manquant." });
  }

  if (!Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, statusMessage: "La liste des questions est invalide." });
  }

  return await questionSubmissionService.createSubmissionsBulk(
    user.id,
    body.themeSlug.trim(),
    body.rows,
  );
});
