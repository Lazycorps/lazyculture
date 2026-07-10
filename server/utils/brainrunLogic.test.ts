import { describe, it, expect } from "vite-plus/test";
import {
  applyBossMalusToDamage,
  applyRelicsToBossDamage,
  applyRelicsToGold,
  assignCombatIdentities,
  assignNodeTypes,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  calculBrainrunUserXP,
  consumeShieldIfArmed,
  effectiveThemes,
  enforceEliteRouteBounds,
  flashMalusBonusTimeMs,
  generateActEdges,
  isAlainMemoryIntro,
  generateActGraph,
  generateBonusOffers,
  generateShopOffers,
  generateShopReplacementOffer,
  getActiveRelicEffects,
  getActiveTalentEffects,
  getCandidateCols,
  goldToKnowledgePoints,
  instantRoomHealthDelta,
  isBossAnswerTimedOut,
  maybeConvertNodeToEvent,
  nextRowAfterClear,
  pickCombatCandidate,
  pickFiftyFiftyEliminations,
  pickPhoneAFriendHint,
  pickRandomStashConsumables,
  resolveEventOption,
  shouldEndRunOnDamage,
  type BrainrunGraphNode,
} from "./brainrunLogic";
import {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX,
  BRAINRUN_MAX_ELITE_PER_ROUTE,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER,
  getBrainrunActRowWidths,
} from "./brainrunConfig";
import {
  BRAINRUN_BONUS_OFFER_COUNT,
  BRAINRUN_CONSUMABLES,
  BRAINRUN_RELICS,
  BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT,
  BRAINRUN_SHOP_RELIC_OFFER_COUNT,
  type BrainrunRelicId,
} from "#shared/brainrunItems";

const ALL_RELIC_IDS = Object.keys(BRAINRUN_RELICS) as BrainrunRelicId[];

describe("shouldEndRunOnDamage", () => {
  it("ends the run at 0 HP or below, not above", () => {
    expect(shouldEndRunOnDamage(0)).toBe(true);
    expect(shouldEndRunOnDamage(-1)).toBe(true);
    expect(shouldEndRunOnDamage(1)).toBe(false);
  });
});

describe("instantRoomHealthDelta", () => {
  it("only REST heals", () => {
    expect(instantRoomHealthDelta("REST")).toBe(1);
    expect(instantRoomHealthDelta("SHOP")).toBe(0);
    expect(instantRoomHealthDelta("EVENT")).toBe(0);
  });
});

describe("isBossAnswerTimedOut", () => {
  it("is true once the elapsed time reaches the boss question time limit", () => {
    expect(isBossAnswerTimedOut(0)).toBe(false);
    expect(isBossAnswerTimedOut(BRAINRUN_BOSS_QUESTION_TIME_MS - 1)).toBe(false);
    expect(isBossAnswerTimedOut(BRAINRUN_BOSS_QUESTION_TIME_MS)).toBe(true);
    expect(isBossAnswerTimedOut(BRAINRUN_BOSS_QUESTION_TIME_MS + 1000)).toBe(true);
  });
});

describe("brainrunBossDamage", () => {
  it("deals no damage on an incorrect answer, regardless of elapsed time", () => {
    expect(brainrunBossDamage(0, false)).toBe(0);
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS / 2, false)).toBe(0);
  });

  it("deals no damage once the question has timed out, even if marked correct", () => {
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS, true)).toBe(0);
  });

  it("deals maximum damage on an immediate correct answer", () => {
    expect(brainrunBossDamage(0, true)).toBe(
      BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
    );
  });

  it("decays linearly, point by point, down to 0 as elapsed time grows", () => {
    const maxDamage = BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER;
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS / 2, true)).toBe(maxDamage / 2);
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS - 1, true)).toBeGreaterThan(0);
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS - 1, true)).toBeLessThan(
      maxDamage / 2,
    );
  });
});

describe("applyBossMalusToDamage", () => {
  it("halves the damage for The Rock (damage_resist), rounded", () => {
    expect(applyBossMalusToDamage(50, "damage_resist")).toBe(
      Math.round(50 * BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER),
    );
    expect(applyBossMalusToDamage(21, "damage_resist")).toBe(
      Math.round(21 * BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER),
    );
  });

  it("leaves damage untouched for a miss, another malus, or no boss", () => {
    expect(applyBossMalusToDamage(0, "damage_resist")).toBe(0);
    expect(applyBossMalusToDamage(50, "swap_answers")).toBe(50);
    expect(applyBossMalusToDamage(50, undefined)).toBe(50);
  });

  it("is cancelled by the Antidote consumable (malusCancelled)", () => {
    expect(applyBossMalusToDamage(50, "damage_resist", true)).toBe(50);
  });
});

describe("flashMalusBonusTimeMs", () => {
  it("gives no reduction on Flash's very first boss question", () => {
    expect(flashMalusBonusTimeMs("speed_reduction", 0)).toBe(0);
  });

  it("reduces the time budget by 10% of the initial time per question already answered", () => {
    expect(flashMalusBonusTimeMs("speed_reduction", 1)).toBe(
      -Math.round(BRAINRUN_BOSS_QUESTION_TIME_MS * 0.1),
    );
    expect(flashMalusBonusTimeMs("speed_reduction", 3)).toBe(
      -Math.round(BRAINRUN_BOSS_QUESTION_TIME_MS * 0.3),
    );
  });

  it("caps the reduction at 50%, however many questions have been answered", () => {
    expect(flashMalusBonusTimeMs("speed_reduction", 5)).toBe(
      -Math.round(BRAINRUN_BOSS_QUESTION_TIME_MS * 0.5),
    );
    expect(flashMalusBonusTimeMs("speed_reduction", 20)).toBe(
      -Math.round(BRAINRUN_BOSS_QUESTION_TIME_MS * 0.5),
    );
  });

  it("gives no reduction for another malus, no boss, or once cancelled by Antidote", () => {
    expect(flashMalusBonusTimeMs("progressive_blur", 5)).toBe(0);
    expect(flashMalusBonusTimeMs(undefined, 5)).toBe(0);
    expect(flashMalusBonusTimeMs("speed_reduction", 5, true)).toBe(0);
  });
});

