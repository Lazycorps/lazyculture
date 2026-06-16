import prisma from "~~/server/utils/prisma";
import { sendPushToUser } from "~~/server/utils/pushNotification";
import type {
  FollowListDTO,
  FollowStatusDTO,
  FollowUserDTO,
  FriendRankingDTO,
  UserSearchResultDTO,
} from "#shared/DTO/followDTO";

export class FollowService {
  async follow(followerId: string, followingId: string): Promise<FollowStatusDTO> {
    if (followerId === followingId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous ne pouvez pas vous suivre vous-même",
      });
    }

    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) {
      throw createError({
        statusCode: 404,
        statusMessage: "Utilisateur non trouvé",
      });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (!existing) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId, followingId } },
        create: { followerId, followingId },
        update: {},
      });

      // Notification push uniquement à la première création (best-effort)
      this.notifyNewFollower(followerId, followingId).catch((e) =>
        console.error("Erreur push follow:", e),
      );
    }

    const followersCount = await prisma.follow.count({ where: { followingId } });
    return { following: true, followersCount };
  }

  async unfollow(followerId: string, followingId: string): Promise<FollowStatusDTO> {
    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    const followersCount = await prisma.follow.count({ where: { followingId } });
    return { following: false, followersCount };
  }

  async getCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followersCount, followingCount };
  }

  async isFollowing(viewerId: string, targetId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    });
    return follow != null;
  }

  async getFollowers(
    userId: string,
    viewerId: string,
    page = 1,
    limit = 20,
  ): Promise<FollowListDTO> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              slug: true,
              UserProgress: { select: { xp: true, levelId: true } },
            },
          },
        },
        orderBy: { createDate: "desc" },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    const users = follows.map((f) => ({ user: f.follower, followDate: f.createDate }));
    const items = await this.toFollowUserDTOs(users, viewerId);
    return { items, total, page: safePage, limit: safeLimit };
  }

  async getFollowing(
    userId: string,
    viewerId: string,
    page = 1,
    limit = 20,
  ): Promise<FollowListDTO> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              slug: true,
              UserProgress: { select: { xp: true, levelId: true } },
            },
          },
        },
        orderBy: { createDate: "desc" },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    const users = follows.map((f) => ({ user: f.following, followDate: f.createDate }));
    const items = await this.toFollowUserDTOs(users, viewerId);
    return { items, total, page: safePage, limit: safeLimit };
  }

  async searchUsers(query: string, currentUserId: string): Promise<UserSearchResultDTO[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { name: { not: "" } },
          {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { slug: { contains: trimmed, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        UserProgress: { select: { xp: true, levelId: true } },
      },
      take: 10,
    });

    const followedIds = await this.getFollowedIdsAmong(
      currentUserId,
      users.map((u) => u.id),
    );

    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      slug: u.slug,
      level: u.UserProgress?.levelId ?? 1,
      xp: u.UserProgress?.xp ?? 0,
      isFollowing: followedIds.has(u.id),
    }));
  }

  /**
   * Suggestions d'amis : d'abord les joueurs suivis par vos abonnements
   * (amis d'amis, triés par popularité), complétés par les meilleurs joueurs (XP).
   */
  async getSuggestions(userId: string, limit = 10): Promise<UserSearchResultDTO[]> {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const excludedIds = [...followingIds, userId];

    const friendsOfFriends = await prisma.follow.groupBy({
      by: ["followingId"],
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: excludedIds },
      },
      _count: { followingId: true },
      orderBy: { _count: { followingId: "desc" } },
      take: limit,
    });
    const suggestionIds = friendsOfFriends.map((f) => f.followingId);

    if (suggestionIds.length < limit) {
      const topPlayers = await prisma.userProgress.findMany({
        where: {
          userId: { notIn: [...excludedIds, ...suggestionIds] },
          user: { name: { not: "" } },
        },
        orderBy: { xp: "desc" },
        take: limit - suggestionIds.length,
        select: { userId: true },
      });
      suggestionIds.push(...topPlayers.map((t) => t.userId));
    }

    if (suggestionIds.length === 0) return [];

    const users = await prisma.user.findMany({
      where: { id: { in: suggestionIds }, name: { not: "" } },
      select: {
        id: true,
        name: true,
        slug: true,
        UserProgress: { select: { xp: true, levelId: true } },
      },
    });

    // Préserver l'ordre des suggestions (popularité puis XP)
    const usersById = new Map(users.map((u) => [u.id, u]));
    return suggestionIds
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => u != null)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        slug: u.slug,
        level: u.UserProgress?.levelId ?? 1,
        xp: u.UserProgress?.xp ?? 0,
        isFollowing: false,
      }));
  }

  async getFriendsRanking(userId: string): Promise<FriendRankingDTO[]> {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      take: 100,
    });
    const memberIds = [...follows.map((f) => f.followingId), userId];

    const users = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        UserProgress: { select: { xp: true, levelId: true } },
      },
    });

    return users
      .map((u) => ({
        userId: u.id,
        name: u.name || "Anonyme",
        slug: u.slug,
        xp: u.UserProgress?.xp ?? 0,
        level: u.UserProgress?.levelId ?? 1,
        isMe: u.id === userId,
      }))
      .sort((a, b) => b.xp - a.xp);
  }

  /** Liste des ids suivis par viewerId parmi les ids fournis (calcul en lot). */
  private async getFollowedIdsAmong(viewerId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    return new Set(follows.map((f) => f.followingId));
  }

  private async toFollowUserDTOs(
    users: {
      user: {
        id: string;
        name: string;
        slug: string;
        UserProgress: { xp: number; levelId: number } | null;
      };
      followDate: Date;
    }[],
    viewerId: string,
  ): Promise<FollowUserDTO[]> {
    const followedIds = await this.getFollowedIdsAmong(
      viewerId,
      users.map((u) => u.user.id),
    );

    return users.map(({ user, followDate }) => ({
      userId: user.id,
      name: user.name || "Anonyme",
      slug: user.slug,
      level: user.UserProgress?.levelId ?? 1,
      xp: user.UserProgress?.xp ?? 0,
      isFollowedByViewer: followedIds.has(user.id),
      followDate: followDate.toISOString(),
    }));
  }

  /** Durée minimale entre deux notifications "nouvel abonné" pour une même paire. */
  private static readonly NOTIFY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

  private async notifyNewFollower(followerId: string, followingId: string) {
    // Anti-spam : la trace survit à l'unfollow, donc les cycles
    // follow/unfollow répétés ne déclenchent pas de nouvelle notification
    const lastNotif = await prisma.followNotification.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (lastNotif && Date.now() - lastNotif.sentDate.getTime() < FollowService.NOTIFY_COOLDOWN_MS) {
      return;
    }

    // Enregistrer la trace avant l'envoi pour éviter un double envoi en cas d'appels concurrents
    await prisma.followNotification.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: { sentDate: new Date() },
    });

    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });
    await sendPushToUser(followingId, {
      title: "Nouvel abonné ! 👋",
      body: `${follower?.name || "Un joueur"} vous suit désormais sur Lazyculture.`,
      url: `/user/${followerId}`,
      metadata: {
        type: "follow",
        followerId: followerId,
      },
    });
  }
}

export const followService = new FollowService();
