import { userService } from "~~/server/services/UserService";
import { validateUsername } from "#shared/user";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const username = query.username;

  if (typeof username !== "string" || !username.trim()) {
    return {
      available: false,
      message: "Le pseudonyme est requis.",
    };
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return {
      available: false,
      message: validation.error,
    };
  }

  // Si l'utilisateur est connecté, on peut exclure son propre ID
  const currentUserId = event.context.user?.id;
  const isAvailable = await userService.isUsernameAvailable(validation.trimmed, currentUserId);

  if (!isAvailable) {
    return {
      available: false,
      message: "Ce pseudonyme est déjà utilisé par un autre joueur.",
    };
  }

  return {
    available: true,
  };
});
