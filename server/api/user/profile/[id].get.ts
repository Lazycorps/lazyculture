import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  // Route protégée : nécessite un utilisateur authentifié
  getAuthenticatedUser(event);

  const targetId = getRouterParam(event, "id");
  if (!targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant utilisateur requis",
    });
  }

  return userService.getProfile(targetId);
});
