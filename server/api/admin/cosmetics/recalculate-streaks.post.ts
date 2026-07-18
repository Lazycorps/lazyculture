import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";
import { recalculateStreaksFromResponses } from "~~/server/utils/walletHelper";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  return recalculateStreaksFromResponses();
});
