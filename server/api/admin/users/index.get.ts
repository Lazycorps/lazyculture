import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";
import type {
  AdminUserItemDTO,
  AdminUserListResponseDTO,
  AdminUserStatsDTO,
  DailyTrendItem,
} from "#shared/DTO/adminUserDTO";
import { toLocalDateStr } from "~~/server/utils/activityStreakHelper";

const MONTH_NAMES_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export default defineEventHandler(async (event): Promise<AdminUserListResponseDTO> => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const query = getQuery(event);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const filter = typeof query.filter === "string" ? query.filter : "all";
  const sort = typeof query.sort === "string" ? query.sort : "createDate_desc";

  const now = new Date();
  const todayStr = toLocalDateStr(now);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = toLocalDateStr(sevenDaysAgo);

  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = toLocalDateStr(thirtyDaysAgo);

  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  // 1. CALCUL DES STATISTIQUES GLOBALES & HISTORIQUE D'ACTIVITÉ MULTI-SOURCES
  const [
    totalUsers,
    newToday,
    new7d,
    new30d,
    namedUsersCount,
    adminCount,
    recentUsers,
    recentResponses,
    recentSeriesResponses,
    recentStreakDays,
    recentBrPlayers,
    recentShowdownPlayers,
    recentBrainrunRuns,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createDate: { gte: startOfToday } } }),
    prisma.user.count({ where: { createDate: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createDate: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { name: { not: "" } } }),
    prisma.user.count({ where: { admin: true } }),
    prisma.user.findMany({
      where: { createDate: { gte: fourteenDaysAgo } },
      select: { createDate: true },
    }),
    prisma.questionResponse.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { userId: true, date: true },
    }),
    prisma.questionSeriesResponse.findMany({
      where: { createDate: { gte: thirtyDaysAgo } },
      select: { userId: true, createDate: true },
    }),
    prisma.userStreakDay.findMany({
      where: { dateStr: { gte: thirtyDaysAgoStr } },
      select: { userId: true, dateStr: true },
    }),
    prisma.battleRoyalePlayer.findMany({
      where: { joinedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, joinedAt: true },
    }),
    prisma.showdownPlayer.findMany({
      where: { joinedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, joinedAt: true },
    }),
    prisma.brainrunRun.findMany({
      where: { createDate: { gte: thirtyDaysAgo } },
      select: { userId: true, createDate: true },
    }),
  ]);

  // Agréger tous les joueurs actifs par date locale (YYYY-MM-DD)
  const activeUsersByDateMap = new Map<string, Set<string>>();

  const recordActivity = (userId: string | null | undefined, dateStr: string) => {
    if (!userId || !dateStr) return;
    if (!activeUsersByDateMap.has(dateStr)) {
      activeUsersByDateMap.set(dateStr, new Set());
    }
    activeUsersByDateMap.get(dateStr)!.add(userId);
  };

  for (const r of recentResponses) {
    recordActivity(r.userId, toLocalDateStr(r.date));
  }
  for (const r of recentSeriesResponses) {
    recordActivity(r.userId, toLocalDateStr(r.createDate));
  }
  for (const r of recentStreakDays) {
    recordActivity(r.userId, r.dateStr);
  }
  for (const r of recentBrPlayers) {
    recordActivity(r.userId, toLocalDateStr(r.joinedAt));
  }
  for (const r of recentShowdownPlayers) {
    recordActivity(r.userId, toLocalDateStr(r.joinedAt));
  }
  for (const r of recentBrainrunRuns) {
    recordActivity(r.userId, toLocalDateStr(r.createDate));
  }

  // Joueurs actifs aujourd'hui (DAU), 7 jours (WAU) et 30 jours (MAU)
  const activeTodayCount = activeUsersByDateMap.get(todayStr)?.size || 0;

  const active7dUserSet = new Set<string>();
  const active30dUserSet = new Set<string>();

  for (const [dStr, userSet] of activeUsersByDateMap.entries()) {
    if (dStr >= sevenDaysAgoStr) {
      for (const uId of userSet) active7dUserSet.add(uId);
    }
    if (dStr >= thirtyDaysAgoStr) {
      for (const uId of userSet) active30dUserSet.add(uId);
    }
  }

  // 14 jours de tendances (Inscriptions & Joueurs actifs par jour)
  const last14Dates: { dateStr: string; dayLabel: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const dStr = toLocalDateStr(d);
    const dayLabel = `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`;
    last14Dates.push({ dateStr: dStr, dayLabel });
  }

  const registrationsByDateMap = new Map<string, number>();
  for (const u of recentUsers) {
    const dStr = toLocalDateStr(u.createDate);
    registrationsByDateMap.set(dStr, (registrationsByDateMap.get(dStr) || 0) + 1);
  }

  const dailyRegistrations: DailyTrendItem[] = last14Dates.map(({ dateStr, dayLabel }) => ({
    dateStr,
    dayLabel,
    count: registrationsByDateMap.get(dateStr) || 0,
  }));

  const dailyActiveUsers: DailyTrendItem[] = last14Dates.map(({ dateStr, dayLabel }) => ({
    dateStr,
    dayLabel,
    count: activeUsersByDateMap.get(dateStr)?.size || 0,
  }));

  const stats: AdminUserStatsDTO = {
    totalUsers,
    newUsersToday: newToday,
    newUsers7d: new7d,
    newUsers30d: new30d,
    activeUsersToday: activeTodayCount,
    activeUsers7d: active7dUserSet.size,
    activeUsers30d: active30dUserSet.size,
    namedUsersCount,
    adminCount,
    dailyRegistrations,
    dailyActiveUsers,
  };

  // 2. FILTRAGE ET RECHERCHE POUR LA LISTE DES UTILISATEURS
  const whereConditions: any = {};

  if (search) {
    whereConditions.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { id: { equals: search } },
    ];
  }

  if (filter === "admin") {
    whereConditions.admin = true;
  } else if (filter === "active_today") {
    whereConditions.OR = [
      ...(whereConditions.OR || []),
      { Response: { some: { date: { gte: startOfToday } } } },
      { QuestionSeriesResponse: { some: { createDate: { gte: startOfToday } } } },
      { StreakDays: { some: { dateStr: todayStr } } },
      { Wallet: { lastActivityDay: todayStr } },
      { BattleRoyalePlayer: { some: { joinedAt: { gte: startOfToday } } } },
      { ShowdownPlayer: { some: { joinedAt: { gte: startOfToday } } } },
      { BrainrunRun: { some: { createDate: { gte: startOfToday } } } },
    ];
  } else if (filter === "active_7d") {
    whereConditions.OR = [
      ...(whereConditions.OR || []),
      { Response: { some: { date: { gte: sevenDaysAgo } } } },
      { QuestionSeriesResponse: { some: { createDate: { gte: sevenDaysAgo } } } },
      { StreakDays: { some: { dateStr: { gte: sevenDaysAgoStr } } } },
      { Wallet: { lastActivityDay: { gte: sevenDaysAgoStr } } },
      { BattleRoyalePlayer: { some: { joinedAt: { gte: sevenDaysAgo } } } },
      { ShowdownPlayer: { some: { joinedAt: { gte: sevenDaysAgo } } } },
      { BrainrunRun: { some: { createDate: { gte: sevenDaysAgo } } } },
    ];
  } else if (filter === "inactive") {
    whereConditions.AND = [
      ...(whereConditions.AND || []),
      { Response: { none: { date: { gte: sevenDaysAgo } } } },
      { QuestionSeriesResponse: { none: { createDate: { gte: sevenDaysAgo } } } },
      { StreakDays: { none: { dateStr: { gte: sevenDaysAgoStr } } } },
      {
        OR: [
          { Wallet: { lastActivityDay: { lt: sevenDaysAgoStr } } },
          { Wallet: { lastActivityDay: null } },
        ],
      },
    ];
  }

  // Tri
  let orderBy: any = { createDate: "desc" };
  if (sort === "createDate_asc") {
    orderBy = { createDate: "asc" };
  } else if (sort === "xp_desc") {
    orderBy = { UserProgress: { xp: "desc" } };
  } else if (sort === "coins_desc") {
    orderBy = { Wallet: { coins: "desc" } };
  } else if (sort === "streak_desc") {
    orderBy = { Wallet: { activityStreak: "desc" } };
  } else if (sort === "name_asc") {
    orderBy = { name: "asc" };
  } else if (sort === "lastActive_desc") {
    orderBy = { updateDate: "desc" };
  }

  const [usersCount, usersRaw] = await Promise.all([
    prisma.user.count({ where: whereConditions }),
    prisma.user.findMany({
      where: whereConditions,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        UserProgress: { select: { xp: true, levelId: true } },
        Wallet: {
          select: {
            coins: true,
            activityStreak: true,
            dailyStreak: true,
            lastActivityDay: true,
          },
        },
        equippedAvatar: { select: { imageUrl: true } },
        equippedFrame: { select: { styleKey: true } },
        StreakDays: {
          select: { dateStr: true },
          orderBy: { dateStr: "desc" },
          take: 1,
        },
        Response: {
          select: { date: true },
          orderBy: { date: "desc" },
          take: 1,
        },
        QuestionSeriesResponse: {
          select: { createDate: true },
          orderBy: { createDate: "desc" },
          take: 1,
        },
        BattleRoyalePlayer: {
          select: { joinedAt: true },
          orderBy: { joinedAt: "desc" },
          take: 1,
        },
        ShowdownPlayer: {
          select: { joinedAt: true },
          orderBy: { joinedAt: "desc" },
          take: 1,
        },
        BrainrunRun: {
          select: { createDate: true },
          orderBy: { createDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            Response: true,
            QuestionSeriesResponse: true,
            BattleRoyalePlayer: true,
            ShowdownPlayer: true,
            BrainrunRun: true,
          },
        },
      },
    }),
  ]);

  const users: AdminUserItemDTO[] = usersRaw.map((u) => {
    const dates: string[] = [];
    if (u.StreakDays?.[0]?.dateStr) dates.push(u.StreakDays[0].dateStr);
    if (u.Wallet?.lastActivityDay) dates.push(u.Wallet.lastActivityDay);
    if (u.Response?.[0]?.date) dates.push(toLocalDateStr(u.Response[0].date));
    if (u.QuestionSeriesResponse?.[0]?.createDate)
      dates.push(toLocalDateStr(u.QuestionSeriesResponse[0].createDate));
    if (u.BattleRoyalePlayer?.[0]?.joinedAt)
      dates.push(toLocalDateStr(u.BattleRoyalePlayer[0].joinedAt));
    if (u.ShowdownPlayer?.[0]?.joinedAt) dates.push(toLocalDateStr(u.ShowdownPlayer[0].joinedAt));
    if (u.BrainrunRun?.[0]?.createDate) dates.push(toLocalDateStr(u.BrainrunRun[0].createDate));

    dates.sort((a, b) => b.localeCompare(a));
    const lastActivityDate = dates[0] || null;

    const isActiveToday = lastActivityDate === todayStr;
    const isActive7d = lastActivityDate ? lastActivityDate >= sevenDaysAgoStr : false;

    return {
      id: u.id,
      name: u.name || "Joueur Anonyme",
      slug: u.slug || "",
      admin: u.admin,
      createDate: u.createDate.toISOString(),
      lastActivityDate,
      lastActivityType: isActiveToday ? "Aujourd'hui" : isActive7d ? "Cette semaine" : null,
      isActiveToday,
      isActive7d,
      avatarUrl: u.equippedAvatar?.imageUrl ?? null,
      frameStyleKey: u.equippedFrame?.styleKey ?? null,
      level: u.UserProgress?.levelId ?? 1,
      xp: u.UserProgress?.xp ?? 0,
      coins: u.Wallet?.coins ?? 0,
      dailyStreak: u.Wallet?.dailyStreak ?? 0,
      activityStreak: u.Wallet?.activityStreak ?? 0,
      stats: {
        responsesCount: u._count.Response,
        seriesCount: u._count.QuestionSeriesResponse,
        brMatchesCount: u._count.BattleRoyalePlayer,
        showdownMatchesCount: u._count.ShowdownPlayer,
        brainrunRunsCount: u._count.BrainrunRun,
      },
    };
  });

  return {
    users,
    total: usersCount,
    page,
    limit,
    stats,
  };
});
