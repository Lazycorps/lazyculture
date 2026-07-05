export type CosmeticUnlockType = "FREE" | "COINS" | "ACHIEVEMENT";
export type CosmeticType = "avatar" | "frame";

interface CosmeticItemBase {
  id: number;
  name: string;
  unlockType: CosmeticUnlockType;
  price: number;
  achievementId: number | null;
  achievementTitle: string | null;
  // Statut pour l'utilisateur courant
  owned: boolean;
  equipped: boolean;
  achievementUnlocked: boolean;
}

export interface AvatarItemDTO extends CosmeticItemBase {
  imageUrl: string;
}

export interface AvatarFrameItemDTO extends CosmeticItemBase {
  styleKey: string;
}

export interface CosmeticCatalogDTO {
  coins: number;
  avatars: AvatarItemDTO[];
  frames: AvatarFrameItemDTO[];
}

export interface CosmeticUnlockRequestDTO {
  type: CosmeticType;
  id: number;
}

export interface CosmeticEquipRequestDTO {
  type: CosmeticType;
  id: number | null; // null = déséquiper
}
