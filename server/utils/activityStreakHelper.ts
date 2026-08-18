import prisma from "./prisma";

export const CALENDAR_REWARDS = [15, 20, 25, 30, 35, 45, 100]; // Pièces (J1-J7)

// Coûts progressifs de rachat selon le nombre de jours manqués consécutifs (jusqu'à 3 jours max)
export const STREAK_REPAIR_COSTS: Record<number, number> = {
  1: 20,
  2: 50,
  3: 90,
};
export const MAX_REPAIRABLE_DAYS = 3;

export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPastLocalDateStr(daysAgo: number, baseDate = new Date()): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateStr(d);
}

/**
 * Récupère l'ensemble des dates actives uniques d'un utilisateur
 * (combine UserStreakDay, QuestionResponse et QuestionSeriesResponse pour la rétrocompatibilité).
 */
export async function getAllActiveDatesMap(
  userId: string,
): Promise<
  Map<
    string,
    { status: "PLAYED" | "REPAIRED"; streakCount: number; cost: number; claimed: boolean }
  >
> {
  const datesMap = new Map<
    string,
    { status: "PLAYED" | "REPAIRED"; streakCount: number; cost: number; claimed: boolean }
  >();

  // 1. Charger depuis la table dédiée UserStreakDay (source de vérité)
  const streakDays = await prisma.userStreakDay.findMany({
    where: { userId },
    select: { dateStr: true, status: true, streakCount: true, cost: true, claimed: true },
  });
  for (const sd of streakDays) {
    datesMap.set(sd.dateStr, {
      status: sd.status as "PLAYED" | "REPAIRED",
      streakCount: sd.streakCount,
      cost: sd.cost,
      claimed: sd.claimed,
    });
  }

  // 2. Rétrocompatibilité historique : QuestionResponse
  const questionResponses = await prisma.questionResponse.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 500,
  });
  for (const qr of questionResponses) {
    const dStr = toLocalDateStr(qr.date);
    if (!datesMap.has(dStr)) {
      datesMap.set(dStr, { status: "PLAYED", streakCount: 1, cost: 0, claimed: false });
    }
  }

  // 3. Rétrocompatibilité historique : QuestionSeriesResponse
  const seriesResponses = await prisma.questionSeriesResponse.findMany({
    where: { userId },
    select: { createDate: true },
    orderBy: { createDate: "desc" },
    take: 500,
  });
  for (const sr of seriesResponses) {
    const dStr = toLocalDateStr(sr.createDate);
    if (!datesMap.has(dStr)) {
      datesMap.set(dStr, { status: "PLAYED", streakCount: 1, cost: 0, claimed: false });
    }
  }

  return datesMap;
}

/**
 * Calcule la série de jours actifs consécutifs.
 * La série est active si elle inclut aujourd'hui (déjà joué) ou hier (en attente de jouer aujourd'hui).
 */