describe("isAlainMemoryIntro", () => {
  it("is true for Alain's very first boss question (no responses, no lookahead drawn yet)", () => {
    expect(isAlainMemoryIntro("memory_recall", 0, 1)).toBe(true);
  });

  it("is true again after Antidote skipped a preview reveal (lead back down to 1)", () => {
    // Cf. BrainrunService.submitAnswer (requiredLead) : une réponse validée avec l'Antidote actif
    // ne tire pas la question d'avance habituelle, donc questionIds.length - responsesCount
    // retombe à 1 comme à la toute première question, quel que soit le nombre de réponses déjà
    // données dans ce combat.
    expect(isAlainMemoryIntro("memory_recall", 4, 5)).toBe(true);
  });

  it("is false once a 2-question lead exists, however many responses so far (normal cycle)", () => {
    expect(isAlainMemoryIntro("memory_recall", 0, 2)).toBe(false);
    expect(isAlainMemoryIntro("memory_recall", 1, 3)).toBe(false);
  });

  it("is false for another malus or no boss", () => {
    expect(isAlainMemoryIntro("progressive_blur", 0, 1)).toBe(false);
    expect(isAlainMemoryIntro(undefined, 0, 1)).toBe(false);
  });
});

describe("nextRowAfterClear", () => {
  it("moves to the next row within the same act", () => {
    expect(nextRowAfterClear(1, 1)).toEqual({ kind: "AWAIT_CHOICE", act: 1, row: 2 });
    expect(nextRowAfterClear(2, 5)).toEqual({ kind: "AWAIT_CHOICE", act: 2, row: 6 });
  });

  it("moves to the next act after the boss row, unless it was the last act", () => {
    // L'acte 1 a 10 rangées (rangée Neutre + 9 étages), les actes 2/3 en ont 9 (pas de Neutre).
    expect(nextRowAfterClear(1, 10)).toEqual({ kind: "AWAIT_CHOICE", act: 2, row: 1 });
    expect(nextRowAfterClear(2, 9)).toEqual({ kind: "AWAIT_CHOICE", act: 3, row: 1 });
  });

  it("declares the run won after act 3's boss row", () => {
    expect(nextRowAfterClear(3, 9)).toEqual({ kind: "RUN_WON" });
  });
});

describe("calculBrainrunUserXP", () => {
  it("sums XP per combat room type and adds nothing for a lost run", () => {
    const xp = calculBrainrunUserXP(
      [{ type: "STANDARD" }, { type: "STANDARD" }, { type: "ELITE" }, { type: "REST" }],
      false,
    );
    expect(xp).toBe(15 + 15 + 35 + 0);
  });

  it("adds the win bonus only when the run was won", () => {
    const cleared = [{ type: "STANDARD" as const }, { type: "BOSS" as const }];
    const lostXp = calculBrainrunUserXP(cleared, false);
    const wonXp = calculBrainrunUserXP(cleared, true);
    expect(wonXp - lostXp).toBe(150);
  });
});

describe("generateActEdges", () => {
  const acts = [1, 2, 3];

  it("produces exactly the node counts declared by getBrainrunActRowWidths, for every act", () => {
    for (const act of acts) {
      const widths = getBrainrunActRowWidths(act);
      for (let i = 0; i < 50; i++) {
        const edges = generateActEdges(act);
        widths.forEach((width, idx) => {
          const row = idx + 1;
          expect(edges.filter((e) => e.row === row)).toHaveLength(width);
        });
      }
    }
  });

  it("never leaves a non-terminal node without an outgoing edge", () => {
    for (const act of acts) {
      const lastRow = getBrainrunActRowWidths(act).length;
      for (let i = 0; i < 50; i++) {
        const edges = generateActEdges(act);
        edges
          .filter((e) => e.row < lastRow)
          .forEach((e) => expect(e.nextCols.length).toBeGreaterThanOrEqual(1));
      }
    }
  });

  it("never leaves a node without an incoming edge (no orphans after row 2+)", () => {
    for (const act of acts) {
      const widths = getBrainrunActRowWidths(act);
      for (let i = 0; i < 50; i++) {
        const edges = generateActEdges(act);
        for (let row = 2; row <= widths.length; row++) {
          const width = widths[row - 1]!;
          const incoming = Array.from({ length: width }, () => 0);
          edges
            .filter((e) => e.row === row - 1)
            .forEach((e) => e.nextCols.forEach((c) => incoming[c]!++));
          incoming.forEach((count) => expect(count).toBeGreaterThanOrEqual(1));
        }
      }
    }
  });

  it("converges every node of the penultimate row onto the single Boss node", () => {
    for (const act of acts) {
      const edges = generateActEdges(act);
      const lastRow = getBrainrunActRowWidths(act).length;
      const bossNode = edges.find((e) => e.row === lastRow)!;
      expect(bossNode.col).toBe(0);
      expect(bossNode.nextCols).toEqual([]);
      edges.filter((e) => e.row === lastRow - 1).forEach((e) => expect(e.nextCols).toEqual([0]));
    }
  });

  it("is deterministic given a fixed random source", () => {
    const fixedRandom = () => 0.42;
    expect(generateActEdges(1, fixedRandom)).toEqual(generateActEdges(1, fixedRandom));
  });

  it("branches to 2 nodes at least 80% of the time (mono-routes stay rare)", () => {
    // La rangée avant-Boss converge toujours seule vers le Boss (cf. test précédent) : elle ne
    // représente pas un vrai choix de trajet, donc exclue de ce ratio.
    const branchableRow = getBrainrunActRowWidths(2).length - 1;
    let branchable = 0;
    let dualTarget = 0;
    for (let i = 0; i < 200; i++) {
      generateActEdges(2)
        .filter((e) => e.row < branchableRow)
        .forEach((e) => {
          branchable++;
          if (e.nextCols.length >= 2) dualTarget++;
        });
    }
    expect(dualTarget / branchable).toBeGreaterThanOrEqual(0.7);
  });
});

