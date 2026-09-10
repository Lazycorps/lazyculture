import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import { validateUsername } from "#shared/user";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);
  const username = body?.username;

  const validation = validateUsername(username);
  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error,
    });
  }

  return userService.setUsername(userConnected.id, userConnected.email, validation.trimmed);
});
