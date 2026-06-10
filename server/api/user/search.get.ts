import { followService } from "~~/server/services/FollowService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = getAuthenticatedUser(event);

  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q : "";

  return followService.searchUsers(q, user.id);
});
