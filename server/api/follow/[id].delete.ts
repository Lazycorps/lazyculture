import { followService } from "~~/server/services/FollowService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = getAuthenticatedUser(event);

  const targetId = getRouterParam(event, "id");
  if (!targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant utilisateur requis",
    });
  }

  return followService.unfollow(user.id, targetId);
});
