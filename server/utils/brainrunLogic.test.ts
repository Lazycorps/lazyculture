import { describe, it, expect } from "vite-plus/test";
import {
  applyBossMalusToDamage,
  applyRelicsToBossDamage,
  applyRelicsToGold,
  applyTalentsToGold,
  assignCombatIdentities,
  assignEventIdentities,
  assignNodeTypes,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  brainrunGlobalFloor,
  buildCombatThemeWeights,
  enemyThemeBonus,
  generateThemeCards,
  topThemes,
  rankBrainrunPlayers,
  type BrainrunRankRun,
  calculBrainrunUserXP,
  consumeShieldCharge,
  effectiveThemes,
  enforceEliteRouteBounds,
  flashMalusBonusTimeMs,
  generateActEdges,
  grantShieldCharge,
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
  pickRandomCommonRelic,
  pickRandomConsumable,
  pickRandomStashConsumables,
  resolveEventOption,
  shouldEndRunOnDamage,
  type BrainrunGraphNode,
} from "./brainrunLogic";
import {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_MAX_CONSECUTIVE_MONO_NODES,
  BRAINRUN_MAX_TARGET_DRIFT,
  BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT,
  BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE,
  BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX,
  BRAINRUN_MAX_ELITE_PER_ROUTE,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER,
  BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY,
  BRAINRUN_THEME_COEFFICIENT_MAX,
  getBrainrunRoomsPerAct,
  pickBrainrunActRowWidths,
  pickBrainrunMidFloorWidths,
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

describe("pickBrainrunMidFloorWidths", () => {
  it("keeps the row count of an act constant despite varying widths", () => {
    for (const act of [1, 2, 3]) {
      for (let i = 0; i < 200; i++) {
        expect(pickBrainrunActRowWidths(act)).toHaveLength(getBrainrunRoomsPerAct(act));
      }
    }
  });

  it("draws a smooth silhouette with rare wide rows", () => {
    for (let i = 0; i < 500; i++) {
      const mid = pickBrainrunMidFloorWidths();
      expect(mid).toHaveLength(6);
      // Les étages fixes qui encadrent (3 nœuds) comptent comme voisins : aucune marche > 1.
      const withFixedNeighbours = [3, ...mid, 3];
      for (let floor = 1; floor < withFixedNeighbours.length; floor++) {
        const step = Math.abs(withFixedNeighbours[floor]! - withFixedNeighbours[floor - 1]!);
        expect(step).toBeLessThanOrEqual(1);
      }
      mid.forEach((width) => {
        expect(width).toBeGreaterThanOrEqual(2);
        expect(width).toBeLessThanOrEqual(4);
      });
      const wideRows = mid.filter((w) => w === 4).length;
      expect(wideRows).toBeGreaterThanOrEqual(1); // sinon aucune voie de traverse possible
      expect(wideRows).toBeLessThanOrEqual(2);
    }
  });

  it("actually varies from one draw to the next", () => {
    const shapes = new Set(
      Array.from({ length: 200 }, () => pickBrainrunMidFloorWidths().join(",")),
    );
    // Le repli ([2,3,4,4,3,2]) est une forme parmi d'autres : si le tirage échouait
    // systématiquement, on n'en verrait qu'une seule.
    expect(shapes.size).toBeGreaterThan(5);
  });
});

describe("generateActEdges", () => {
  const acts = [1, 2, 3];

  it("produces exactly the node counts of the silhouette it was given, for every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        widths.forEach((width, idx) => {
          const row = idx + 1;
          expect(edges.filter((e) => e.row === row)).toHaveLength(width);
        });
      }
    }
  });

  it("never leaves a non-terminal node without an outgoing edge", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        edges
          .filter((e) => e.row < widths.length)
          .forEach((e) => expect(e.nextCols.length).toBeGreaterThanOrEqual(1));
      }
    }
  });

  it("never leaves a node without an incoming edge (no orphans after row 2+)", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
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
      const widths = pickBrainrunActRowWidths(act);
      const edges = generateActEdges(widths);
      const lastRow = widths.length;
      const bossNode = edges.find((e) => e.row === lastRow)!;
      expect(bossNode.col).toBe(0);
      expect(bossNode.nextCols).toEqual([]);
      edges.filter((e) => e.row === lastRow - 1).forEach((e) => expect(e.nextCols).toEqual([0]));
    }
  });

  it("is deterministic given a fixed random source and silhouette", () => {
    const fixedRandom = () => 0.42;
    const widths = pickBrainrunActRowWidths(1, fixedRandom);
    expect(generateActEdges(widths, fixedRandom)).toEqual(generateActEdges(widths, fixedRandom));
  });

  it("never chains more than BRAINRUN_MAX_CONSECUTIVE_MONO_NODES single-target nodes on a route", () => {
    // Le joueur doit retrouver un vrai choix au moins tous les 3 nœuds en montant. On mesure sur
    // les trajets réels (pas rangée par rangée) : la chaîne se propage d'un nœud à ses successeurs.
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        const byKey = new Map(edges.map((e) => [`${e.row}:${e.col}`, e]));

        const longestChain = (edge: (typeof edges)[number], inherited: number): number => {
          const chain = edge.nextCols.length === 1 ? inherited + 1 : 0;
          if (edge.nextCols.length === 0) return chain;
          return Math.max(
            chain,
            ...edge.nextCols.map((col) =>
              longestChain(byKey.get(`${edge.row + 1}:${col}`)!, chain),
            ),
          );
        };

        const worst = Math.max(...edges.filter((e) => e.row === 1).map((e) => longestChain(e, 0)));
        expect(worst).toBeLessThanOrEqual(BRAINRUN_MAX_CONSECUTIVE_MONO_NODES);
      }
    }
  });

  it("never lets a whole row share one combination of targets", () => {
    // Le défaut d'origine : une rangée où tous les nœuds mènent au même endroit, d'où l'impression
    // que tous les chemins se valent. Deux nœuds mono-cible qui convergent vers le même nœud
    // suivant restent normaux (des trajets qui fusionnent) — ce n'est un problème que si TOUTE la
    // rangée le fait.
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const widths = pickBrainrunActRowWidths(act);
        // La convergence de l'avant-dernière rangée vers l'unique Boss est légitime.
        const lastBranchingRow = widths.length - 2;
        const edges = generateActEdges(widths);
        for (let row = 1; row <= lastBranchingRow; row++) {
          const signatures = edges
            .filter((e) => e.row === row)
            .map((e) => [...e.nextCols].sort((a, b) => a - b).join(","));
          if (signatures.length < 2) continue;
          expect(new Set(signatures).size).toBeGreaterThan(1);
        }
      }
    }
  });

  it("almost never offers two nodes of a row the exact same choice", () => {
    // Deux nœuds proposant la MÊME paire d'options est le cas qui brouille vraiment la lecture.
    // Ce n'est pas éliminable à 100% : sur une rangée qui rétrécit (3 → 2), si la cadence de
    // branchement oblige deux nœuds voisins à offrir un choix, l'adjacence ne laisse qu'un seul
    // intervalle possible aux deux. La cadence prime alors sur l'unicité (cf. buildRowTargets),
    // mais un score de pénalité réserve ce cas au strict inévitable.
    let rows = 0;
    let duplicatedChoices = 0;
    for (const act of acts) {
      for (let i = 0; i < 300; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        for (let row = 1; row <= widths.length - 2; row++) {
          rows++;
          const choices = edges
            .filter((e) => e.row === row && e.nextCols.length >= 2)
            .map((e) => e.nextCols.join(","));
          if (new Set(choices).size !== choices.length) duplicatedChoices++;
        }
      }
    }
    expect(duplicatedChoices / rows).toBeLessThan(0.01);
  });

  it("never lets an edge jump over a node (targets stay adjacent, no 1 -> 3)", () => {
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        for (let row = 1; row < widths.length; row++) {
          const fromWidth = widths[row - 1]!;
          const toWidth = widths[row]!;
          edges
            .filter((e) => e.row === row)
            .forEach((e) => {
              // Les cibles d'un nœud forment toujours un bloc contigu : jamais [1, 3].
              const sorted = [...e.nextCols].sort((a, b) => a - b);
              sorted.forEach((c, idx) => {
                if (idx > 0) expect(c - sorted[idx - 1]!).toBe(1);
              });
              // Et la colonne visée reste adjacente à celle du nœud source (indices bruts) : aucun
              // trait ne passe au-dessus d'un nœud intermédiaire. Seules les deux transitions dont
              // la géométrie l'interdit sont exemptées : le nœud Neutre seul vers l'étage 1, et la
              // convergence de l'avant-dernière rangée vers l'unique Boss (cf. canEnforceTargetDrift).
              if (Math.abs(fromWidth - toWidth) > BRAINRUN_MAX_TARGET_DRIFT) return;
              sorted.forEach((c) => {
                expect(Math.abs(c - e.col)).toBeLessThanOrEqual(BRAINRUN_MAX_TARGET_DRIFT);
              });
            });
        }
      }
    }
  });

  it("never crosses two routes (targets stay monotonic from left to right)", () => {
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const edges = generateActEdges(widths);
        for (let row = 1; row < widths.length; row++) {
          const rowEdges = edges.filter((e) => e.row === row).sort((a, b) => a.col - b.col);
          for (let col = 1; col < rowEdges.length; col++) {
            const previous = rowEdges[col - 1]!.nextCols;
            const current = rowEdges[col]!.nextCols;
            expect(Math.min(...current)).toBeGreaterThanOrEqual(Math.min(...previous));
            expect(Math.max(...current)).toBeGreaterThanOrEqual(Math.max(...previous));
          }
        }
      }
    }
  });
});

