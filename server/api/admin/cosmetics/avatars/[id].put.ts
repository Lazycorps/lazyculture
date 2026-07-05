import { cosmeticService } from "~~/server/services/CosmeticService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { parseAvatarAdminBody } from "~~/server/utils/cosmeticAdminValidation";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant invalide." });
  }

  const body = await readBody(event);
  return cosmeticService.adminUpdateAvatar(id, parseAvatarAdminBody(body));
});
