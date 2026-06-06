import { userService } from "~~/server/services/UserService";

export default defineEventHandler((event) => {
  const userConnected = event.context.user;
  if (userConnected == null) return null;
  return userService.getCurrentUser(userConnected.id, userConnected.email);
});
