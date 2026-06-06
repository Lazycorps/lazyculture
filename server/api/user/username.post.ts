import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);
  return userService.setUsername(userConnected.id, userConnected.email, body.username);
});
