import { cosmeticService } from "~~/server/services/CosmeticService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);
  return cosmeticService.adminList("avatar");
});
