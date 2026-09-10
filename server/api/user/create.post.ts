import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import { validateUsername } from "#shared/user";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event).catch(() => ({}));

  let initialName = "";
  let initialSlug = "";

  const candidateUsername =
    body?.username ||
    userConnected.user_metadata?.lazyculture_username ||
    userConnected.user_metadata?.username;

  if (typeof candidateUsername === "string" && candidateUsername.trim()) {
    const validation = validateUsername(candidateUsername);
    if (validation.valid) {
      const isAvailable = await userService.isUsernameAvailable(
        validation.trimmed,
        userConnected.id,
      );
      if (isAvailable) {
        initialName = validation.trimmed;
        initialSlug = userService.slugify(validation.trimmed);
      }
    }
  }

  const user = await userService.createUserIfMissing(userConnected.id, initialName, initialSlug);

  return {
    id: user.id,
    name: user.name,
    needsPseudo: !user.name || user.name.trim() === "",
  };
});
