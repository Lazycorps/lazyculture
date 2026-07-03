import { describe, it, expect } from "vite-plus/test";
import {
  applyRelicsToBossDamage,
  applyRelicsToGold,
  applyRelicsToHpLoss,
  bossQuestionTimeMsWithRelics,
  brainrunBossDamage,
  brainrunHpLossForDifficulty,
  calculBrainrunUserXP,
  consumeShieldIfArmed,
  generateActChoicePoints,
  generateBonusOffers,
  generateShopOffers,
  getActiveRelicEffects,
  getActiveTalentEffects,
  goldToKnowledgePoints,
  instantRoomHealthDelta,
  isAwaitingChoice,
  isBossAnswerTimedOut,
  nextRoomAfterClear,
  pickFiftyFiftyEliminations,
  pickPhoneAFriendHint,
  resolveEventOption,
  shouldEndRunOnDamage,
} from "./brainrunLogic";
import {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_ANSWER_MS,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_CHOICE_POINTS_PER_ACT,
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
    expect(brainrunBossDamage(BRAINRUN_BOSS_FAST_ANSWER_MS - 1, false)).toBe(0);
  });

  it("deals no damage once the question has timed out, even if marked correct", () => {
    expect(brainrunBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS, true)).toBe(0);
  });

  it("deals base damage on a correct answer at normal speed", () => {
    expect(brainrunBossDamage(BRAINRUN_BOSS_FAST_ANSWER_MS, true)).toBe(BRAINRUN_BOSS_BASE_DAMAGE);
  });

  it("deals multiplied damage on a fast correct answer", () => {
    expect(brainrunBossDamage(BRAINRUN_BOSS_FAST_ANSWER_MS - 1, true)).toBe(
      BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
    );
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

  it("forces the first sequence slot to be pure combat when forceFirstPure is set", () => {
    function isPure(choiceTypes: string[]) {
      return (
        choiceTypes.length === 2 &&
        choiceTypes.includes("STANDARD") &&
        choiceTypes.includes("ELITE")
      );
    }
    for (let i = 0; i < 100; i++) {
      const points = generateActChoicePoints(Math.random, true);
      const first = points.find((p) => p.sequence === 1)!;
      expect(isPure(first.choiceTypes)).toBe(true);
      // La contrainte ne doit pas casser l'invariant "un point de choix par séquence".
      const sequences = points.map((p) => p.sequence).sort((a, b) => a - b);
      expect(sequences).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });
});

describe("getActiveRelicEffects", () => {
  it("returns neutral effects when no relic is owned", () => {
    expect(getActiveRelicEffects([])).toEqual({
      goldMultiplier: 1,
      flatGoldBonusPerRoom: 0,
      hpLossReduction: 0,
      bossTimeBonusMs: 0,
      bossDamageBonusPerHit: 0,
      hasExtraLife: false,
    });
  });

  it("aggregates every relic's effect", () => {
    const effects = getActiveRelicEffects(ALL_RELIC_IDS);
    expect(effects.goldMultiplier).toBeCloseTo(1.2);
    expect(effects.flatGoldBonusPerRoom).toBe(5);
    expect(effects.hpLossReduction).toBe(1);
    expect(effects.bossTimeBonusMs).toBe(3000);
    expect(effects.bossDamageBonusPerHit).toBe(5);
    expect(effects.hasExtraLife).toBe(true);
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

describe("applyRelicsToHpLoss", () => {
  const effects = getActiveRelicEffects(["SPECIALIZATION"]);

  it("reduces the loss but never below 1 when a loss occurred", () => {
    expect(applyRelicsToHpLoss(2, effects)).toBe(1);
    expect(applyRelicsToHpLoss(1, effects)).toBe(1);
  });

  it("leaves a zero loss (correct answer) untouched", () => {
    expect(applyRelicsToHpLoss(0, effects)).toBe(0);
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

  it("never offers an already-owned relic", () => {
    const owned: string[] = ALL_RELIC_IDS.slice(0, ALL_RELIC_IDS.length - 1);
    for (let i = 0; i < 50; i++) {
      const offers = generateBonusOffers(owned);
      const relicOffers = offers.filter((o) => o.kind === "RELIC");
      relicOffers.forEach((o) => expect(owned).not.toContain(o.id));
    }
  });

  it("falls back to consumables once every relic is owned", () => {
    const offers = generateBonusOffers(ALL_RELIC_IDS);
    expect(offers.every((o) => o.kind === "CONSUMABLE" || o.kind === "GOLD")).toBe(true);
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

  it("replaces relic slots with free gold offers once every relic is owned", () => {
    const offers = generateShopOffers(ALL_RELIC_IDS);
    const goldOffers = offers.filter((o) => o.kind === "GOLD");
    expect(goldOffers).toHaveLength(BRAINRUN_SHOP_RELIC_OFFER_COUNT);
    goldOffers.forEach((o) => expect(o.price).toBe(0));
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
    expect(owned).not.toContain(result.relicGranted);
  });

  it("compensates with gold when the relic pool is exhausted", () => {
    const result = resolveEventOption(
      { label: "test", reward: { relic: "RANDOM" } },
      { ownedRelics: ALL_RELIC_IDS },
    );
    expect(result.relicGranted).toBeNull();
    expect(result.goldDelta).toBeGreaterThan(0);
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
  it("defines exactly the 3 documented jokers", () => {
    expect(Object.keys(BRAINRUN_CONSUMABLES).sort()).toEqual(
      ["FIFTY_FIFTY", "PHONE_A_FRIEND", "SHIELD"].sort(),
    );
  });
});
