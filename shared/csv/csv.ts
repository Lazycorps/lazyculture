/**
 * Utilitaire CSV minimaliste (RFC 4180), isomorphe client/serveur.
 * Suffisant pour générer et relire nos propres gabarits : guillemets échappés (""),
 * séparateurs et retours à la ligne à l'intérieur d'un champ quoté, CRLF et BOM UTF-8.
 */

export type CsvDelimiter = ";" | "," | "\t";

const BOM = "﻿";

/**
 * Devine le séparateur à partir de la ligne d'en-tête : Excel FR écrit `;`,
 * Google Sheets et les exports anglo-saxons `,`.
 */
export function detectDelimiter(headerLine: string): CsvDelimiter {
  const candidates: CsvDelimiter[] = [";", ",", "\t"];
  let best: CsvDelimiter = ";";
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = countOutsideQuotes(headerLine, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/** Compte les occurrences d'un caractère en ignorant celles situées dans un champ quoté. */
function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // Un guillemet doublé à l'intérieur d'un champ quoté est un guillemet littéral.
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (c === char && !inQuotes) {
      count++;
    }
  }

  return count;
}

/**
 * Parse un contenu CSV en tableau de lignes. Le BOM est retiré et le saut de ligne final
 * (systématique dans les exports de tableur) n'ajoute pas de ligne fantôme, mais les lignes
 * vides intermédiaires sont conservées pour que la numérotation reste fidèle au fichier.
 * Si le séparateur n'est pas fourni il est déduit de la première ligne.
 */
export function parseCsv(text: string, delimiter?: CsvDelimiter): string[][] {
  const content = text.startsWith(BOM) ? text.slice(1) : text;
  if (!content.trim()) return [];

  const sep = delimiter ?? detectDelimiter(content.split(/\r?\n/)[0] ?? "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];

    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // Fin de ligne CRLF : le \n suivant déclenche la bascule.
      continue;
    } else {
      field += c;
    }
  }

  row.push(field);
  rows.push(row);

  // Un fichier se terminant par un saut de ligne produit une dernière ligne vide : on l'écarte.
  const last = rows.at(-1);
  if (rows.length > 0 && last && !isBlankRow(last)) return rows;
  return rows.slice(0, -1);
}

/** Vrai si la ligne ne contient que des cellules vides. */
export function isBlankRow(row: string[]): boolean {
  return row.every((value) => value.trim().length === 0);
}

/** Échappe un champ si nécessaire (contient le séparateur, un guillemet ou un retour à la ligne). */
function escapeField(value: string, delimiter: CsvDelimiter): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Sérialise des lignes en CSV. `withBom` ajoute le BOM UTF-8 pour qu'Excel affiche
 * correctement les accents à l'ouverture du fichier.
 */
export function serializeCsv(
  rows: string[][],
  delimiter: CsvDelimiter = ";",
  withBom = false,
): string {
  const body = rows
    .map((row) => row.map((value) => escapeField(value ?? "", delimiter)).join(delimiter))
    .join("\r\n");
  return withBom ? BOM + body : body;
}
