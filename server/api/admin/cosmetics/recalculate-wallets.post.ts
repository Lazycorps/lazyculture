import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { recalculateWalletsFromXp } from "~~/server/utils/walletHelper";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  return recalculateWalletsFromXp();
});
