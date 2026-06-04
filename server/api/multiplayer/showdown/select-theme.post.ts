import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event).catch(() => ({}));

  const matchId = body?.matchId as string;
  const themeSlug = body?.themeSlug as string;

  if (!matchId || !themeSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Les paramètres matchId et themeSlug sont requis.",
    });
  }

  const success = showdownManager.selectTheme(matchId, userConnected.id, themeSlug);

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Sélection du thème impossible (ce n'est pas votre tour ou le thème a déjà été choisi).",
    });
  }

  return { success: true };
});
