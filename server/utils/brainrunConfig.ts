import type { BrainrunRoomType } from "#shared/brainrun";
import {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_ANSWER_MS,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_CHOICE_POINTS_PER_ACT,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_TOTAL_ACTS,
} from "#shared/brainrun";

export {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_ANSWER_MS,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_CHOICE_POINTS_PER_ACT,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_TOTAL_ACTS,
};

export const BRAINRUN_START_HP = 3;
export const BRAINRUN_MAX_HP = 3;

export const BRAINRUN_GOLD_BY_ROOM_TYPE: Record<"STANDARD" | "ELITE" | "BOSS", number> = {
  STANDARD: 10,
  ELITE: 25,
  BOSS: 50,
};

/** XP par salle de combat nettoyée ; REST/SHOP/EVENT ne rapportent pas d'XP. Valeurs indicatives, à ajuster après tests. */
export const BRAINRUN_XP_BY_ROOM_TYPE: Record<"STANDARD" | "ELITE" | "BOSS", number> = {
  STANDARD: 15,
  ELITE: 35,
  BOSS: 70,
};
export const BRAINRUN_WIN_BONUS_XP = 150;

/** Taux de conversion de l'or de fin de run en Points de Savoir (monnaie meta persistante),
 * arrondi à l'entier inférieur (cf. goldToKnowledgePoints dans brainrunLogic.ts). Valeur
 * indicative, à ajuster après tests réels : ~10-50 PS pour une run typique. */
export const BRAINRUN_KP_PER_GOLD = 0.2;

/** Nombre de questions pour les salles de combat standard ; le combat de boss n'a pas de
 * limite de questions, il continue jusqu'à ce que le boss soit à 0 PV (cf. BRAINRUN_BOSS_MAX_HP). */
export const BRAINRUN_QUESTIONS_PER_ROOM: Record<"STANDARD" | "ELITE", number> = {
  STANDARD: 4,
  ELITE: 5,
};

/** Plage de difficulté (inclusive, échelle Question.difficulty 1-5) par acte et type de salle de combat. */
export const BRAINRUN_DIFFICULTY_BY_ACT: Record<
  number,
  Record<"STANDARD" | "ELITE" | "BOSS", [number, number]>
> = {
  1: { STANDARD: [1, 1], ELITE: [2, 2], BOSS: [2, 2] },
  2: { STANDARD: [2, 3], ELITE: [3, 3], BOSS: [3, 3] },
  3: { STANDARD: [3, 4], ELITE: [4, 4], BOSS: [5, 5] },
};

/** Quotas minimums que l'algorithme de génération des points de choix d'un acte doit respecter. */
export const BRAINRUN_MIN_PURE_COMBAT_RATIO = 0.5; // au moins 50% des points = uniquement [STANDARD, ELITE]
export const BRAINRUN_MIN_SHOP_OFFERS = 1;
export const BRAINRUN_MIN_REST_OFFERS = 1;
export const BRAINRUN_MIN_EVENT_OFFERS = 2;

/** Types de salle qui, une fois choisis, se résolvent instantanément (pas de question). */
export const BRAINRUN_INSTANT_ROOM_TYPES: BrainrunRoomType[] = ["REST", "SHOP", "EVENT"];
/** Types de salle "de combat", avec des questions, de l'or et de l'XP. */
export const BRAINRUN_COMBAT_ROOM_TYPES: BrainrunRoomType[] = ["STANDARD", "ELITE", "BOSS"];

/** Nombre de coups à dégâts de base pour vaincre le boss (calibrage des PV) ; le combat n'est
 * jamais limité en nombre de questions, ce chiffre est indicatif du rythme attendu. */
const BRAINRUN_BOSS_BASE_HIT_COUNT = 5;
export const BRAINRUN_BOSS_MAX_HP = BRAINRUN_BOSS_BASE_HIT_COUNT * BRAINRUN_BOSS_BASE_DAMAGE;
