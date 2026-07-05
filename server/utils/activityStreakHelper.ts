import prisma from "~~/server/utils/prisma";

export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Série de jours actifs consécutifs, basée sur les dates des questions répondues
 * (même définition que la page profil). La série est valide si elle inclut
 * aujourd'hui, ou hier (journée en cours pas encore jouée).
 */
export async function computeActivityStreak(userId: string): Promise<number> {
  const lastResponses = await prisma.questionResponse.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 500,
  });

  const uniqueDates = new Set(lastResponses.map((r) => toLocalDateStr(r.date)));

  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  const startDate = uniqueDates.has(todayStr)
    ? today
    : uniqueDates.has(yesterdayStr)
      ? yesterday
      : null;
  if (!startDate) return 0;

  let currentStreak = 1;
  const checkDate = new Date(startDate);
  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (uniqueDates.has(toLocalDateStr(checkDate))) {
      currentStreak++;
    } else {
      break;
    }
  }
  return currentStreak;
}
