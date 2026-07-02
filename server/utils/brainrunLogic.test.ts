import { describe, it, expect } from "vite-plus/test";
import {
  brainrunHpLossForDifficulty,
  calculBrainrunUserXP,
  generateActChoicePoints,
  instantRoomHealthDelta,
  isAwaitingChoice,
  nextRoomAfterClear,
  shouldEndRunOnDamage,
} from "./brainrunLogic";
import { BRAINRUN_CHOICE_POINTS_PER_ACT } from "./brainrunConfig";

describe("brainrunHpLossForDifficulty", () => {
  it("maps difficulty tiers to the expected HP loss", () => {
    expect(brainrunHpLossForDifficulty(1)).toBe(1);
    expect(brainrunHpLossForDifficulty(2)).toBe(1);
    expect(brainrunHpLossForDifficulty(3)).toBe(2);
    expect(brainrunHpLossForDifficulty(4)).toBe(2);
    expect(brainrunHpLossForDifficulty(5)).toBe(3);
  });
});

describe("shouldEndRunOnDamage", () => {
  it("ends the run at 0 HP or below, not above", () => {
    expect(shouldEndRunOnDamage(0)).toBe(true);
    expect(shouldEndRunOnDamage(-1)).toBe(true);
    expect(shouldEndRunOnDamage(1)).toBe(false);
  });
});

describe("isAwaitingChoice", () => {
  it("is true only when the room type hasn't been picked yet", () => {
    expect(isAwaitingChoice({ type: null })).toBe(true);
    expect(isAwaitingChoice({ type: "STANDARD" })).toBe(false);
  });
});

describe("instantRoomHealthDelta", () => {
  it("only REST heals", () => {
    expect(instantRoomHealthDelta("REST")).toBe(1);
    expect(instantRoomHealthDelta("SHOP")).toBe(0);
    expect(instantRoomHealthDelta("EVENT")).toBe(0);
  });
});

describe("nextRoomAfterClear", () => {
  it("moves to the next sequence within the same act", () => {
    expect(nextRoomAfterClear(1, 1)).toEqual({ kind: "AWAIT_CHOICE", act: 1, sequence: 2 });
    expect(nextRoomAfterClear(2, 6)).toEqual({ kind: "AWAIT_CHOICE", act: 2, sequence: 7 });
  });

  it("moves to the next act after the boss room, unless it was the last act", () => {
    expect(nextRoomAfterClear(1, 7)).toEqual({ kind: "AWAIT_CHOICE", act: 2, sequence: 1 });
    expect(nextRoomAfterClear(2, 7)).toEqual({ kind: "AWAIT_CHOICE", act: 3, sequence: 1 });
  });

  it("declares the run won after act 3's boss room", () => {
    expect(nextRoomAfterClear(3, 7)).toEqual({ kind: "RUN_WON" });
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

describe("generateActChoicePoints", () => {
  function isPure(choiceTypes: string[]) {
    return (
      choiceTypes.length === 2 && choiceTypes.includes("STANDARD") && choiceTypes.includes("ELITE")
    );
  }

  it("always produces exactly one choice point per sequence slot", () => {
    for (let i = 0; i < 50; i++) {
      const points = generateActChoicePoints();
      expect(points).toHaveLength(BRAINRUN_CHOICE_POINTS_PER_ACT);
      const sequences = points.map((p) => p.sequence).sort((a, b) => a - b);
      expect(sequences).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("respects the minimum quotas on every generated act, across many random draws", () => {
    for (let i = 0; i < 200; i++) {
      const points = generateActChoicePoints();
      const pureCount = points.filter((p) => isPure(p.choiceTypes)).length;
      const shopCount = points.filter((p) => p.choiceTypes.includes("SHOP")).length;
      const restCount = points.filter((p) => p.choiceTypes.includes("REST")).length;
      const eventCount = points.filter((p) => p.choiceTypes.includes("EVENT")).length;

      expect(pureCount).toBeGreaterThanOrEqual(3);
      expect(shopCount).toBeGreaterThanOrEqual(1);
      expect(restCount).toBeGreaterThanOrEqual(1);
      expect(eventCount).toBeGreaterThanOrEqual(2);

      // Chaque point de choix mixte doit garder un vrai choix de combat (Standard ou Elite).
      points
        .filter((p) => !isPure(p.choiceTypes))
        .forEach((p) => {
          const combatOptions = p.choiceTypes.filter((t) => t === "STANDARD" || t === "ELITE");
          expect(combatOptions).toHaveLength(1);
        });
    }
  });

  it("is deterministic given a fixed random source", () => {
    const fixedRandom = () => 0.42;
    const a = generateActChoicePoints(fixedRandom);
    const b = generateActChoicePoints(fixedRandom);
    expect(a).toEqual(b);
  });
});