describe("assignNodeTypes", () => {
  const acts = [1, 2, 3];
  // L'étage 1 (3 Standard forcés), l'étage forcé Élite et la rangée Repos forcée avant le Boss
  // sont exclus des quotas libres — cf. assignNodeTypes/getActFloorLayout dans brainrunLogic.ts.
  // Reproduit ici le même calcul de rangées (déterministe, indépendant du tirage aléatoire).
  const floor1Row = (act: number) => (act === 1 ? 2 : 1);
  const restRow = (act: number) => getBrainrunActRowWidths(act).length - 1;
  const forcedEliteRow = (act: number) => floor1Row(act) + BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX;
  const nonBossNonNeutralNodeCount = (act: number) =>
    getBrainrunActRowWidths(act)
      .slice(0, -1)
      .reduce((sum, w) => sum + w, 0) - (act === 1 ? 1 : 0);
  const freeNodeCount = (act: number) => nonBossNonNeutralNodeCount(act) - 3 - 4 - 3; // floor1 + étage Élite + Repos

  it("assigns exactly one type per non-Boss, non-Neutral node, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        expect(assignNodeTypes(act)).toHaveLength(nonBossNonNeutralNodeCount(act));
      }
    }
  });

  it("respects the minimum quotas on the free mid-floors, across many random draws", () => {
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const assignments = assignNodeTypes(act);
        const freeAssignments = assignments.filter(
          (a) =>
            a.row !== floor1Row(act) && a.row !== restRow(act) && a.row !== forcedEliteRow(act),
        );
        const combatCount = freeAssignments.filter(
          (a) => a.type === "STANDARD" || a.type === "ELITE",
        ).length;
        const shopCount = freeAssignments.filter((a) => a.type === "SHOP").length;
        const restCount = freeAssignments.filter((a) => a.type === "REST").length;
        const eventCount = freeAssignments.filter((a) => a.type === "EVENT").length;

        expect(combatCount).toBeGreaterThanOrEqual(
          Math.ceil(freeNodeCount(act) * BRAINRUN_MIN_PURE_COMBAT_RATIO),
        );
        expect(shopCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_SHOP_OFFERS);
        expect(restCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_REST_OFFERS);
        expect(eventCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_EVENT_OFFERS);
      }
    }
  });

  it("is deterministic given a fixed random source", () => {
    const fixedRandom = () => 0.42;
    expect(assignNodeTypes(1, fixedRandom)).toEqual(assignNodeTypes(1, fixedRandom));
  });

  it("forces floor 1 to exactly 3 Standard nodes, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const assignments = assignNodeTypes(act);
        const types = assignments.filter((a) => a.row === floor1Row(act)).map((a) => a.type);
        expect(types).toEqual(["STANDARD", "STANDARD", "STANDARD"]);
      }
    }
  });

  it("forces the row right before the Boss to 100% Rest, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const assignments = assignNodeTypes(act);
        const types = assignments.filter((a) => a.row === restRow(act)).map((a) => a.type);
        expect(types.length).toBeGreaterThan(0);
        types.forEach((type) => expect(type).toBe("REST"));
      }
    }
  });

  it("forces at least one mid-floor to 100% Elite, guaranteeing every route crosses one", () => {
    for (const act of acts) {
      const assignments = assignNodeTypes(act);
      const midRows = [...new Set(assignments.map((a) => a.row))].filter(
        (row) => row > floor1Row(act) && row < restRow(act),
      );
      const fullyEliteRows = midRows.filter((row) =>
        assignments.filter((a) => a.row === row).every((a) => a.type === "ELITE"),
      );
      expect(fullyEliteRows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("never lets the Aimant à Événements relic touch floor 1, the forced-Elite floor or Rest", () => {
    // eventBonusChance à 1 convertirait normalement tout Standard/Elite en Événement : ces 3
    // étages fixes doivent rester intacts malgré ça (cf. fixedRows dans assignNodeTypes).
    for (const act of acts) {
      const assignments = assignNodeTypes(act, Math.random, 1);
      const floor1Types = assignments.filter((a) => a.row === floor1Row(act)).map((a) => a.type);
      expect(floor1Types).toEqual(["STANDARD", "STANDARD", "STANDARD"]);
      const restTypes = assignments.filter((a) => a.row === restRow(act)).map((a) => a.type);
      restTypes.forEach((type) => expect(type).toBe("REST"));
    }
  });
});

describe("generateActGraph", () => {
  it("combines edges and types into one node per slot, with the Boss on the last row", () => {
    for (const act of [1, 2, 3]) {
      const nodes = generateActGraph(act);
      const lastRow = getBrainrunActRowWidths(act).length;
      expect(nodes.find((n) => n.row === lastRow)!.type).toBe("BOSS");
      nodes.filter((n) => n.row !== lastRow).forEach((n) => expect(n.type).not.toBe("BOSS"));
    }
  });

  it("puts a Neutral node alone on row 1 of act 1 only", () => {
    const act1Row1 = generateActGraph(1).filter((n) => n.row === 1);
    expect(act1Row1).toHaveLength(1);
    expect(act1Row1[0]!.type).toBe("NEUTRAL");
    expect(act1Row1[0]!.col).toBe(0);

    for (const act of [2, 3]) {
      const nodes = generateActGraph(act);
      expect(nodes.some((n) => n.type === "NEUTRAL")).toBe(false);
    }
  });

  it("never lets any route from row 1 to the Boss exceed BRAINRUN_MAX_ELITE_PER_ROUTE Elites", () => {
    function countMaxElitesOnAnyRoute(nodes: BrainrunGraphNode[], bossRow: number): number {
      const byKey = new Map(nodes.map((n) => [`${n.row}:${n.col}`, n]));
      function walk(node: BrainrunGraphNode): number {
        const own = node.type === "ELITE" ? 1 : 0;
        if (node.row === bossRow) return own;
        const childMax = Math.max(
          0,
          ...node.nextCols.map((c) => walk(byKey.get(`${node.row + 1}:${c}`)!)),
        );
        return own + childMax;
      }
      return Math.max(...nodes.filter((n) => n.row === 1).map(walk));
    }

    for (const act of [1, 2, 3]) {
      for (let i = 0; i < 50; i++) {
        const nodes = generateActGraph(act);
        const bossRow = getBrainrunActRowWidths(act).length;
        expect(countMaxElitesOnAnyRoute(nodes, bossRow)).toBeLessThanOrEqual(
          BRAINRUN_MAX_ELITE_PER_ROUTE,
        );
      }
    }
  });
});

describe("enforceEliteRouteBounds", () => {
  // Graphe minimal en file simple (une seule route) : 1 -> 2 -> 3(Boss).
  function chain(types: ("STANDARD" | "ELITE")[]): BrainrunGraphNode[] {
    return [
      ...types.map((type, i) => ({ row: i + 1, col: 0, type, nextCols: [0] })),
      { row: types.length + 1, col: 0, type: "BOSS" as const, nextCols: [] },
    ];
  }

  it("leaves a route within the limit untouched", () => {
    const nodes = chain(["ELITE", "STANDARD", "ELITE"]);
    const result = enforceEliteRouteBounds(nodes, 4, 1);
    expect(result.map((n) => n.type)).toEqual(["ELITE", "STANDARD", "ELITE", "BOSS"]);
  });

  it("downgrades excess Elites until the route respects the limit", () => {
    const nodes = chain(["ELITE", "ELITE", "ELITE", "ELITE", "ELITE", "ELITE"]);
    const result = enforceEliteRouteBounds(nodes, 7, 1);
    const eliteCount = result.filter((n) => n.type === "ELITE").length;
    expect(eliteCount).toBeLessThanOrEqual(BRAINRUN_MAX_ELITE_PER_ROUTE);
  });

  it("never downgrades the protected (forced-Elite) row, even when fixing other rows", () => {
    const nodes = chain(["ELITE", "ELITE", "ELITE", "ELITE", "ELITE"]); // protected row 1 + 4 more
    const result = enforceEliteRouteBounds(nodes, 6, 1);
    expect(result[0]!.type).toBe("ELITE");
    expect(result.filter((n) => n.type === "ELITE").length).toBeLessThanOrEqual(
      BRAINRUN_MAX_ELITE_PER_ROUTE,
    );
  });
});

describe("maybeConvertNodeToEvent", () => {
  it("converts a Standard/Elite node to Event when the roll succeeds", () => {
    expect(maybeConvertNodeToEvent("STANDARD", 1, () => 0)).toBe("EVENT");
    expect(maybeConvertNodeToEvent("ELITE", 1, () => 0)).toBe("EVENT");
  });

  it("never converts when the chance is 0", () => {
    expect(maybeConvertNodeToEvent("STANDARD", 0, () => 0)).toBe("STANDARD");
  });

  it("never touches an already-special node or the Boss", () => {
    expect(maybeConvertNodeToEvent("SHOP", 1, () => 0)).toBe("SHOP");
    expect(maybeConvertNodeToEvent("REST", 1, () => 0)).toBe("REST");
    expect(maybeConvertNodeToEvent("EVENT", 1, () => 0)).toBe("EVENT");
    expect(maybeConvertNodeToEvent("BOSS", 1, () => 0)).toBe("BOSS");
  });

  it("leaves the node untouched when the roll fails", () => {
    expect(maybeConvertNodeToEvent("STANDARD", 0.3, () => 0.99)).toBe("STANDARD");
  });
});

describe("getCandidateCols", () => {
  it("returns every row-1 column when there is no cleared node yet", () => {
    const rooms = [
      { row: 1, col: 0, status: "PENDING", nextCols: [] },
      { row: 1, col: 1, status: "PENDING", nextCols: [] },
    ];
    expect(getCandidateCols(rooms, 1)).toEqual([0, 1]);
  });

  it("returns the nextCols of the cleared node in the previous row", () => {
    const rooms = [
      { row: 1, col: 0, status: "CLEARED", nextCols: [1, 2] },
      { row: 1, col: 1, status: "PENDING", nextCols: [0] },
      { row: 2, col: 1, status: "PENDING", nextCols: [] },
      { row: 2, col: 2, status: "PENDING", nextCols: [] },
    ];
    expect(getCandidateCols(rooms, 2)).toEqual([1, 2]);
  });

  it("returns an empty array when no node was cleared in the previous row (shouldn't happen in practice)", () => {
    const rooms = [{ row: 1, col: 0, status: "PENDING", nextCols: [] }];
    expect(getCandidateCols(rooms, 2)).toEqual([]);
  });
});

describe("pickCombatCandidate", () => {
  const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("never picks an excluded id while alternatives remain", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickCombatCandidate(pool, ["a", "b"]).id).toBe("c");
    }
  });

  it("falls back to the full pool once the exclusion would empty it", () => {
    const picked = new Set<string>();
    for (let i = 0; i < 50; i++) {
      picked.add(pickCombatCandidate(pool, ["a", "b", "c"]).id);
    }
    expect([...picked].sort()).toEqual(["a", "b", "c"]);
  });

  it("is deterministic given a fixed random source", () => {
    const fixedRandom = () => 0.5;
    expect(pickCombatCandidate(pool, [], fixedRandom)).toEqual(
      pickCombatCandidate(pool, [], fixedRandom),
    );
  });
});

