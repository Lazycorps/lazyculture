import { isAvatarFrameStyleKey } from "#shared/avatarFrames";
import type { AvatarAdminInput, FrameAdminInput } from "~~/server/services/CosmeticService";

const UNLOCK_TYPES = ["FREE", "COINS", "ACHIEVEMENT"];

function parseCommon(body: any) {
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Nom requis." });
  }
  const unlockType = body.unlockType ?? "FREE";
  if (!UNLOCK_TYPES.includes(unlockType)) {
    throw createError({ statusCode: 400, statusMessage: "Type de déblocage invalide." });
  }
  const price = Number(body.price ?? 0);
  if (!Number.isInteger(price) || price < 0) {
    throw createError({ statusCode: 400, statusMessage: "Prix invalide." });
  }
  if (unlockType === "COINS" && price <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Un prix positif est requis." });
  }
  const achievementId = body.achievementId == null ? null : Number(body.achievementId);
  if (achievementId !== null && !Number.isInteger(achievementId)) {
    throw createError({ statusCode: 400, statusMessage: "Exploit invalide." });
  }
  if (unlockType === "ACHIEVEMENT" && achievementId === null) {
    throw createError({ statusCode: 400, statusMessage: "Un exploit est requis." });
  }
  return {
    name: body.name.trim(),
    unlockType,
    price,
    achievementId,
    enabled: body.enabled !== false,
    sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

export function parseAvatarAdminBody(body: any): AvatarAdminInput {
  if (typeof body?.imageUrl !== "string" || !body.imageUrl.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Image requise." });
  }
  return { ...parseCommon(body), imageUrl: body.imageUrl.trim() };
}

export function parseFrameAdminBody(body: any): FrameAdminInput {
  if (typeof body?.styleKey !== "string" || !isAvatarFrameStyleKey(body.styleKey)) {
    throw createError({ statusCode: 400, statusMessage: "Style de cadre invalide." });
  }
  return { ...parseCommon(body), styleKey: body.styleKey };
}
