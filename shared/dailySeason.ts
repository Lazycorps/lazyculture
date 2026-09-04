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