describe("assignCombatIdentities", () => {
  const classicPool = [{ id: "c1" }, { id: "c2" }];
  const elitePool = [{ id: "e1" }, { id: "e2" }];
  const bossPool = [{ id: "b1" }];

  it("assigns an enemyId to every Standard/Elite node and a bossId to the Boss node", () => {
    const nodes = [
      { row: 1, col: 0, type: "STANDARD" as const },
      { row: 1, col: 1, type: "ELITE" as const },
      { row: 1, col: 2, type: "REST" as const },
      { row: 2, col: 0, type: "BOSS" as const },
    ];
    const identities = assignCombatIdentities(nodes, classicPool, elitePool, bossPool);
    expect(identities.find((i) => i.row === 1 && i.col === 0)).toMatchObject({
      enemyId: expect.any(String),
      bossId: null,
    });
    expect(identities.find((i) => i.row === 1 && i.col === 1)).toMatchObject({
      enemyId: expect.any(String),
      bossId: null,
    });
    expect(identities.find((i) => i.row === 1 && i.col === 2)).toEqual({
      row: 1,
      col: 2,
      enemyId: null,
      bossId: null,
    });
    expect(identities.find((i) => i.row === 2 && i.col === 0)).toEqual({
      row: 2,
      col: 0,
      enemyId: null,
      bossId: "b1",
    });
  });

  it("never assigns the same Standard enemy twice while the classic pool isn't exhausted", () => {
    const nodes = [
      { row: 1, col: 0, type: "STANDARD" as const },
      { row: 1, col: 1, type: "STANDARD" as const },
    ];
    const identities = assignCombatIdentities(nodes, classicPool, elitePool, bossPool);
    expect(identities[0]!.enemyId).not.toBe(identities[1]!.enemyId);
  });

  it("keeps Standard and Elite exclusion pools separate", () => {
    const nodes = [
      { row: 1, col: 0, type: "STANDARD" as const },
      { row: 1, col: 1, type: "ELITE" as const },
    ];
    const identities = assignCombatIdentities(nodes, classicPool, elitePool, bossPool);
    expect(classicPool.map((c) => c.id)).toContain(identities[0]!.enemyId);
    expect(elitePool.map((e) => e.id)).toContain(identities[1]!.enemyId);
  });
});

