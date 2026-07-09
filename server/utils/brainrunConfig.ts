import type { BrainrunRoomType } from "#shared/brainrun";
import {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_TOTAL_ACTS,
  getBrainrunRoomsPerAct,
} from "#shared/brainrun";

export {
  BRAINRUN_BOSS_BASE_DAMAGE,
  BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_TOTAL_ACTS,
  getBrainrunRoomsPerAct,
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

/** Plage de difficulté (inclusive, échelle Question.difficulty 1-5) par acte et type de salle de
 * combat — même plage élargie pour STANDARD/ELITE/BOSS au sein d'un acte (plus de redondance de
 * questions d'une run à l'autre qu'avec l'ancienne plage resserrée par type). */
export const BRAINRUN_DIFFICULTY_BY_ACT: Record<
  number,
  Record<"STANDARD" | "ELITE" | "BOSS", [number, number]>
> = {
  1: { STANDARD: [1, 2], ELITE: [1, 2], BOSS: [1, 2] },
  2: { STANDARD: [2, 4], ELITE: [2, 4], BOSS: [2, 4] },
  3: { STANDARD: [3, 5], ELITE: [3, 5], BOSS: [3, 5] },
};

/** Plage de difficulté propre au thème culture_generale, par acte — resserrée par rapport à
 * BRAINRUN_DIFFICULTY_BY_ACT (même bornée à ses deux extrémités) pour accentuer la progression
 * ressentie sur ce thème quasi systématique (présent dans la plupart des ennemis/boss, cf.
 * shared/brainrunEnemies.ts / brainrunBosses.ts) : facile en Acte 1, corsé en Acte 3.
 * Appliquée via QuestionService.getRandomIdsByDifficulty (themeDifficultyOverrides). */
export const BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT: Record<number, [number, number]> = {
  1: [1, 2],
  2: [2, 3],
  3: [4, 5],
};

/** Largeurs des 6 étages "du milieu" d'un acte (entre l'étage 1, forcé Standard, et l'avant-dernière
 * rangée, forcée Bibliothèque) : volontairement variées plutôt qu'uniformes à 4, pour que la carte
 * ne ressemble pas à un simple rectangle — les rangées à 4 nœuds doivent rester rares (2 sur les 6
 * ici), et des rangées à 2 nœuds sont prévues pour resserrer la carte par endroits. */
const BRAINRUN_MID_FLOOR_WIDTHS = [2, 3, 4, 4, 3, 2];

/**
 * Forme de la carte à embranchements d'un acte : nombre de nœuds par rangée (index 0 = rangée 1).
 * L'acte 1 démarre par une rangée Neutre (1 seul nœud, cf. shared/brainrun.ts) ; les actes 2/3 n'en
 * ont pas, le nœud de Boss de l'acte précédent tenant lieu de point de départ visuel. Dans les deux
 * cas, après la (rangée Neutre +) la première rangée d'étage est toujours forcée 3x Standard,
 * l'avant-dernière rangée toujours forcée 100% Bibliothèque (repos garanti avant le Boss, façon
 * feu de camp de Slay the Spire), et la dernière rangée toujours le Boss (1 seul nœud, tous les
 * nœuds de l'avant-dernière rangée y convergent). cf. server/utils/brainrunLogic.ts
 * (generateActEdges/assignNodeTypes/generateActGraph).
 */
const BRAINRUN_ACT_ROW_WIDTHS_WITH_NEUTRAL = [1, 3, ...BRAINRUN_MID_FLOOR_WIDTHS, 3, 1];
const BRAINRUN_ACT_ROW_WIDTHS_WITHOUT_NEUTRAL = [3, ...BRAINRUN_MID_FLOOR_WIDTHS, 3, 1];

export function getBrainrunActRowWidths(act: number): number[] {
  return act === 1 ? BRAINRUN_ACT_ROW_WIDTHS_WITH_NEUTRAL : BRAINRUN_ACT_ROW_WIDTHS_WITHOUT_NEUTRAL;
}

/** Position (1-indexée) de l'étage forcé 100% Élite parmi les étages "du milieu" d'un acte (entre
 * l'étage 1, forcé Standard, et l'avant-dernière rangée, forcée Bibliothèque) : garantit
 * mécaniquement qu'aucune route ne peut traverser un acte sans croiser au moins une Élite. */
export const BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX = 3;

/** Nombre maximum d'Élites qu'une route (rangée 1 → Boss) peut traverser sur un acte ; appliqué
 * a posteriori par enforceEliteRouteBounds (server/utils/brainrunLogic.ts), qui retype en Standard
 * les Élites en excès si une route en dépasse le nombre. */
export const BRAINRUN_MAX_ELITE_PER_ROUTE = 4;

/** Probabilité qu'un nœud (hors avant-dernière rangée, qui converge toujours seule vers le Boss)
 * ait une 2e arête sortante en plus de sa cible centrale : les mono-routes (un seul choix) doivent
 * rester rares. cf. pickInitialTargets dans server/utils/brainrunLogic.ts. */
export const BRAINRUN_BRANCH_CHANCE = 0.8;

/** Quotas minimums que l'algorithme d'assignation des types de nœuds d'un acte doit respecter. */
export const BRAINRUN_MIN_PURE_COMBAT_RATIO = 0.5; // au moins 50% des nœuds hors Boss = combat (STANDARD/ELITE)
// Remontés à 2 (au lieu d'1) par rapport à l'ancien système linéaire : avec l'embranchement, un
// trajet donné pourrait sinon totalement rater ces salles si elles n'existent qu'en un exemplaire.
export const BRAINRUN_MIN_SHOP_OFFERS = 2;
export const BRAINRUN_MIN_REST_OFFERS = 2;
export const BRAINRUN_MIN_EVENT_OFFERS = 2;

/** Portée de vision de base sur la carte (en rangées, toujours au moins la rangée immédiatement
 * accessible) et bonus accordé par la relique Prévoyance (rangées supplémentaires). */
export const BRAINRUN_MAP_BASE_VISION_ROWS = 1;
export const BRAINRUN_FORESIGHT_BONUS_VISION_ROWS = 2;

/** Types de salle qui, une fois choisis, se résolvent instantanément (pas de question). */
export const BRAINRUN_INSTANT_ROOM_TYPES: BrainrunRoomType[] = ["REST", "SHOP", "EVENT"];
/** Types de salle "de combat", avec des questions, de l'or et de l'XP. */
export const BRAINRUN_COMBAT_ROOM_TYPES: BrainrunRoomType[] = ["STANDARD", "ELITE", "BOSS"];

/** Nombre de coups à dégâts de base pour vaincre le boss (calibrage des PV) ; le combat n'est
 * jamais limité en nombre de questions, ce chiffre est indicatif du rythme attendu. */
const BRAINRUN_BOSS_BASE_HIT_COUNT = 5;
export const BRAINRUN_BOSS_MAX_HP = BRAINRUN_BOSS_BASE_HIT_COUNT * BRAINRUN_BOSS_BASE_DAMAGE;

/** Pièces (monnaie transverse UserWallet) gagnées à chaque Boss d'acte vaincu, indexé par
 * acte-1 : acte 1 = 5, acte 2 = +10 (15 cumulé), acte 3/victoire = +25 (40 cumulé sur une run
 * complète). Remplace, pour Brainrun uniquement, la conversion XP→pièces générique appliquée aux
 * autres modes (server/utils/walletHelper.ts) — plafonné par BRAINRUN_DAILY_COIN_CAP. */
export const BRAINRUN_COINS_PER_ACT = [5, 10, 25];
/** Plafond de pièces gagnables par jour via les paliers d'acte Brainrun, réinitialisé au même
 * changement de jour (heure locale serveur) que le Daily quiz. */
export const BRAINRUN_DAILY_COIN_CAP = 100;

/** Or gagné en cliquant "Passer" sur le bonus post-combat (relique Lot de Consolation). */
export const BRAINRUN_CONSOLATION_GOLD = 15;
/** Probabilité, par point de choix restant, qu'un Événement s'ajoute en 3e option (relique Aimant à Événements). */
export const BRAINRUN_EVENT_MAGNET_CHANCE = 0.3;
/** Probabilité, par question, que la bonne réponse soit révélée après coup (relique Sixième Sens). */
export const BRAINRUN_SIXTH_SENSE_CHANCE = 0.05;
/** Multiplicateur appliqué aux prix de Boutique (relique Marchandeur). */
export const BRAINRUN_HAGGLER_MULTIPLIER = 0.8;
/** Plafond absolu de Pv max atteignable (relique Cœur Supplémentaire, cumulable). */
export const BRAINRUN_ABSOLUTE_MAX_HP = 8;
/** Probabilité de récupérer 1 PV en fin de combat gagné (relique Spécialisation). */
export const BRAINRUN_SPECIALIZATION_HEAL_CHANCE = 0.2;
/** Emplacements de consommables de base, et bonus accordé par la relique Sac à Dos. */
export const BRAINRUN_BASE_CONSUMABLE_SLOTS = 3;
export const BRAINRUN_BACKPACK_BONUS_SLOTS = 2;
