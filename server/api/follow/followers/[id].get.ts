import { followService } from "~~/server/services/FollowService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const viewer = getAuthenticatedUser(event);

  const targetId = getRouterParam(event, "id");
  if (!targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant utilisateur requis",
    });
  }

  const query = getQuery(event);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return followService.getFollowers(targetId, viewer.id, page, limit);
});
