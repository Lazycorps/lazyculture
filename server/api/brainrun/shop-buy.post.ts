import type { BrainrunShopBuyDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunShopBuyDTO>(event);
  return brainrunService.buyShopItem(body.runId, body.offerIndex, userConnected.id);
});
