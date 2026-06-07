import { learningPathService } from "~~/server/services/LearningPathService";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const body = await readBody<{ title: string; themeSlug: string }>(event);

  if (!body || !body.title || !body.themeSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le titre et le slug du thème sont requis.",
    });
  }

  return learningPathService.generatePath(body.title, body.themeSlug);
});
