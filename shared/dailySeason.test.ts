import { describe, it, expect } from "vite-plus/test";
import { formatMonthLabel, getMonthKey, getMonthRange, isValidMonthKey } from "./dailySeason";

describe("getMonthKey", () => {
  it("formate la clé en YYYY-MM à partir de la date UTC", () => {
    expect(getMonthKey(new Date("2026-09-04T12:00:00Z"))).toBe("2026-09");
    expect(getMonthKey(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
  });

  it("reste sur le mois UTC même en toute fin de mois", () => {
    // 30/09 22:00 UTC = 01/10 00:00 en UTC+2 : la saison doit rester celle de septembre.
    expect(getMonthKey(new Date("2026-09-30T22:00:00Z"))).toBe("2026-09");
  });
});

describe("isValidMonthKey", () => {
  it("accepte les clés bien formées", () => {
    expect(isValidMonthKey("2026-01")).toBe(true);
    expect(isValidMonthKey("2026-12")).toBe(true);
  });

  it("rejette les mois hors bornes et les formats libres", () => {
    for (const invalid of ["2026-00", "2026-13", "2026-1", "26-01", "2026-09-04", "", "abcd-ef"]) {
      expect(isValidMonthKey(invalid)).toBe(false);
    }
  });
});

describe("getMonthRange", () => {
  it("borne la saison du 1er du mois inclus au 1er du mois suivant exclu, en UTC", () => {
    const { start, end } = getMonthRange("2026-09");
    expect(start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("passe à l'année suivante pour décembre", () => {
    const { start, end } = getMonthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("formatMonthLabel", () => {
  it("produit un libellé français mois + année", () => {
    expect(formatMonthLabel("2026-09")).toBe("septembre 2026");
  });
});
