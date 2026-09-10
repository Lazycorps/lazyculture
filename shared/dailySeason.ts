/** Saisons mensuelles du classement daily : une saison = un mois calendaire, borné en UTC.
 *
 * Les séries daily stockent leur `date` en `@db.Date` (donc à minuit UTC, cf. SeriesService qui
 * les crée depuis `new Date().toJSON().slice(0, 10)`) : tous les calculs de bornes se font en UTC
 * pour éviter un décalage de journée en début/fin de mois. Partagé client/serveur car le serveur
 * filtre les séries et le client affiche/navigue entre les saisons. */

/** Clé de saison « YYYY-MM » d'une date, en UTC. */
export function getMonthKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Bornes UTC d'une saison : `[start, end[` (1er du mois inclus, 1er du mois suivant exclu). */
export function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** Libellé lisible d'une saison, ex. « septembre 2026 ». */
export function formatMonthLabel(monthKey: string): string {
  const { start } = getMonthRange(monthKey);
  return start.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Clé de jour « YYYY-MM-DD » d'une date, en UTC. */
export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDayKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}

/** Libellé lisible d'un jour pour le navigateur, ex. « Aujourd'hui • Daily 368 », « Hier • Daily 367 », ou « 8 sept. • Daily 366 ». */
export function formatDayLabel(
  dayKey: string,
  title?: string,
  referenceDate: Date = new Date(),
): string {
  const [year, month, day] = dayKey.split("-").map(Number) as [number, number, number];
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  const todayKey = getDayKey(referenceDate);
  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayKey = getDayKey(yesterdayDate);

  let dateLabel: string;
  if (dayKey === todayKey) {
    dateLabel = "Aujourd'hui";
  } else if (dayKey === yesterdayKey) {
    dateLabel = "Hier";
  } else {
    const isSameYear = targetDate.getUTCFullYear() === referenceDate.getUTCFullYear();
    dateLabel = targetDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      ...(isSameYear ? {} : { year: "numeric" }),
      timeZone: "UTC",
    });
  }

  return title ? `${dateLabel} • ${title}` : dateLabel;
}

/** Libellé court d'un jour pour la ligne du temps, ex. « Aujourd'hui », « Hier », ou « Mar 8 ». */
export function formatShortDay(dayKey: string, referenceDate: Date = new Date()): string {
  const todayKey = getDayKey(referenceDate);
  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayKey = getDayKey(yesterdayDate);

  if (dayKey === todayKey) return "Aujourd'hui";
  if (dayKey === yesterdayKey) return "Hier";

  const [year, month, day] = dayKey.split("-").map(Number) as [number, number, number];
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = targetDate.toLocaleDateString("fr-FR", {
    weekday: "short",
    timeZone: "UTC",
  });
  // Première lettre en majuscule, ex: "Mar 8"
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1, 3);
  return `${capitalizedWeekday} ${day}`;
}

/** Libellé court d'un mois pour la ligne du temps, ex. « Sept. 26 ». */
export function formatShortMonth(monthKey: string): string {
  const { start } = getMonthRange(monthKey);
  const monthName = start.toLocaleDateString("fr-FR", {
    month: "short",
    timeZone: "UTC",
  });
  const yearShort = String(start.getUTCFullYear()).slice(-2);
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${yearShort}`;
}

/** Liste de toutes les dates « YYYY-MM-DD » d'un mois donné. */
export function getDaysInMonth(monthKey: string): { date: string; dayNumber: number }[] {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  // Le jour 0 du mois suivant correspond au dernier jour du mois en cours
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: { date: string; dayNumber: number }[] = [];
  const monthPad = String(month).padStart(2, "0");

  for (let d = 1; d <= lastDay; d++) {
    const dayPad = String(d).padStart(2, "0");
    days.push({
      date: `${year}-${monthPad}-${dayPad}`,
      dayNumber: d,
    });
  }
  return days;
}

/** Calcule le décalage (0 à 6) du premier jour du mois par rapport au lundi (0 = Lundi, 6 = Dimanche). */
export function getMonthFirstDayOffset(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

/** Mois précédent sous forme YYYY-MM */
export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, month - 2, 1));
  return getMonthKey(date);
}

/** Mois suivant sous forme YYYY-MM */
export function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, month, 1));
  return getMonthKey(date);
}