describe("assignNodeTypes", () => {
  const acts = [1, 2, 3];
  // L'étage 1 (3 Standard forcés), l'étage forcé Élite et la rangée Repos forcée avant le Boss
  // sont exclus des quotas libres — cf. assignNodeTypes/getActFloorLayout dans brainrunLogic.ts.
  // Reproduit ici le même calcul de rangées (déterministe, indépendant du tirage aléatoire).
  const floor1Row = (act: number) => (act === 1 ? 2 : 1);
  // Le NOMBRE de rangées est fixe même si leurs largeurs sont tirées : ces trois rangées gardent
  // donc une position déterministe, seule leur largeur varie d'une silhouette à l'autre.
  const restRow = (widths: number[]) => widths.length - 1;
  const forcedEliteRow = (act: number) => floor1Row(act) + BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX;
  const nonBossNonNeutralNodeCount = (widths: number[], act: number) =>
    widths.slice(0, -1).reduce((sum, w) => sum + w, 0) - (act === 1 ? 1 : 0);
  const freeNodeCount = (widths: number[], act: number) =>
    nonBossNonNeutralNodeCount(widths, act) -
    widths[floor1Row(act) - 1]! -
    widths[forcedEliteRow(act) - 1]! -
    widths[restRow(widths) - 1]!;

  it("assigns exactly one type per non-Boss, non-Neutral node, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const widths = pickBrainrunActRowWidths(act);
        expect(assignNodeTypes(widths, act)).toHaveLength(nonBossNonNeutralNodeCount(widths, act));
      }
    }
  });

  it("respects the minimum quotas on the free mid-floors, across many random draws", () => {
    for (const act of acts) {
      for (let i = 0; i < 200; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const assignments = assignNodeTypes(widths, act);
        const freeAssignments = assignments.filter(
          (a) =>
            a.row !== floor1Row(act) && a.row !== restRow(widths) && a.row !== forcedEliteRow(act),
        );
        const combatCount = freeAssignments.filter(
          (a) => a.type === "STANDARD" || a.type === "ELITE",
        ).length;
        const shopCount = freeAssignments.filter((a) => a.type === "SHOP").length;
        const restCount = freeAssignments.filter((a) => a.type === "REST").length;
        const eventCount = freeAssignments.filter((a) => a.type === "EVENT").length;

        expect(combatCount).toBeGreaterThanOrEqual(
          Math.ceil(freeNodeCount(widths, act) * BRAINRUN_MIN_PURE_COMBAT_RATIO),
        );
        expect(shopCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_SHOP_OFFERS);
        expect(restCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_REST_OFFERS);
        expect(eventCount).toBeGreaterThanOrEqual(BRAINRUN_MIN_EVENT_OFFERS);
      }
    }
  });

  it("is deterministic given a fixed random source and silhouette", () => {
    const fixedRandom = () => 0.42;
    const widths = pickBrainrunActRowWidths(1, fixedRandom);
    expect(assignNodeTypes(widths, 1, fixedRandom)).toEqual(
      assignNodeTypes(widths, 1, fixedRandom),
    );
  });

  it("forces floor 1 to exactly 3 Standard nodes, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const assignments = assignNodeTypes(pickBrainrunActRowWidths(act), act);
        const types = assignments.filter((a) => a.row === floor1Row(act)).map((a) => a.type);
        expect(types).toEqual(["STANDARD", "STANDARD", "STANDARD"]);
      }
    }
  });

  it("forces the row right before the Boss to 100% Rest, on every act", () => {
    for (const act of acts) {
      for (let i = 0; i < 50; i++) {
        const widths = pickBrainrunActRowWidths(act);
        const assignments = assignNodeTypes(widths, act);
        const types = assignments.filter((a) => a.row === restRow(widths)).map((a) => a.type);
        expect(types.length).toBeGreaterThan(0);
        types.forEach((type) => expect(type).toBe("REST"));
      }
    }
  });

  it("forces at least one mid-floor to 100% Elite, guaranteeing every route crosses one", () => {
    for (const act of acts) {
      const widths = pickBrainrunActRowWidths(act);
      const assignments = assignNodeTypes(widths, act);
      const midRows = [...new Set(assignments.map((a) => a.row))].filter(
        (row) => row > floor1Row(act) && row < restRow(widths),
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
      const widths = pickBrainrunActRowWidths(act);
      const assignments = assignNodeTypes(widths, act, Math.random, 1);
      const floor1Types = assignments.filter((a) => a.row === floor1Row(act)).map((a) => a.type);
      expect(floor1Types).toEqual(["STANDARD", "STANDARD", "STANDARD"]);
      const restTypes = assignments.filter((a) => a.row === restRow(widths)).map((a) => a.type);
      restTypes.forEach((type) => expect(type).toBe("REST"));
    }
  });
});

