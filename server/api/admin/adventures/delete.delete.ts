import { adventureService } from "~~/server/services/AdventureService";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const query = getQuery(event);
  const id = Number(query.id);

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Un identifiant valide d'aventure est requis.",
    });
  }

  return adventureService.deletePath(id);
});
