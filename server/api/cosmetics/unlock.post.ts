import { cosmeticService } from "~~/server/services/CosmeticService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import type { CosmeticUnlockRequestDTO } from "#shared/DTO/cosmeticDTO";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<CosmeticUnlockRequestDTO>(event);

  if ((body?.type !== "avatar" && body?.type !== "frame") || !Number.isInteger(body.id)) {
    throw createError({ statusCode: 400, statusMessage: "Requête invalide." });
  }

  return cosmeticService.unlock(userConnected.id, body.type, body.id);
});
