import { cosmeticService } from "~~/server/services/CosmeticService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler((event) => {
  const userConnected = getAuthenticatedUser(event);
  return cosmeticService.getCatalog(userConnected.id);
});
