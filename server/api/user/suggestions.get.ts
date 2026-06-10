import { followService } from "~~/server/services/FollowService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = getAuthenticatedUser(event);

  return followService.getSuggestions(user.id);
});