describe("generateActGraph", () => {
  it("combines edges and types into one node per slot, with the Boss on the last row", () => {
    for (const act of [1, 2, 3]) {
      const nodes = generateActGraph(act);
      // La silhouette est tirée dans generateActGraph, mais le NOMBRE de rangées reste fixe :
      // c'est l'invariant dont dépend nextRowAfterClear pour détecter la fin d'acte.
      const lastRow = getBrainrunRoomsPerAct(act);
      expect(Math.max(...nodes.map((n) => n.row))).toBe(lastRow);
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
        const bossRow = getBrainrunRoomsPerAct(act);
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

  it("never repeats an Elite along a single route, even when the map has more Elite nodes than the pool", () => {
    // Deux routes partageant un même nœud Élite final, alimenté par 2 nœuds Élite parallèles :
    //   r1c0 (STANDARD) → r2c0/r2c1 (ELITE) → r3c0 (ELITE) → r4c0 (BOSS)
    // 3 nœuds Élite pour un pool de 2 : l'ancienne exclusion globale épuisait le pool et
    // réutilisait e1/e2 arbitrairement sur un trajet. La profondeur de route garantit que r3c0
    // (profondeur 2) diffère de l'Élite de profondeur 1 qu'on a traversée pour l'atteindre.
    const nodes = [
      { row: 1, col: 0, type: "STANDARD" as const, nextCols: [0, 1] },
      { row: 2, col: 0, type: "ELITE" as const, nextCols: [0] },
      { row: 2, col: 1, type: "ELITE" as const, nextCols: [0] },
      { row: 3, col: 0, type: "ELITE" as const, nextCols: [0] },
      { row: 4, col: 0, type: "BOSS" as const, nextCols: [] },
    ];
    for (let seed = 0; seed < 50; seed++) {
      const identities = assignCombatIdentities(nodes, classicPool, elitePool, bossPool);
      const get = (row: number, col: number) =>
        identities.find((i) => i.row === row && i.col === col)!.enemyId;
      // Route A : r2c0 → r3c0 ; Route B : r2c1 → r3c0. Chaque route doit avoir 2 Élites distinctes.
      // (r2c0/r2c1, de même profondeur, ne sont jamais sur une même route et peuvent partager
      // l'identité — voulu, pas un doublon perçu par le joueur.)
      expect(get(3, 0)).not.toBe(get(2, 0));
      expect(get(3, 0)).not.toBe(get(2, 1));
    }
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
      canSkipThemeCard: false,
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
    expect(effects.canSkipThemeCard).toBe(true);
  });

  it("Libre Arbitre autorise à passer la carte de thème", () => {
    expect(getActiveRelicEffects([]).canSkipThemeCard).toBe(false);
    expect(getActiveRelicEffects(["THEME_CARD_SKIP"]).canSkipThemeCard).toBe(true);
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
    const effects = getActiveTalentEffects([]);
    expect(effects.bonusStartHp).toBe(0);
    expect(effects.bonusStartGold).toBe(0);
    expect(effects.rareRelicWeightBonus).toBe(0);
    expect(effects.bonusBossDamagePerHit).toBe(0);
    expect(effects.bonusBossTimeMs).toBe(0);
    expect(effects.hasShieldOnActStart).toBe(false);
    expect(effects.hasShieldOnBossStart).toBe(false);
    expect(effects.bonusBossDamageAtLowHp).toBe(0);
    expect(effects.bonusBossTimeAtLowHpMs).toBe(0);
    expect(effects.hasUltimateRevive).toBe(false);
    expect(effects.bossHpReductionPct).toBe(0);
    expect(effects.hasFirstAnswerNoTimeout).toBe(false);
    expect(effects.bossDamageFloor).toBe(0);
    expect(effects.startsWithRandomConsumable).toBe(false);
    expect(effects.startsWithRandomCommonRelic).toBe(false);
    expect(effects.goldGainPct).toBe(0);
    expect(effects.hasEliteExtraOffer).toBe(false);
    expect(effects.knowledgePointsGainPct).toBe(0);
  });

  it("aggregates independent talents from different branches", () => {
    const effects = getActiveTalentEffects([
      "VALIANT_HEART", // START_HP +1
      "SHARP_EYE", // RELIC_RARITY_BOOST +2
      "NEST_EGG", // START_GOLD +20
      "REINFORCED_STRIKE", // BOSS_DAMAGE_BASE_BONUS 5
    ]);
    expect(effects.bonusStartHp).toBe(1);
    expect(effects.rareRelicWeightBonus).toBe(2);
    expect(effects.bonusStartGold).toBe(20);
    expect(effects.bonusBossDamagePerHit).toBe(5);
  });

  it("ignores unknown ids", () => {
    expect(getActiveTalentEffects(["NOT_A_TALENT"]).bonusStartHp).toBe(0);
  });

  it("aggregates cumulative START_HP from both Résistance root nodes", () => {
    expect(getActiveTalentEffects(["VALIANT_HEART", "VITALITY"]).bonusStartHp).toBe(2);
  });

  it("takes the MAX (not the sum) for the 'total, non-cumulative' boss damage pair", () => {
    expect(getActiveTalentEffects(["REINFORCED_STRIKE"]).bonusBossDamagePerHit).toBe(5);
    expect(
      getActiveTalentEffects(["REINFORCED_STRIKE", "DECISIVE_STRIKE"]).bonusBossDamagePerHit,
    ).toBe(10);
    // Ordre inversé : même résultat, la fonction ne doit pas dépendre de l'ordre des ids.
    expect(
      getActiveTalentEffects(["DECISIVE_STRIKE", "REINFORCED_STRIKE"]).bonusBossDamagePerHit,
    ).toBe(10);
  });

  it("takes the MAX (not the sum) for the 'total, non-cumulative' boss time pair", () => {
    expect(getActiveTalentEffects(["SHARP_REFLEXES"]).bonusBossTimeMs).toBe(3_000);
    expect(getActiveTalentEffects(["SHARP_REFLEXES", "EXTENDED_RESPITE"]).bonusBossTimeMs).toBe(
      5_000,
    );
  });

  it("sets the ultimate revive/damage-floor/elite-offer flags", () => {
    expect(getActiveTalentEffects(["SECOND_WIND"]).hasUltimateRevive).toBe(true);
    expect(getActiveTalentEffects(["GUARANTEED_STRIKE"]).bossDamageFloor).toBe(20);
    expect(getActiveTalentEffects(["GENEROSITY"]).hasEliteExtraOffer).toBe(true);
    expect(getActiveTalentEffects(["FIRST_BREATH"]).hasFirstAnswerNoTimeout).toBe(true);
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

describe("consumeShieldCharge", () => {
  it("cancels the loss and consumes 1 charge when at least 1 is active", () => {
    expect(consumeShieldCharge(2, 1)).toEqual({ hpLoss: 0, shieldChargesRemaining: 1 });
  });

  it("leaves the loss untouched when no charge is active", () => {
    expect(consumeShieldCharge(0, 1)).toEqual({ hpLoss: 1, shieldChargesRemaining: 0 });
  });

  it("doesn't consume a charge when there was no loss to cancel", () => {
    expect(consumeShieldCharge(2, 0)).toEqual({ hpLoss: 0, shieldChargesRemaining: 2 });
  });
});

describe("grantShieldCharge", () => {
  it("adds 1 charge when below the current HP count", () => {
    expect(grantShieldCharge(0, 3)).toBe(1);
    expect(grantShieldCharge(1, 3)).toBe(2);
  });

  it("caps at the current HP count : a charge beyond that is simply lost", () => {
    expect(grantShieldCharge(3, 3)).toBe(3);
    expect(grantShieldCharge(2, 2)).toBe(2);
  });

  it("never goes negative for a 0-HP edge case", () => {
    expect(grantShieldCharge(0, 0)).toBe(0);
  });
});

describe("applyTalentsToGold", () => {
  it("applies the talent's gold % bonus", () => {
    const effects = getActiveTalentEffects(["BUSINESS_SENSE"]); // GOLD_GAIN_PCT 10
    expect(applyTalentsToGold(100, effects)).toBe(110);
  });

  it("leaves gold untouched with no relevant talent", () => {
    const effects = getActiveTalentEffects([]);
    expect(applyTalentsToGold(100, effects)).toBe(100);
  });

  it("leaves a zero gain untouched", () => {
    const effects = getActiveTalentEffects(["BUSINESS_SENSE"]);
    expect(applyTalentsToGold(0, effects)).toBe(0);
  });
});

describe("boss damage floor (Coup Assuré) composed with The Rock's damage_resist", () => {
  it("floors the base damage before relics, and The Rock still halves the floored total", () => {
    const talentEffects = getActiveTalentEffects(["GUARANTEED_STRIKE"]); // bossDamageFloor 20
    const lowBaseDamage = 5; // réponse tardive : bien sous le plancher de 20
    const floored = Math.max(lowBaseDamage, talentEffects.bossDamageFloor);
    expect(floored).toBe(20);
    const withRock = applyBossMalusToDamage(floored, "damage_resist");
    expect(withRock).toBe(Math.round(20 * BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER)); // 10
  });

  it("never floors a missed answer (damage already 0)", () => {
    const talentEffects = getActiveTalentEffects(["GUARANTEED_STRIKE"]);
    const baseDamage = 0;
    const floored =
      baseDamage > 0 ? Math.max(baseDamage, talentEffects.bossDamageFloor) : baseDamage;
    expect(floored).toBe(0);
  });
});

describe("pickRandomConsumable / pickRandomCommonRelic", () => {
  it("always returns a valid consumable id", () => {
    for (let i = 0; i < 20; i++) {
      const id = pickRandomConsumable();
      expect(BRAINRUN_CONSUMABLES[id]).toBeDefined();
    }
  });

  it("always returns a COMMON relic id", () => {
    for (let i = 0; i < 20; i++) {
      const id = pickRandomCommonRelic();
      expect(BRAINRUN_RELICS[id]?.rarity).toBe("COMMON");
    }
  });
});

describe("generateBonusOffers", () => {
  it("always returns exactly BRAINRUN_BONUS_OFFER_COUNT offers", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateBonusOffers([])).toHaveLength(BRAINRUN_BONUS_OFFER_COUNT);
    }
  });

  it("honors an explicit count (talent Générosité : +1 sur les Élites)", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateBonusOffers([], Math.random, 0, BRAINRUN_BONUS_OFFER_COUNT + 1)).toHaveLength(
        BRAINRUN_BONUS_OFFER_COUNT + 1,
      );
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
  it("nets the explicit cost against the drawn outcome reward for hp and gold", () => {
    const result = resolveEventOption(
      {
        label: "test",
        cost: { hp: 1, gold: 10 },
        outcomes: [{ weight: 1, reward: { gold: 15 }, resultText: "gagné" }],
      },
      { ownedRelics: [] },
    );
    expect(result.hpDelta).toBe(-1);
    expect(result.goldDelta).toBe(5);
    expect(result.relicGranted).toBeNull();
    expect(result.consumablesGranted).toEqual([]);
    expect(result.outcomeIndex).toBe(0);
    expect(result.resultText).toBe("gagné");
  });

  it('returns nothing gained for a rewardless outcome ("rien ne se passe")', () => {
    const result = resolveEventOption(
      { label: "test", outcomes: [{ weight: 1, resultText: "rien" }] },
      { ownedRelics: [] },
    );
    expect(result.hpDelta).toBe(0);
    expect(result.goldDelta).toBe(0);
    expect(result.relicGranted).toBeNull();
    expect(result.shieldChargesGranted).toBe(0);
    expect(result.fiftyFiftyChargesGranted).toBe(0);
    expect(result.reviveGranted).toBe(false);
    expect(result.resultText).toBe("rien");
  });

  it("picks the outcome according to its weight (masked draw)", () => {
    const option = {
      label: "test",
      outcomes: [
        { weight: 70, reward: { gold: 10 }, resultText: "A" },
        { weight: 30, reward: { gold: 20 }, resultText: "B" },
      ],
    };
    // random()=0.1 → premier outcome (70%), random()=0.9 → second (30%).
    expect(resolveEventOption(option, { ownedRelics: [] }, () => 0.1).outcomeIndex).toBe(0);
    expect(resolveEventOption(option, { ownedRelics: [] }, () => 0.9).outcomeIndex).toBe(1);
  });

  it("carries the new reward types (shield, 50/50 charges, revive, full heal, maxHp cost)", () => {
    const result = resolveEventOption(
      {
        label: "test",
        cost: { maxHp: 1 },
        outcomes: [
          {
            weight: 1,
            reward: { shieldCharges: 2, fiftyFiftyCharges: 3, revive: true, fullHeal: true },
            resultText: "",
          },
        ],
      },
      { ownedRelics: [] },
    );
    expect(result.maxHpDelta).toBe(-1);
    expect(result.shieldChargesGranted).toBe(2);
    expect(result.fiftyFiftyChargesGranted).toBe(3);
    expect(result.reviveGranted).toBe(true);
    expect(result.fullHealGranted).toBe(true);
  });

  it("defaults fullHealGranted to false when the outcome has no fullHeal reward", () => {
    const result = resolveEventOption(
      { label: "test", outcomes: [{ weight: 1, reward: { hp: 1 }, resultText: "" }] },
      { ownedRelics: [] },
    );
    expect(result.fullHealGranted).toBe(false);
  });

  it("grants an unowned random relic when the pool isn't exhausted", () => {
    const owned = ALL_RELIC_IDS.slice(0, ALL_RELIC_IDS.length - 1);
    const result = resolveEventOption(
      { label: "test", outcomes: [{ weight: 1, reward: { relic: "RANDOM" }, resultText: "" }] },
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
      { label: "test", outcomes: [{ weight: 1, reward: { relic: "RANDOM" }, resultText: "" }] },
      { ownedRelics: ALL_RELIC_IDS },
    );
    expect(result.relicGranted).toBe("EXTRA_HEART");
  });

  it("passes through granted consumables untouched", () => {
    const result = resolveEventOption(
      {
        label: "test",
        outcomes: [
          {
            weight: 1,
            reward: { consumables: [{ id: "FIFTY_FIFTY", amount: 2 }] },
            resultText: "",
          },
        ],
      },
      { ownedRelics: [] },
    );
    expect(result.consumablesGranted).toEqual([{ id: "FIFTY_FIFTY", amount: 2 }]);
  });

  it("resolves a RANDOM consumable reward to a concrete catalog id", () => {
    for (let i = 0; i < 20; i++) {
      const result = resolveEventOption(
        {
          label: "test",
          outcomes: [
            { weight: 1, reward: { consumables: [{ id: "RANDOM", amount: 1 }] }, resultText: "" },
          ],
        },
        { ownedRelics: [] },
      );
      expect(result.consumablesGranted).toHaveLength(1);
      expect(Object.keys(BRAINRUN_CONSUMABLES)).toContain(result.consumablesGranted[0]!.id);
    }
  });

  it("sacrifices a random owned relic on a RANDOM_OWNED cost", () => {
    const owned = [ALL_RELIC_IDS[0]!, ALL_RELIC_IDS[1]!];
    const result = resolveEventOption(
      {
        label: "test",
        cost: { relic: "RANDOM_OWNED" },
        outcomes: [{ weight: 1, reward: { relic: "RANDOM" }, resultText: "" }],
      },
      { ownedRelics: owned },
    );
    expect(owned).toContain(result.relicLost);
    expect(result.relicGranted).not.toBeNull();
    expect(result.relicGranted).not.toBe(result.relicLost);
  });

  it("has no relic to sacrifice when none is owned", () => {
    const result = resolveEventOption(
      {
        label: "test",
        cost: { relic: "RANDOM_OWNED" },
        outcomes: [{ weight: 1, reward: { relic: "RANDOM" }, resultText: "" }],
      },
      { ownedRelics: [] },
    );
    expect(result.relicLost).toBeNull();
  });
});

describe("assignEventIdentities", () => {
  const nodes = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ row: i + 2, col: 0 }));

  it("assigns each EVENT node a distinct event when the pool is large enough", () => {
    const pool = ["E1", "E2", "E3", "E4", "E5"];
    const assigned = assignEventIdentities(nodes(4), pool, () => 0.42);
    expect(assigned).toHaveLength(4);
    const ids = assigned.map((a) => a.eventId);
    expect(new Set(ids).size).toBe(4); // aucun doublon
    ids.forEach((id) => expect(pool).toContain(id));
  });

  it("never reuses an excluded event id while the remaining pool suffices", () => {
    const pool = ["E1", "E2", "E3", "E4"];
    const assigned = assignEventIdentities(nodes(2), pool, () => 0.1, ["E1", "E2"]);
    assigned.forEach((a) => expect(["E1", "E2"]).not.toContain(a.eventId));
  });

  it("falls back to repeats only when there are more nodes than unique events", () => {
    const pool = ["E1", "E2"];
    const assigned = assignEventIdentities(nodes(3), pool, () => 0.0);
    expect(assigned).toHaveLength(3);
    assigned.forEach((a) => expect(pool).toContain(a.eventId));
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

describe("brainrunGlobalFloor", () => {
  it("maps act/row to a linear floor across the three acts", () => {
    // Acte 1 = étages 1..10, Acte 2 = 11..19, Acte 3 = 20..28.
    expect(brainrunGlobalFloor(1, 1)).toBe(1);
    expect(brainrunGlobalFloor(1, 10)).toBe(10);
    expect(brainrunGlobalFloor(2, 1)).toBe(11);
    expect(brainrunGlobalFloor(2, 9)).toBe(19);
    expect(brainrunGlobalFloor(3, 1)).toBe(20);
    expect(brainrunGlobalFloor(3, 9)).toBe(28);
  });

  it("is monotonically increasing with progression", () => {
    expect(brainrunGlobalFloor(2, 1)).toBeGreaterThan(brainrunGlobalFloor(1, 10));
    expect(brainrunGlobalFloor(3, 1)).toBeGreaterThan(brainrunGlobalFloor(2, 9));
  });
});

describe("rankBrainrunPlayers", () => {
  const d = (ms: number) => new Date(ms);
  const run = (over: Partial<BrainrunRankRun> & { userId: string }): BrainrunRankRun => ({
    status: "LOST",
    currentAct: 1,
    currentRow: 1,
    createDate: d(0),
    ...over,
  });

  it("places victorious players above every non-victorious player", () => {
    const ranked = rankBrainrunPlayers([
      // 'far' a atteint l'acte 3 mais sans jamais gagner.
      run({ userId: "far", status: "LOST", currentAct: 3, currentRow: 9, createDate: d(1) }),
      // 'winner' a gagné très tôt (acte 3 battu).
      run({ userId: "winner", status: "WON", currentAct: 3, currentRow: 9, createDate: d(2) }),
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["winner", "far"]);
    expect(ranked[0]!.isVictory).toBe(true);
    expect(ranked[1]!.isVictory).toBe(false);
  });

  it("orders non-victorious players by max floor then by fewer runs", () => {
    const ranked = rankBrainrunPlayers([
      // 'a' : meilleur étage acte 2 rangée 5.
      run({ userId: "a", currentAct: 2, currentRow: 5, createDate: d(1) }),
      // 'b' et 'c' plafonnent au même étage (acte 2 rangée 3) mais 'c' a joué plus de runs.
      run({ userId: "b", currentAct: 2, currentRow: 3, createDate: d(1) }),
      run({ userId: "c", currentAct: 2, currentRow: 3, createDate: d(1) }),
      run({ userId: "c", currentAct: 1, currentRow: 2, createDate: d(2) }),
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["a", "b", "c"]);
    expect(ranked.find((r) => r.userId === "c")!.totalRuns).toBe(2);
  });

  it("orders victors by runs-to-first-victory, then by victory count", () => {
    const ranked = rankBrainrunPlayers([
      // 'quick' gagne dès sa 1ʳᵉ run.
      run({ userId: "quick", status: "WON", currentAct: 3, currentRow: 9, createDate: d(1) }),
      // 'grinder' perd 2 runs avant de gagner à la 3ᵉ (2 victoires au total).
      run({ userId: "grinder", status: "LOST", currentAct: 1, currentRow: 4, createDate: d(1) }),
      run({ userId: "grinder", status: "LOST", currentAct: 2, currentRow: 2, createDate: d(2) }),
      run({ userId: "grinder", status: "WON", currentAct: 3, currentRow: 9, createDate: d(3) }),
      run({ userId: "grinder", status: "WON", currentAct: 3, currentRow: 9, createDate: d(4) }),
    ]);
    // 'quick' devant malgré ses 1 victoire : elle est venue plus tôt (1 run vs 3).
    expect(ranked.map((r) => r.userId)).toEqual(["quick", "grinder"]);
    const grinder = ranked.find((r) => r.userId === "grinder")!;
    expect(grinder.victoryCount).toBe(2);
    expect(grinder.totalRuns).toBe(4);
  });

  it("breaks a tie in runs-to-first-victory by higher victory count", () => {
    const ranked = rankBrainrunPlayers([
      // Les deux gagnent à leur 1ʳᵉ run, mais 'x' a plus de victoires ensuite.
      run({ userId: "x", status: "WON", currentAct: 3, currentRow: 9, createDate: d(1) }),
      run({ userId: "x", status: "WON", currentAct: 3, currentRow: 9, createDate: d(2) }),
      run({ userId: "y", status: "WON", currentAct: 3, currentRow: 9, createDate: d(1) }),
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["x", "y"]);
  });

  it("counts all finished runs and computes best floor / victory data per player", () => {
    const ranked = rankBrainrunPlayers([
      run({ userId: "solo", status: "ABANDONED", currentAct: 1, currentRow: 3, createDate: d(1) }),
      run({ userId: "solo", status: "LOST", currentAct: 2, currentRow: 6, createDate: d(2) }),
    ]);
    const solo = ranked[0]!;
    expect(solo.totalRuns).toBe(2);
    expect(solo.isVictory).toBe(false);
    expect(solo.victoryCount).toBe(0);
    // Meilleur étage = la run la plus avancée (acte 2 rangée 6).
    expect(solo.bestAct).toBe(2);
    expect(solo.bestRow).toBe(6);
  });
});

describe("BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE", () => {
  it("applique la difficulté à plat par type de combat (indépendante de l'acte)", () => {
    expect(BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE.STANDARD).toEqual([1, 3]);
    expect(BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE.ELITE).toEqual([1, 4]);
    expect(BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE.BOSS).toEqual([2, 5]);
  });

  it("garde l'override culture_generale par acte, acte 3 relâché à [3,5]", () => {
    expect(BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[1]).toEqual([1, 2]);
    expect(BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[2]).toEqual([2, 3]);
    expect(BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT[3]).toEqual([3, 5]);
  });
});

describe("enemyThemeBonus", () => {
  it("multiplie la base d'acte par le multiplicateur de tier", () => {
    expect(enemyThemeBonus(1, "CLASSIC")).toBe(1);
    expect(enemyThemeBonus(1, "ELITE")).toBe(2);
    expect(enemyThemeBonus(1, "BOSS")).toBe(3);
    expect(enemyThemeBonus(2, "CLASSIC")).toBe(2);
    expect(enemyThemeBonus(2, "ELITE")).toBe(4);
    expect(enemyThemeBonus(3, "ELITE")).toBe(6);
    // Boss Acte 3 → 3 × 3 = 9 (exemple de la spec).
    expect(enemyThemeBonus(3, "BOSS")).toBe(9);
  });

  it("retourne 0 pour un acte hors barème", () => {
    expect(enemyThemeBonus(0, "BOSS")).toBe(0);
    expect(enemyThemeBonus(4, "CLASSIC")).toBe(0);
  });
});

describe("buildCombatThemeWeights", () => {
  const asRecord = (entries: { theme: string; weight: number }[]) =>
    Object.fromEntries(entries.map((e) => [e.theme, e.weight]));

  it("pondère un thème par coef joueur + bonus ennemi (bonus sur les seuls thèmes de l'ennemi)", () => {
    // history : investi (2) ET porté par l'ennemi (+3) → 5 ; sport : ennemi seul → 3 ;
    // cinema : investi seul → 4 (pas de bonus, pas un thème de l'ennemi).
    const weights = asRecord(
      buildCombatThemeWeights({ history: 2, cinema: 4 }, ["history", "sport"], 3),
    );
    expect(weights).toEqual({ history: 5, sport: 3, cinema: 4 });
  });

  it("écarte les thèmes de poids nul (ennemi sans bonus, thème non investi)", () => {
    const weights = asRecord(buildCombatThemeWeights({}, ["sport"], 0));
    expect(weights).toEqual({});
  });

  it("n'ajoute pas un thème investi mais banni (les thèmes d'ennemi arrivent déjà filtrés)", () => {
    const weights = asRecord(
      buildCombatThemeWeights({ banned: 5, cinema: 2 }, ["sport"], 3, ["banned"]),
    );
    expect(weights).toEqual({ sport: 3, cinema: 2 });
    expect(weights.banned).toBeUndefined();
  });
});

describe("generateThemeCards", () => {
  const candidates = [
    { slug: "history", name: "Histoire", image: "h.jpg" },
    { slug: "sport", name: "Sport", image: "s.jpg" },
    { slug: "cinema", name: "Cinéma", image: "c.jpg" },
    { slug: "music", name: "Musique", image: "m.jpg" },
    { slug: "science", name: "Science", image: "sc.jpg" },
  ];

  it("propose `count` cartes de thèmes distincts", () => {
    const cards = generateThemeCards(candidates, {}, 3, () => 0);
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.themeSlug)).size).toBe(3);
  });

  it("filet : renvoie moins de cartes quand les candidats sont trop peu nombreux", () => {
    const cards = generateThemeCards(candidates.slice(0, 2), {}, 3, () => 0);
    expect(cards).toHaveLength(2);
  });

  it("calcule coefBefore depuis les coefficients courants, coefAfter = before + valeur de rareté", () => {
    // random = 0 → rareté STANDARD (première du barème pondéré) → +1.
    const cards = generateThemeCards(candidates, { history: 2 }, 5, () => 0);
    const history = cards.find((c) => c.themeSlug === "history")!;
    expect(history.rarity).toBe("STANDARD");
    expect(history.coefBefore).toBe(2);
    expect(history.coefAfter).toBe(2 + BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY.STANDARD);
    // Thème non encore investi → coefBefore 0.
    const sport = cards.find((c) => c.themeSlug === "sport")!;
    expect(sport.coefBefore).toBe(0);
    expect(sport.coefAfter).toBe(BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY.STANDARD);
  });

  it("tire une rareté LÉGENDAIRE quand le random pointe le haut du barème pondéré", () => {
    // random ≈ 1 → dernière rareté du barème (LEGENDARY) → +5.
    const cards = generateThemeCards(candidates, {}, 1, () => 0.999);
    expect(cards[0]!.rarity).toBe("LEGENDARY");
    expect(cards[0]!.coefAfter).toBe(BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY.LEGENDARY);
  });

  it("injecte un thème déjà investi quand le tirage privilégie l'investissement", () => {
    const invested = [{ slug: "history", name: "Histoire", image: "h.jpg" }];
    // random = 0 → 0 < 10 % → chaque carte privilégie le pool investi ; le 1er thème est l'investi,
    // avec son coefBefore courant.
    const cards = generateThemeCards(
      [{ slug: "sport", name: "Sport", image: "s.jpg" }],
      { history: 4 },
      1,
      () => 0,
      invested,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]!.themeSlug).toBe("history");
    expect(cards[0]!.coefBefore).toBe(4);
  });

  it("plafonne coefAfter au maximum de coefficient de run", () => {
    // coefBefore 9 + LEGENDARY (+5) = 14 → tronqué à BRAINRUN_THEME_COEFFICIENT_MAX (10).
    const cards = generateThemeCards(
      [{ slug: "history", name: "Histoire", image: "h.jpg" }],
      { history: 9 },
      1,
      () => 0.999,
    );
    expect(cards[0]!.rarity).toBe("LEGENDARY");
    expect(cards[0]!.coefAfter).toBe(BRAINRUN_THEME_COEFFICIENT_MAX);
  });

  it("n'injecte pas de thème investi quand le tirage ne le privilégie pas (repli pool normal)", () => {
    const invested = [{ slug: "history", name: "Histoire", image: "h.jpg" }];
    // random = 0.5 → 0.5 ≥ 10 % → pas d'injection ; la carte vient du pool normal, pas de l'investi.
    const cards = generateThemeCards(
      [{ slug: "sport", name: "Sport", image: "s.jpg" }],
      { history: 4 },
      1,
      () => 0.5,
      invested,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]!.themeSlug).toBe("sport");
  });
});

describe("topThemes", () => {
  it("trie par coefficient décroissant puis alphabétique, ignore les thèmes à 0", () => {
    expect(topThemes({ alpha: 1, bravo: 3, charlie: 3, delta: 0 })).toEqual([
      "bravo",
      "charlie",
      "alpha",
    ]);
  });

  it("limite au top `n`", () => {
    expect(topThemes({ a: 5, b: 4, c: 3, d: 2 }, 2)).toEqual(["a", "b"]);
  });

  it("renvoie un tableau vide quand aucun thème n'est investi", () => {
    expect(topThemes({ a: 0, b: 0 })).toEqual([]);
  });
});
