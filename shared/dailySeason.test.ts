import { describe, it, expect } from "vite-plus/test";
import {
  formatDayLabel,
  formatMonthLabel,
  formatShortDay,
  formatShortMonth,
  getDayKey,
  getDaysInMonth,
  getMonthFirstDayOffset,
  getMonthKey,
  getMonthRange,
  getNextMonthKey,
  getPreviousMonthKey,
  isValidDayKey,
  isValidMonthKey,
} from "./dailySeason";

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

describe("getDayKey", () => {
  it("formate la clé en YYYY-MM-DD à partir de la date UTC", () => {
    expect(getDayKey(new Date("2026-09-10T14:30:00Z"))).toBe("2026-09-10");
    expect(getDayKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("isValidDayKey", () => {
  it("accepte les dates bien formées", () => {
    expect(isValidDayKey("2026-09-10")).toBe(true);
    expect(isValidDayKey("2026-01-01")).toBe(true);
    expect(isValidDayKey("2026-12-31")).toBe(true);
  });

  it("rejette les formats invalides", () => {
    for (const invalid of ["2026-09", "2026-13-01", "2026-00-01", "2026-09-32", "", "abc"]) {
      expect(isValidDayKey(invalid)).toBe(false);
    }
  });
});

describe("formatDayLabel", () => {
  const refDate = new Date("2026-09-10T12:00:00Z");

  it("identifie Aujourd'hui avec ou sans titre", () => {
    expect(formatDayLabel("2026-09-10", "Daily 368", refDate)).toBe("Aujourd'hui • Daily 368");
    expect(formatDayLabel("2026-09-10", undefined, refDate)).toBe("Aujourd'hui");
  });

  it("identifie Hier avec ou sans titre", () => {
    expect(formatDayLabel("2026-09-09", "Daily 367", refDate)).toBe("Hier • Daily 367");
    expect(formatDayLabel("2026-09-09", undefined, refDate)).toBe("Hier");
  });

  it("formate une date passée de la même année", () => {
    const label = formatDayLabel("2026-09-08", "Daily 366", refDate);
    expect(label).toContain("8 sept.");
    expect(label).toContain("Daily 366");
  });

  it("inclut l'année si différente", () => {
    const label = formatDayLabel("2025-09-08", "Daily 1", refDate);
    expect(label).toContain("2025");
  });
});

describe("formatShortDay", () => {
  const refDate = new Date("2026-09-10T12:00:00Z");

  it("identifie Aujourd'hui et Hier", () => {
    expect(formatShortDay("2026-09-10", refDate)).toBe("Aujourd'hui");
    expect(formatShortDay("2026-09-09", refDate)).toBe("Hier");
  });

  it("formate les autres jours avec jour de semaine et numéro", () => {
    const label = formatShortDay("2026-09-08", refDate);
    expect(label).toContain("8");
  });
});

describe("formatShortMonth", () => {
  it("formate le mois court avec année", () => {
    expect(formatShortMonth("2026-09")).toBe("Sept. 26");
    expect(formatShortMonth("2026-01")).toBe("Janv. 26");
  });
});

describe("getDaysInMonth", () => {
  it("retourne 30 jours pour septembre", () => {
    const days = getDaysInMonth("2026-09");
    expect(days.length).toBe(30);
    expect(days[0]?.date).toBe("2026-09-01");
    expect(days[29]?.date).toBe("2026-09-30");
  });

  it("gère février bissextile ou non", () => {
    expect(getDaysInMonth("2024-02").length).toBe(29);
    expect(getDaysInMonth("2025-02").length).toBe(28);
  });
});

describe("getMonthFirstDayOffset", () => {
  it("calcule le décalage correct avec lundi = 0", () => {
    // 2026-09-01 est un mardi -> décalage 1
    expect(getMonthFirstDayOffset("2026-09")).toBe(1);
    // 2026-06-01 est un lundi -> décalage 0
    expect(getMonthFirstDayOffset("2026-06")).toBe(0);
    // 2026-02-01 est un dimanche -> décalage 6
    expect(getMonthFirstDayOffset("2026-02")).toBe(6);
  });
});

describe("getPreviousMonthKey & getNextMonthKey", () => {
  it("navigue entre les mois correctement y compris au changement d'année", () => {
    expect(getPreviousMonthKey("2026-09")).toBe("2026-08");
    expect(getNextMonthKey("2026-09")).toBe("2026-10");
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    expect(getNextMonthKey("2026-12")).toBe("2027-01");
  });
});
