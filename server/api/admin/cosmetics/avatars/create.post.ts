import { cosmeticService } from "~~/server/services/CosmeticService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { parseAvatarAdminBody } from "~~/server/utils/cosmeticAdminValidation";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const body = await readBody(event);
  return cosmeticService.adminCreateAvatar(parseAvatarAdminBody(body));
});