describe("effectiveThemes", () => {
  it("removes banned themes from the list", () => {
    expect(effectiveThemes(["cinema", "series_cultes"], ["cinema"])).toEqual(["series_cultes"]);
  });

  it("returns the themes unchanged when nothing is banned", () => {
    expect(effectiveThemes(["cinema", "series_cultes"], [])).toEqual(["cinema", "series_cultes"]);
  });

  it("falls back to the unfiltered themes if banning would empty the list", () => {
    expect(effectiveThemes(["cinema"], ["cinema"])).toEqual(["cinema"]);
  });
});

describe("getActiveRelicEffects", () => {
  it("returns neutral effects when no relic is owned", () => {
    expect(getActiveRelicEffects([])).toEqual({
      goldMultiplier: 1,
      flatGoldBonusPerRoom: 0,
      bossTimeBonusMs: 0,
      bossDamageBonusPerHit: 0,
      hasExtraLife: false,
      shopPriceMultiplier: 1,
      autoRestockShop: false,
      eventBonusChance: 0,
      hasForesight: false,
      goldOnBonusSkip: 0,
      autoHintChance: 0,
      healChanceOnCombatEnd: 0,
      bonusConsumableSlots: 0,
    });
  });

  it("aggregates every relic's effect", () => {
    const effects = getActiveRelicEffects(ALL_RELIC_IDS);
    expect(effects.goldMultiplier).toBeCloseTo(1.2);
    expect(effects.flatGoldBonusPerRoom).toBe(5);
    expect(effects.healChanceOnCombatEnd).toBeCloseTo(0.2);
    expect(effects.bossTimeBonusMs).toBe(3000);
    expect(effects.bossDamageBonusPerHit).toBe(5);
    expect(effects.hasExtraLife).toBe(true);
    expect(effects.shopPriceMultiplier).toBeCloseTo(0.8);
    expect(effects.autoRestockShop).toBe(true);
    expect(effects.eventBonusChance).toBeCloseTo(0.3);
    expect(effects.hasForesight).toBe(true);
    expect(effects.goldOnBonusSkip).toBe(15);
    expect(effects.autoHintChance).toBeCloseTo(0.05);
    expect(effects.bonusConsumableSlots).toBe(2);
  });

  it("ignores unknown ids", () => {
    expect(getActiveRelicEffects(["NOT_A_RELIC"]).goldMultiplier).toBe(1);
  });
});

