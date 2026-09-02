import { describe, expect, it } from "vite-plus/test";
import { parseCsv } from "#shared/csv/csv";
import {
  SUBMISSION_CSV_COLUMNS,
  buildTemplateCsv,
  mapCsvRowToPayload,
  normalizeLibelle,
} from "./submissionCsvTemplate";

/** Construit un enregistrement complet et valide, surchargé par les champs passés. */
function record(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    libelle: "Quelle est la capitale de l'Australie ?",
    proposition_1: "Canberra",
    proposition_2: "Sydney",
    proposition_3: "Melbourne",
    proposition_4: "Perth",
    bonne_reponse: "1",
    image_url: "",
    commentaire: "",
    source: "",
    ...overrides,
  };
}

describe("gabarit CSV", () => {
  it("ne propose ni colonne thème ni colonne difficulté", () => {
    const keys = SUBMISSION_CSV_COLUMNS.map((c) => c.key);
    expect(keys).not.toContain("theme");
    expect(keys).not.toContain("difficulte");
  });

  it("place source en dernière colonne", () => {
    expect(SUBMISSION_CSV_COLUMNS.at(-1)?.key).toBe("source");
  });

  it("génère un gabarit dont les lignes d'exemple sont valides", () => {
    const [headers = [], ...examples] = parseCsv(buildTemplateCsv());

    expect(headers).toEqual(SUBMISSION_CSV_COLUMNS.map((c) => c.label));
    expect(examples.length).toBe(2);

    examples.forEach((cells, i) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = cells[index] ?? "";
      });
      const mapped = mapCsvRowToPayload(entry, i + 2);
      expect("row" in mapped).toBe(true);
    });
  });
});

describe("mapCsvRowToPayload", () => {
  it("convertit bonne_reponse 1-based en response 0-based", () => {
    const mapped = mapCsvRowToPayload(record({ bonne_reponse: "3" }), 2);
    expect("row" in mapped && mapped.row.response).toBe(2);
  });

  it("produit des propositions d'ids 0 à 3 dans l'ordre du fichier", () => {
    const mapped = mapCsvRowToPayload(record(), 2);
    expect("row" in mapped && mapped.row.propositions).toEqual([
      { id: 0, value: "Canberra" },
      { id: 1, value: "Sydney" },
      { id: 2, value: "Melbourne" },
      { id: 3, value: "Perth" },
    ]);
  });

  it("reporte le n° de ligne et laisse les champs optionnels vides à undefined", () => {
    const mapped = mapCsvRowToPayload(record(), 7);
    expect("row" in mapped && mapped.row.line).toBe(7);
    expect("row" in mapped && mapped.row.img).toBeUndefined();
    expect("row" in mapped && mapped.row.commentaire).toBeUndefined();
    expect("row" in mapped && mapped.row.source).toBeUndefined();
  });

  it("rejette un intitulé trop court", () => {
    const mapped = mapCsvRowToPayload(record({ libelle: "Qui" }), 2);
    expect("error" in mapped && mapped.error).toContain("entre 5 et 300 caractères");
  });

  it("rejette un intitulé trop long", () => {
    const mapped = mapCsvRowToPayload(record({ libelle: "a".repeat(301) }), 2);
    expect("error" in mapped && mapped.error).toContain("entre 5 et 300 caractères");
  });

  it("rejette une proposition vide", () => {
    const mapped = mapCsvRowToPayload(record({ proposition_3: "   " }), 2);
    expect("error" in mapped && mapped.error).toContain("proposition_3");
  });

  it.each(["0", "5", "", "deux", "1.5"])("rejette bonne_reponse = « %s »", (value) => {
    const mapped = mapCsvRowToPayload(record({ bonne_reponse: value }), 2);
    expect("error" in mapped && mapped.error).toContain("bonne_reponse");
  });

  it("rejette une image_url qui n'est pas une adresse http(s)", () => {
    const mapped = mapCsvRowToPayload(record({ image_url: "mon-image.png" }), 2);
    expect("error" in mapped && mapped.error).toContain("image_url");
  });

  it("accepte une image_url https", () => {
    const mapped = mapCsvRowToPayload(record({ image_url: "https://exemple.fr/a.png" }), 2);
    expect("row" in mapped && mapped.row.img).toBe("https://exemple.fr/a.png");
  });
});

describe("normalizeLibelle", () => {
  it("ignore la casse et les espaces superflus", () => {
    expect(normalizeLibelle("  Quelle   est  la Capitale ? ")).toBe("quelle est la capitale ?");
  });
});
