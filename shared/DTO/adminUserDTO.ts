export interface DailyTrendItem {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Ex: "18 Aoû"
  count: number;
}

export interface AdminUserStatsDTO {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsersToday: number;
  activeUsers7d: number;
  activeUsers30d: number;
  namedUsersCount: number;
  adminCount: number;
  dailyRegistrations: DailyTrendItem[];
  dailyActiveUsers: DailyTrendItem[];
}

export interface AdminUserItemDTO {
  id: string;
  name: string;
  slug: string;
  admin: boolean;
  createDate: string;
  lastActivityDate: string | null;
  lastActivityType: string | null;
  isActiveToday: boolean;
  isActive7d: boolean;
  avatarUrl: string | null;
  frameStyleKey: string | null;
  level: number;
  xp: number;
  coins: number;
  dailyStreak: number;
  activityStreak: number;
  stats: {
    responsesCount: number;
    seriesCount: number;
    brMatchesCount: number;
    showdownMatchesCount: number;
    brainrunRunsCount: number;
  };
}

export interface AdminUserListResponseDTO {
  users: AdminUserItemDTO[];
  total: number;
  page: number;
  limit: number;
  stats: AdminUserStatsDTO;
}
