import type { BrainrunRoomType } from "#shared/brainrun";
import { brainrunPotentialBossDamage, BRAINRUN_BOSS_QUESTION_TIME_MS } from "#shared/brainrun";
import {
  BRAINRUN_CHOICE_POINTS_PER_ACT,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_TOTAL_ACTS,
  BRAINRUN_WIN_BONUS_XP,
  BRAINRUN_XP_BY_ROOM_TYPE,
} from "./brainrunConfig";

export function brainrunHpLossForDifficulty(difficulty: number): number {
  if (difficulty <= 2) return 1;
  if (difficulty <= 4) return 2;
  return 3;
}

export function shouldEndRunOnDamage(healthPointAfter: number): boolean {
  return healthPointAfter <= 0;
}

export function isAwaitingChoice(room: { type: string | null }): boolean {
  return room.type === null;
}

export type NextRoomOutcome =
  | { kind: "AWAIT_CHOICE"; act: number; sequence: number }
  | { kind: "RUN_WON" };

/** Détermine la prochaine salle à proposer une fois la salle courante (act/sequence) nettoyée. */
export function nextRoomAfterClear(act: number, sequence: number): NextRoomOutcome {
  if (sequence < BRAINRUN_ROOMS_PER_ACT) {
    return { kind: "AWAIT_CHOICE", act, sequence: sequence + 1 };
  }
  if (act < BRAINRUN_TOTAL_ACTS) {
    return { kind: "AWAIT_CHOICE", act: act + 1, sequence: 1 };
  }
  return { kind: "RUN_WON" };
}

export function instantRoomHealthDelta(type: "REST" | "SHOP" | "EVENT"): number {
  return type === "REST" ? 1 : 0;
}

/** true dès que le temps imparti pour répondre à la question de boss est écoulé. */
export function isBossAnswerTimedOut(elapsedMs: number): boolean {
  return elapsedMs >= BRAINRUN_BOSS_QUESTION_TIME_MS;
}

/**
 * Dégâts infligés au boss pour une réponse donnée : 0 si incorrecte, sinon la valeur
 * potentielle décroissante selon le temps écoulé (cf. brainrunPotentialBossDamage, partagée
 * avec le client qui l'utilise pour afficher l'aperçu de dégâts pendant le combat).
 */
export function brainrunBossDamage(elapsedMs: number, success: boolean): number {
  return success ? brainrunPotentialBossDamage(elapsedMs) : 0;
}

export function calculBrainrunUserXP(
  clearedRooms: { type: "STANDARD" | "ELITE" | "BOSS" | "REST" | "SHOP" | "EVENT" }[],
  won: boolean,
): number {
  const xpByType: Record<string, number> = {
    ...BRAINRUN_XP_BY_ROOM_TYPE,
    REST: 0,
    SHOP: 0,
    EVENT: 0,
  };
  const base = clearedRooms.reduce((sum, r) => sum + (xpByType[r.type] ?? 0), 0);
  return won ? base + BRAINRUN_WIN_BONUS_XP : base;
}

export type BrainrunChoicePoint = {
  sequence: number;
  choiceTypes: BrainrunRoomType[];
};

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * Génère la forme des points de choix d'un acte (hors salle Boss finale, toujours fixe/séparée) :
 * au moins BRAINRUN_MIN_PURE_COMBAT_RATIO de points purement [STANDARD, ELITE], et au moins
 * une occurrence de SHOP/REST et deux de EVENT réparties sur des points distincts.
 * `random` est injectable pour des tests déterministes (par défaut Math.random).
 */
export function generateActChoicePoints(random: () => number = Math.random): BrainrunChoicePoint[] {
  const totalPoints = BRAINRUN_CHOICE_POINTS_PER_ACT;
  const minPure = Math.ceil(totalPoints * BRAINRUN_MIN_PURE_COMBAT_RATIO);
  const mixedCount = totalPoints - minPure;

  const specialsPool: BrainrunRoomType[] = [
    ...(Array(BRAINRUN_MIN_SHOP_OFFERS).fill("SHOP") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_REST_OFFERS).fill("REST") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_EVENT_OFFERS).fill("EVENT") as BrainrunRoomType[]),
  ];

  const buckets: BrainrunRoomType[][] = Array.from({ length: mixedCount }, () => []);
  const shuffledSpecials = shuffle(specialsPool, random);
  shuffledSpecials.forEach((special, i) => {
    if (i < mixedCount) {
      buckets[i]!.push(special);
      return;
    }
    // Item excédentaire : on évite de le placer dans un bucket qui a déjà ce même type,
    // pour garantir que EVENT (2 occurrences minimum) apparaisse sur 2 points distincts.
    const eligible = buckets.map((_, idx) => idx).filter((idx) => !buckets[idx]!.includes(special));
    const pickFrom = eligible.length > 0 ? eligible : buckets.map((_, idx) => idx);
    const pick = pickFrom[Math.floor(random() * pickFrom.length)]!;
    buckets[pick]!.push(special);
  });

  const purePoints: BrainrunChoicePoint[] = Array.from({ length: minPure }, () => ({
    sequence: 0,
    choiceTypes: shuffle(["STANDARD", "ELITE"], random),
  }));

  const mixedPoints: BrainrunChoicePoint[] = buckets.map((specials) => ({
    sequence: 0,
    choiceTypes: shuffle([random() < 0.5 ? "STANDARD" : "ELITE", ...specials], random),
  }));

  return shuffle([...purePoints, ...mixedPoints], random).map((point, index) => ({
    ...point,
    sequence: index + 1,
  }));
}
