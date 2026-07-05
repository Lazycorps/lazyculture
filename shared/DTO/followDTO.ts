export interface FollowUserDTO {
  userId: string;
  name: string;
  slug: string;
  level: number;
  xp: number;
  isFollowedByViewer: boolean;
  followDate: string;
  avatarUrl: string | null;
  frameStyleKey: string | null;
}

export interface FollowListDTO {
  items: FollowUserDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface FollowStatusDTO {
  following: boolean;
  followersCount: number;
}

export interface UserSearchResultDTO {
  userId: string;
  name: string;
  slug: string;
  level: number;
  xp: number;
  isFollowing: boolean;
  avatarUrl: string | null;
  frameStyleKey: string | null;
}

export interface FriendRankingDTO {
  userId: string;
  name: string;
  slug: string;
  xp: number;
  level: number;
  isMe: boolean;
  avatarUrl: string | null;
  frameStyleKey: string | null;
}

export interface ProfileSocialDTO {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
}