describe("goldToKnowledgePoints", () => {
  it("converts gold at the configured ratio, rounded down", () => {
    expect(goldToKnowledgePoints(0)).toBe(0);
    expect(goldToKnowledgePoints(7)).toBe(1); // 7 * 0.2 = 1.4 -> 1, not 1.4
    expect(goldToKnowledgePoints(100)).toBe(20);
  });

  it("never goes negative", () => {
    expect(goldToKnowledgePoints(-50)).toBe(0);
  });
});

describe("getActiveTalentEffects", () => {
  it("returns neutral effects when no talent is unlocked", () => {
    expect(getActiveTalentEffects([])).toEqual({
      bonusStartHp: 0,
      bonusStartGold: 0,
      rareRelicWeightBonus: 0,
      bonusBossDamagePerHit: 0,
    });
  });

  it("aggregates every talent's effect", () => {
    const effects = getActiveTalentEffects([
      "TOUGH_START",
      "RARE_FINDER",
      "STARTING_CAPITAL",
      "BOSS_STRIKE",
    ]);
    expect(effects.bonusStartHp).toBe(1);
    expect(effects.rareRelicWeightBonus).toBe(2);
    expect(effects.bonusStartGold).toBe(20);
    expect(effects.bonusBossDamagePerHit).toBe(3);
  });

  it("ignores unknown ids", () => {
    expect(getActiveTalentEffects(["NOT_A_TALENT"]).bonusStartHp).toBe(0);
  });
});

describe("applyRelicsToGold", () => {
  it("applies the multiplier then the flat bonus", () => {
    const effects = getActiveRelicEffects(["ENCYCLOPEDIA", "PROVIDENT_PURSE"]);
    expect(applyRelicsToGold(10, effects)).toBe(Math.round(10 * 1.2) + 5);
  });

  it("leaves a zero gain untouched", () => {
    const effects = getActiveRelicEffects(["ENCYCLOPEDIA"]);
    expect(applyRelicsToGold(0, effects)).toBe(0);
  });
});

describe("applyRelicsToBossDamage", () => {
  const effects = getActiveRelicEffects(["ADRENALINE"]);

  it("adds the flat bonus on a successful hit", () => {
    expect(applyRelicsToBossDamage(BRAINRUN_BOSS_BASE_DAMAGE, effects)).toBe(
      BRAINRUN_BOSS_BASE_DAMAGE + 5,
    );
  });

  it("never grants a bonus on a miss", () => {
    expect(applyRelicsToBossDamage(0, effects)).toBe(0);
  });
});

describe("bossQuestionTimeMsWithRelics", () => {
  it("extends the base time by the relic's bonus", () => {
    const effects = getActiveRelicEffects(["BROKEN_CHRONOMETER"]);
    expect(bossQuestionTimeMsWithRelics(effects)).toBe(BRAINRUN_BOSS_QUESTION_TIME_MS + 3000);
  });

  it("equals the base time with no relevant relic", () => {
    expect(bossQuestionTimeMsWithRelics(getActiveRelicEffects([]))).toBe(
      BRAINRUN_BOSS_QUESTION_TIME_MS,
    );
  });
});

describe("isBossAnswerTimedOut with a relic bonus", () => {
  it("pushes back the timeout by the bonus duration", () => {
    expect(isBossAnswerTimedOut(BRAINRUN_BOSS_QUESTION_TIME_MS, 3000)).toBe(false);
    expect(isBossAnswerTimedOut(BRAINRUN_BOSS_QUESTION_TIME_MS + 3000, 3000)).toBe(true);
  });
});

describe("consumeShieldIfArmed", () => {
  it("cancels the loss and consumes the shield when armed and a loss occurred", () => {
    expect(consumeShieldIfArmed(true, 2)).toEqual({ hpLoss: 0, shieldConsumed: true });
  });

  it("leaves the loss untouched when not armed", () => {
    expect(consumeShieldIfArmed(false, 2)).toEqual({ hpLoss: 2, shieldConsumed: false });
  });

  it("doesn't consume the shield when there was no loss to cancel", () => {
    expect(consumeShieldIfArmed(true, 0)).toEqual({ hpLoss: 0, shieldConsumed: false });
  });
});

describe("generateBonusOffers", () => {
  it("always returns exactly BRAINRUN_BONUS_OFFER_COUNT offers", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateBonusOffers([])).toHaveLength(BRAINRUN_BONUS_OFFER_COUNT);
    }
  });

  it("never offers an already-owned relic, except the stackable Cœur Supplémentaire", () => {
    const owned: string[] = ALL_RELIC_IDS.slice(0, ALL_RELIC_IDS.length - 1);
    for (let i = 0; i < 50; i++) {
      const offers = generateBonusOffers(owned);
      const relicOffers = offers.filter((o) => o.kind === "RELIC" && o.id !== "EXTRA_HEART");
      relicOffers.forEach((o) => expect(owned).not.toContain(o.id));
    }
  });

  it("falls back to consumables (and the stackable Cœur Supplémentaire) once every relic is owned", () => {
    const offers = generateBonusOffers(ALL_RELIC_IDS);
    expect(
      offers.every(
        (o) =>
          o.kind === "CONSUMABLE" ||
          o.kind === "GOLD" ||
          (o.kind === "RELIC" && o.id === "EXTRA_HEART"),
      ),
    ).toBe(true);
  });
});

