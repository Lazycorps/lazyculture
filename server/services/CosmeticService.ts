import type { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import { spendCoins } from "~~/server/utils/walletHelper";
import type {
  AvatarFrameItemDTO,
  AvatarItemDTO,
  CosmeticCatalogDTO,
  CosmeticType,
} from "#shared/DTO/cosmeticDTO";

export interface AvatarAdminInput {
  name: string;
  imageUrl: string;
  unlockType: string;
  price: number;
  achievementId: number | null;
  enabled: boolean;
  sortOrder: number;
}

export interface FrameAdminInput {
  name: string;
  styleKey: string;
  unlockType: string;
  price: number;
  achievementId: number | null;
  enabled: boolean;
  sortOrder: number;
}

export class CosmeticService {
  /** Catalogue complet (avatars + cadres actifs) avec le statut de l'utilisateur. */
  async getCatalog(userId: string): Promise<CosmeticCatalogDTO> {
    const [avatars, frames, ownedAvatars, ownedFrames, userAchievements, user, wallet] =
      await Promise.all([
        prisma.avatar.findMany({
          where: { enabled: true },
          include: { achievement: { select: { title: true } } },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        }),
        prisma.avatarFrame.findMany({
          where: { enabled: true },
          include: { achievement: { select: { title: true } } },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        }),
        prisma.userAvatar.findMany({ where: { userId }, select: { avatarId: true } }),
        prisma.userAvatarFrame.findMany({ where: { userId }, select: { frameId: true } }),
        prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { equippedAvatarId: true, equippedFrameId: true },
        }),
        prisma.userWallet.findUnique({ where: { userId } }),
      ]);

    const ownedAvatarIds = new Set(ownedAvatars.map((o) => o.avatarId));
    const ownedFrameIds = new Set(ownedFrames.map((o) => o.frameId));
    const achievementIds = new Set(userAchievements.map((a) => a.achievementId));

    const avatarDTOs: AvatarItemDTO[] = avatars.map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.imageUrl,
      unlockType: a.unlockType as AvatarItemDTO["unlockType"],
      price: a.price,
      achievementId: a.achievementId,
      achievementTitle: a.achievement?.title ?? null,
      owned: ownedAvatarIds.has(a.id),
      equipped: user?.equippedAvatarId === a.id,
      achievementUnlocked: a.achievementId != null && achievementIds.has(a.achievementId),
    }));

    const frameDTOs: AvatarFrameItemDTO[] = frames.map((f) => ({
      id: f.id,
      name: f.name,
      styleKey: f.styleKey,
      unlockType: f.unlockType as AvatarFrameItemDTO["unlockType"],
      price: f.price,
      achievementId: f.achievementId,
      achievementTitle: f.achievement?.title ?? null,
      owned: ownedFrameIds.has(f.id),
      equipped: user?.equippedFrameId === f.id,
      achievementUnlocked: f.achievementId != null && achievementIds.has(f.achievementId),
    }));

    return { coins: wallet?.coins ?? 0, avatars: avatarDTOs, frames: frameDTOs };
  }

  /** Débloque un avatar ou un cadre (gratuit, achat en pièces, ou réclamation d'exploit). */
  async unlock(userId: string, type: CosmeticType, id: number): Promise<CosmeticCatalogDTO> {
    const item =
      type === "avatar"
        ? await prisma.avatar.findUnique({ where: { id } })
        : await prisma.avatarFrame.findUnique({ where: { id } });

    if (!item || !item.enabled) {
      throw createError({ statusCode: 404, statusMessage: "Élément introuvable." });
    }

    const owned =
      type === "avatar"
        ? await prisma.userAvatar.findUnique({
            where: { userId_avatarId: { userId, avatarId: id } },
          })
        : await prisma.userAvatarFrame.findUnique({
            where: { userId_frameId: { userId, frameId: id } },
          });
    if (owned) {
      throw createError({ statusCode: 409, statusMessage: "Élément déjà débloqué." });
    }

    if (item.unlockType === "ACHIEVEMENT") {
      if (!item.achievementId) {
        throw createError({ statusCode: 400, statusMessage: "Exploit non configuré." });
      }
      const userAchievement = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: item.achievementId } },
      });
      if (!userAchievement) {
        throw createError({ statusCode: 403, statusMessage: "Exploit non débloqué." });
      }
    }

    const createOwnership = (tx: Prisma.TransactionClient) =>
      type === "avatar"
        ? tx.userAvatar.create({ data: { userId, avatarId: id } })
        : tx.userAvatarFrame.create({ data: { userId, frameId: id } });

    if (item.unlockType === "COINS") {
      // Débit conditionnel + possession dans la même transaction (anti-double-dépense)
      await prisma.$transaction(async (tx) => {
        await spendCoins(tx, userId, item.price);
        await createOwnership(tx);
      });
    } else {
      await createOwnership(prisma);
    }

    return this.getCatalog(userId);
  }

  /** Équipe (ou déséquipe avec id null) un avatar ou un cadre possédé. */
  async equip(userId: string, type: CosmeticType, id: number | null): Promise<void> {
    if (id != null) {
      const owned =
        type === "avatar"
          ? await prisma.userAvatar.findUnique({
              where: { userId_avatarId: { userId, avatarId: id } },
            })
          : await prisma.userAvatarFrame.findUnique({
              where: { userId_frameId: { userId, frameId: id } },
            });
      if (!owned) {
        throw createError({ statusCode: 403, statusMessage: "Élément non possédé." });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: type === "avatar" ? { equippedAvatarId: id } : { equippedFrameId: id },
    });
  }

  // ===================== Administration =====================

  /** Liste complète (y compris désactivés) avec le nombre de propriétaires. */
  async adminList(type: CosmeticType) {
    if (type === "avatar") {
      return prisma.avatar.findMany({
        include: { achievement: { select: { title: true } }, _count: { select: { owners: true } } },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });
    }
    return prisma.avatarFrame.findMany({
      include: { achievement: { select: { title: true } }, _count: { select: { owners: true } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  async adminCreateAvatar(data: AvatarAdminInput) {
    return prisma.avatar.create({ data });
  }

  async adminUpdateAvatar(id: number, data: Partial<AvatarAdminInput>) {
    return prisma.avatar.update({ where: { id }, data: { ...data, updateDate: new Date() } });
  }

  async adminCreateFrame(data: FrameAdminInput) {
    return prisma.avatarFrame.create({ data });
  }

  async adminUpdateFrame(id: number, data: Partial<FrameAdminInput>) {
    return prisma.avatarFrame.update({ where: { id }, data: { ...data, updateDate: new Date() } });
  }

  /** Suppression définitive, refusée si l'élément a des propriétaires (utiliser enabled=false). */
  async adminDelete(type: CosmeticType, id: number) {
    const owners =
      type === "avatar"
        ? await prisma.userAvatar.count({ where: { avatarId: id } })
        : await prisma.userAvatarFrame.count({ where: { frameId: id } });
    if (owners > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Des joueurs possèdent cet élément : désactivez-le plutôt.",
      });
    }
    if (type === "avatar") {
      await prisma.avatar.delete({ where: { id } });
    } else {
      await prisma.avatarFrame.delete({ where: { id } });
    }
  }

  /** Cosmétiques équipés d'un lot d'utilisateurs (pour les modes multijoueur). */
  async getEquippedForUsers(
    userIds: string[],
  ): Promise<Map<string, { avatarUrl: string | null; frameStyleKey: string | null }>> {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        equippedAvatar: { select: { imageUrl: true } },
        equippedFrame: { select: { styleKey: true } },
      },
    });
    return new Map(
      users.map((u) => [
        u.id,
        {
          avatarUrl: u.equippedAvatar?.imageUrl ?? null,
          frameStyleKey: u.equippedFrame?.styleKey ?? null,
        },
      ]),
    );
  }
}

export const cosmeticService = new CosmeticService();