export async function computeActivityStreak(userId: string): Promise<number> {
  const datesMap = await getAllActiveDatesMap(userId);

  const todayStr = toLocalDateStr(new Date());
  const yesterdayStr = getPastLocalDateStr(1);

  const todayActive = datesMap.has(todayStr);
  const yesterdayActive = datesMap.has(yesterdayStr);

  if (!todayActive && !yesterdayActive) {
    return 0;
  }

  const startDate = todayActive ? new Date() : new Date(Date.now() - 86400000);
  let streak = 0;
  const checkDate = new Date(startDate);

  while (true) {
    const dStr = toLocalDateStr(checkDate);
    if (datesMap.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Enregistre l'activité d'aujourd'hui pour un utilisateur (appelé lors d'une réponse à un quiz).
 * Met à jour UserStreakDay et UserWallet de façon atomique.
 */
export async function recordUserStreakActivity(userId: string): Promise<number> {
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const yesterdayStr = getPastLocalDateStr(1, today);

  const datesMap = await getAllActiveDatesMap(userId);

  let currentStreak = 1;
  if (datesMap.has(yesterdayStr)) {
    // Calculer la série rétroactive depuis hier
    let checkDate = new Date(Date.now() - 86400000);
    let pastStreak = 0;
    while (datesMap.has(toLocalDateStr(checkDate))) {
      pastStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    currentStreak = pastStreak + 1;
  }

  const existingToday = await prisma.userStreakDay.findUnique({
    where: { userId_dateStr: { userId, dateStr: todayStr } },
  });

  if (!existingToday) {
    await prisma.userStreakDay.create({
      data: {
        userId,
        dateStr: todayStr,
        status: "PLAYED",
        streakCount: currentStreak,
        cost: 0,
        claimed: false,
      },
    });
  } else if (existingToday.status !== "PLAYED" || existingToday.streakCount !== currentStreak) {
    await prisma.userStreakDay.update({
      where: { userId_dateStr: { userId, dateStr: todayStr } },
      data: {
        status: "PLAYED",
        streakCount: currentStreak,
      },
    });
  }

  // Mettre à jour le wallet
  await prisma.userWallet.upsert({
    where: { userId },
    update: {
      activityStreak: currentStreak,
      dailyStreak: currentStreak,
      lastActivityDay: todayStr,
    },
    create: {
      userId,
      coins: 0,
      totalEarned: 0,
      activityStreak: currentStreak,
      dailyStreak: currentStreak,
      lastActivityDay: todayStr,
    },
  });

  return currentStreak;
}

export interface TimelineDayItem {
  dateStr: string;
  dayLabel: string; // Ex: "Lun 17"
  dayShort: string; // Ex: "Lun"
  dayOfMonth: number; // Ex: 17
  isToday: boolean;
  status: "COMPLETED" | "REPAIRED" | "TODAY_PENDING" | "TODAY_COMPLETED" | "MISSED" | "FUTURE";
  streakCount: number;
  cost: number;
  claimed: boolean;
  rewardCoins: number;
}

/**
 * Construit la timeline visuelle des 7 derniers jours (du Jour J-6 à Aujourd'hui)
 * et analyse l'éligibilité au rachat (jusqu'à 3 jours manqués).
 */
export async function getStreakTimeline(
  userId: string,
  daysCount = 7,
): Promise<{
  timeline: TimelineDayItem[];
  currentStreak: number;
  hasAnsweredToday: boolean;
  claimedToday: boolean;
  canRepair: boolean;
  missedDaysCount: number;
  missedDates: string[]; // Trié du plus ancien au plus récent
  repairCost: number;
  previousStreakToRestore: number;
}> {
  const datesMap = await getAllActiveDatesMap(userId);
  const currentStreak = await computeActivityStreak(userId);

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const hasAnsweredToday = datesMap.has(todayStr) && datesMap.get(todayStr)?.status === "PLAYED";
  const todayEntry = datesMap.get(todayStr);
  const claimedToday = todayEntry?.claimed === true;

  // Calcul pour l'éligibilité au rachat (jusqu'à 3 jours manqués consécutifs en arrière depuis hier)
  let canRepair = false;
  let missedDaysCount = 0;
  const rawMissedDates: string[] = [];
  let previousStreakToRestore = 0;
  let repairCost = 0;

  let checkDate = new Date(Date.now() - 86400000);
  let gap = 0;

  while (gap < MAX_REPAIRABLE_DAYS && !datesMap.has(toLocalDateStr(checkDate))) {
    gap++;
    rawMissedDates.push(toLocalDateStr(checkDate));
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Vérifier si un streak existait immédiatement avant ce trou de 1 à 3 jours
  if (gap >= 1 && gap <= MAX_REPAIRABLE_DAYS) {
    let pastStreak = 0;
    while (datesMap.has(toLocalDateStr(checkDate))) {
      pastStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    if (pastStreak > 0) {
      canRepair = true;
      missedDaysCount = gap;
      previousStreakToRestore = pastStreak;
      repairCost = STREAK_REPAIR_COSTS[gap] ?? 20 * gap;
    }
  }

  // Les dates manquées du plus ancien au plus récent pour insertion ordonnée
  const missedDates = [...rawMissedDates].reverse();

  // Jours de la semaine en français court
  const daysOfWeek = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const timeline: TimelineDayItem[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = toLocalDateStr(d);
    const isDayToday = dStr === todayStr;

    const entry = datesMap.get(dStr);
    const isPlayed = entry?.status === "PLAYED";
    const isRepaired = entry?.status === "REPAIRED";

    let status: TimelineDayItem["status"] = "MISSED";
    if (isDayToday) {
      status = hasAnsweredToday ? "TODAY_COMPLETED" : "TODAY_PENDING";
    } else if (isPlayed) {
      status = "COMPLETED";
    } else if (isRepaired) {
      status = "REPAIRED";
    } else {
      status = "MISSED";
    }

    const dayStreakCount = entry?.streakCount || 0;
    const rewardIndex = dayStreakCount > 0 ? (dayStreakCount - 1) % 7 : (7 - i - 1) % 7;
    const rewardCoins = CALENDAR_REWARDS[Math.abs(rewardIndex)] ?? 15;

    timeline.push({
      dateStr: dStr,
      dayLabel: `${daysOfWeek[d.getDay()]} ${d.getDate()}`,
      dayShort: daysOfWeek[d.getDay()] ?? "",
      dayOfMonth: d.getDate(),
      isToday: isDayToday,
      status,
      streakCount: dayStreakCount,
      cost: entry?.status === "REPAIRED" ? entry.cost || 20 : 0,
      claimed: entry?.claimed ?? false,
      rewardCoins,
    });
  }

  return {
    timeline,
    currentStreak,
    hasAnsweredToday,
    claimedToday,
    canRepair,
    missedDaysCount,
    missedDates,
    repairCost,
    previousStreakToRestore,
  };
}
