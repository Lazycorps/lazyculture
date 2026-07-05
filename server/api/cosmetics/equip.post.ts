import { cosmeticService } from "~~/server/services/CosmeticService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import type { CosmeticEquipRequestDTO } from "#shared/DTO/cosmeticDTO";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<CosmeticEquipRequestDTO>(event);

  if (
    (body?.type !== "avatar" && body?.type !== "frame") ||
    (body.id !== null && !Number.isInteger(body.id))
  ) {
    throw createError({ statusCode: 400, statusMessage: "Requête invalide." });
  }

  await cosmeticService.equip(userConnected.id, body.type, body.id);
  return { success: true };
});