describe("generateShopOffers", () => {
  it("always returns the relic slots plus the consumable slots", () => {
    const offers = generateShopOffers([]);
    expect(offers).toHaveLength(
      BRAINRUN_SHOP_RELIC_OFFER_COUNT + BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT,
    );
    const relicOffers = offers.filter((o) => o.kind === "RELIC");
    expect(relicOffers).toHaveLength(BRAINRUN_SHOP_RELIC_OFFER_COUNT);
    relicOffers.forEach((o) => expect(o.price).toBeGreaterThan(0));
  });

  it("replaces relic slots with free gold offers once every relic is owned, except one slot kept for the stackable Cœur Supplémentaire", () => {
    const offers = generateShopOffers(ALL_RELIC_IDS);
    const relicOffers = offers.filter((o) => o.kind === "RELIC");
    const goldOffers = offers.filter((o) => o.kind === "GOLD");
    expect(relicOffers).toHaveLength(1);
    expect(relicOffers[0]!.id).toBe("EXTRA_HEART");
    expect(goldOffers).toHaveLength(BRAINRUN_SHOP_RELIC_OFFER_COUNT - 1);
    goldOffers.forEach((o) => expect(o.price).toBe(0));
  });

  it("applies the price multiplier to both relic and consumable offers (relique Marchandeur)", () => {
    // PRNG déterministe et partagée entre les deux tirages : sinon les offres piochées (et donc
    // leurs prix de base) diffèrent d'un appel à l'autre et la comparaison n'a plus de sens.
    function seededRandom(seed: number): () => number {
      let state = seed;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    }
    const full = generateShopOffers([], seededRandom(42), 0, 1);
    const discounted = generateShopOffers([], seededRandom(42), 0, 0.8);
    full.forEach((o, i) => {
      if (o.price === undefined || o.price === 0) return;
      expect(discounted[i]!.price).toBe(Math.round(o.price * 0.8));
    });
  });

  it("keeps offering a stackable relic (Cœur Supplémentaire) even once already owned", () => {
    const owned = ["EXTRA_HEART"];
    const sawExtraHeart = Array.from({ length: 50 }, () => generateShopOffers(owned)).some(
      (offers) => offers.some((o) => o.kind === "RELIC" && o.id === "EXTRA_HEART"),
    );
    expect(sawExtraHeart).toBe(true);
  });

  it("offers RARE relics more often when a rare-weight bonus is applied (talent Œil affûté)", () => {
    // PRNG déterministe (pas Math.random) : le test doit rester stable d'une exécution à l'autre.
    function seededRandom(seed: number): () => number {
      let state = seed;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    }
    function rareRatio(rareWeightBonus: number): number {
      const random = seededRandom(1);
      let rare = 0;
      let total = 0;
      for (let i = 0; i < 300; i++) {
        generateShopOffers([], random, rareWeightBonus)
          .filter((o) => o.kind === "RELIC")
          .forEach((o) => {
            total++;
            if (o.rarity === "RARE") rare++;
          });
      }
      return rare / total;
    }

    expect(rareRatio(2)).toBeGreaterThan(rareRatio(0));
  });
});

describe("generateShopReplacementOffer", () => {
  it("replaces a bought relic with another unowned relic (relique Fournisseur Fidèle)", () => {
    const owned = ALL_RELIC_IDS.slice(0, ALL_RELIC_IDS.length - 1);
    const replacement = generateShopReplacementOffer("RELIC", owned);
    const replacementWasAlreadyOwned =
      replacement.kind === "RELIC" &&
      replacement.id !== "EXTRA_HEART" &&
      (owned as string[]).includes(replacement.id);
    expect(replacementWasAlreadyOwned).toBe(false);
  });

  it("returns the stackable Cœur Supplémentaire once every other relic is owned", () => {
    const replacement = generateShopReplacementOffer("RELIC", ALL_RELIC_IDS);
    expect(replacement.kind).toBe("RELIC");
    expect((replacement as { id?: string }).id).toBe("EXTRA_HEART");
  });

  it("replaces a bought consumable with another consumable", () => {
    const replacement = generateShopReplacementOffer("CONSUMABLE", []);
    expect(replacement.kind).toBe("CONSUMABLE");
  });

  it("applies the price multiplier to the replacement offer", () => {
    const replacement = generateShopReplacementOffer("CONSUMABLE", [], Math.random, 0, 0.8);
    const fullPrice =
      BRAINRUN_CONSUMABLES[replacement.id as keyof typeof BRAINRUN_CONSUMABLES].shopPrice!;
    expect(replacement.price).toBe(Math.round(fullPrice * 0.8));
  });
});

describe("resolveEventOption", () => {
  it("nets cost against reward for hp and gold", () => {
    const result = resolveEventOption(
      { label: "test", cost: { hp: 1, gold: 10 }, reward: { gold: 15 } },
      { ownedRelics: [] },
    );
    expect(result.hpDelta).toBe(-1);
    expect(result.goldDelta).toBe(5);
    expect(result.relicGranted).toBeNull();
    expect(result.consumablesGranted).toEqual([]);
  });

  it("grants an unowned random relic when the pool isn't exhausted", () => {
    const owned = ALL_RELIC_IDS.slice(0, ALL_RELIC_IDS.length - 1);
    const result = resolveEventOption(
      { label: "test", reward: { relic: "RANDOM" } },
      { ownedRelics: owned },
    );
    expect(result.relicGranted).not.toBeNull();
    // Cœur Supplémentaire est cumulable : le seul cas où il peut légitimement apparaître dans owned.
    if (result.relicGranted !== "EXTRA_HEART") {
      expect(owned).not.toContain(result.relicGranted);
    }
  });

  it("grants the stackable Cœur Supplémentaire when every other relic is owned", () => {
    const result = resolveEventOption(
      { label: "test", reward: { relic: "RANDOM" } },
      { ownedRelics: ALL_RELIC_IDS },
    );
    expect(result.relicGranted).toBe("EXTRA_HEART");
  });

  it("passes through granted consumables untouched", () => {
    const result = resolveEventOption(
      { label: "test", reward: { consumables: [{ id: "FIFTY_FIFTY", amount: 2 }] } },
      { ownedRelics: [] },
    );
    expect(result.consumablesGranted).toEqual([{ id: "FIFTY_FIFTY", amount: 2 }]);
  });

  it("resolves a RANDOM consumable reward to a concrete catalog id", () => {
    for (let i = 0; i < 20; i++) {
      const result = resolveEventOption(
        { label: "test", reward: { consumables: [{ id: "RANDOM", amount: 1 }] } },
        { ownedRelics: [] },
      );
      expect(result.consumablesGranted).toHaveLength(1);
      expect(Object.keys(BRAINRUN_CONSUMABLES)).toContain(result.consumablesGranted[0]!.id);
    }
  });

  it("sacrifices a random owned relic on a RANDOM_OWNED cost", () => {
    const owned = [ALL_RELIC_IDS[0]!, ALL_RELIC_IDS[1]!];
    const result = resolveEventOption(
      { label: "test", cost: { relic: "RANDOM_OWNED" }, reward: { relic: "RANDOM" } },
      { ownedRelics: owned },
    );
    expect(owned).toContain(result.relicLost);
    expect(result.relicGranted).not.toBeNull();
    expect(result.relicGranted).not.toBe(result.relicLost);
  });

  it("has no relic to sacrifice when none is owned", () => {
    const result = resolveEventOption(
      { label: "test", cost: { relic: "RANDOM_OWNED" }, reward: { relic: "RANDOM" } },
      { ownedRelics: [] },
    );
    expect(result.relicLost).toBeNull();
  });
});

describe("pickFiftyFiftyEliminations", () => {
  it("eliminates half the propositions (rounded down), excluding the correct one", () => {
    for (let i = 0; i < 50; i++) {
      const eliminated = pickFiftyFiftyEliminations([1, 2, 3, 4], 1);
      expect(eliminated).toHaveLength(2);
      expect(eliminated).not.toContain(1);
    }
  });

  it("eliminates a single wrong answer on a true/false question", () => {
    const eliminated = pickFiftyFiftyEliminations([1, 2], 1);
    expect(eliminated).toEqual([2]);
  });

  it("handles an odd proposition count", () => {
    for (let i = 0; i < 50; i++) {
      const eliminated = pickFiftyFiftyEliminations([1, 2, 3], 1);
      expect(eliminated).toHaveLength(1);
      expect(eliminated).not.toContain(1);
    }
  });
});

describe("pickPhoneAFriendHint", () => {
  it("always suggests the correct answer on the easiest difficulty", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickPhoneAFriendHint([1, 2, 3, 4], 1, 1)).toBe(1);
    }
  });

  it("can suggest a wrong answer on the hardest difficulty, given an unlucky roll", () => {
    const unluckyRandom = () => 0;
    const hint = pickPhoneAFriendHint([1, 2, 3, 4], 1, 5, unluckyRandom);
    expect(hint).not.toBe(1);
  });

  it("suggests the correct answer given a lucky roll, even at max difficulty", () => {
    const luckyRandom = () => 0.99;
    expect(pickPhoneAFriendHint([1, 2, 3, 4], 1, 5, luckyRandom)).toBe(1);
  });
});

describe("BRAINRUN_CONSUMABLES catalog", () => {
  it("defines exactly the 10 documented consumables", () => {
    expect(Object.keys(BRAINRUN_CONSUMABLES).sort()).toEqual(
      [
        "FIFTY_FIFTY",
        "PHONE_A_FRIEND",
        "SHIELD",
        "BOSS_CHRONO_BOOST",
        "BOSS_DAMAGE_BOOST",
        "MALUS_CANCEL",
        "REDRAW_QUESTION",
        "HEAL_POTION",
        "RANDOM_STASH",
        "REVIVE_TOKEN",
      ].sort(),
    );
  });

  it("never sells REVIVE_TOKEN in the shop", () => {
    expect(BRAINRUN_CONSUMABLES.REVIVE_TOKEN.shopPrice).toBeUndefined();
  });
});

describe("pickRandomStashConsumables", () => {
  it("always draws the requested count, only from the COMMON pool", () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickRandomStashConsumables(Math.random, 3);
      expect(picked).toHaveLength(3);
      picked.forEach((id) => expect(BRAINRUN_CONSUMABLES[id].rarity).toBe("COMMON"));
    }
  });

  it("is deterministic given a fixed random source", () => {
    const fixedRandom = () => 0.42;
    expect(pickRandomStashConsumables(fixedRandom, 3)).toEqual(
      pickRandomStashConsumables(fixedRandom, 3),
    );
  });
});
