/** Arbre de talents permanents Brainrun (metagame) : 3 branches (Résistance/Dégâts/Utilitaire),
 * 7 nœuds chacune, prérequis explicites entre nœuds. Défini en code, comme `shared/brainrunItems.ts`,
 * et partagé client/serveur pour l'affichage sans dupliquer ces données en base — seuls les ids
 * débloqués sont persistés (BrainrunMetaProgress.unlockedTalents). Voir
 * `.claude/skills/brainrun/references/talents.md` pour le détail du design (schéma des branches,
 * pièges d'agrégation, ordre des filets de résurrection). */

export type BrainrunTalentBranch = "RESISTANCE" | "DAMAGE" | "UTILITY";

export type BrainrunTalentId =
  // Résistance
  | "VALIANT_HEART"
  | "DESPERATE_RAGE"
  | "COLD_BLOOD"
  | "ACT_SHIELD"
  | "VITALITY"
  | "BOSS_SHIELD"
  | "SECOND_WIND"
  // Dégâts
  | "REINFORCED_STRIKE"
  | "SHARP_REFLEXES"
  | "DECISIVE_STRIKE"
  | "EXTENDED_RESPITE"
  | "OPENING_BREACH"
  | "FIRST_BREATH"
  | "GUARANTEED_STRIKE"
  // Utilitaire
  | "NEST_EGG"
  | "BUSINESS_SENSE"
  | "STARTER_KIT"
  | "SHARP_EYE"
  | "FIRST_TREASURE"
  | "GENEROSITY"
  | "COMPOUND_INTEREST";

export type BrainrunTalentEffectKind =
  | "START_HP"
  | "START_GOLD"
  | "RELIC_RARITY_BOOST"
  /** Frappe Renforcée/Décisive : agrégées par MAX (pas par somme) dans getActiveTalentEffects. */
  | "BOSS_DAMAGE_BASE_BONUS"
  /** Réflexes Affûtés/Répit Prolongé : agrégées par MAX (pas par somme) dans getActiveTalentEffects. */
  | "BOSS_TIME_BONUS"
  | "SHIELD_ON_ACT_START"
  | "SHIELD_ON_BOSS_START"
  | "BOSS_DAMAGE_AT_LOW_HP"
  | "BOSS_TIME_AT_LOW_HP"
  | "ULTIMATE_REVIVE_2HP"
  | "BOSS_HP_REDUCTION_PCT"
  | "BOSS_FIRST_ANSWER_NO_TIMEOUT"
  | "BOSS_MIN_DAMAGE_FLOOR"
  | "START_RANDOM_CONSUMABLE"
  | "START_RANDOM_COMMON_RELIC"
  | "GOLD_GAIN_PCT"
  | "ELITE_BONUS_OFFER_EXTRA"
  | "KNOWLEDGE_POINTS_GAIN_PCT";

export type BrainrunTalentDef = {
  id: BrainrunTalentId;
  name: string;
  description: string;
  icon: string;
  branch: BrainrunTalentBranch;
  /** Palier dans la branche : 1-3 = paliers normaux, 4 = nœud ultime. */
  tier: 1 | 2 | 3 | 4;
  /** Coût en Points de Savoir, achat unique (pas de rangs/paliers sur un même nœud). */
  cost: number;
  /** Nœuds devant être débloqués avant celui-ci ; [] = racine de branche (aucun prérequis). */
  prerequisites: BrainrunTalentId[];
  /** true = tous les prérequis requis (ET) ; false = un seul suffit (OU) — seuls les nœuds ultimes
   * ont 2 prérequis avec requireAll=false ("un seul chemin de la branche suffit"). */
  requireAll: boolean;
  effect: BrainrunTalentEffectKind;
  value: number;
};

export const BRAINRUN_TALENTS: Record<BrainrunTalentId, BrainrunTalentDef> = {
  // ---- Résistance (vert) ----
  VALIANT_HEART: {
    id: "VALIANT_HEART",
    name: "Cœur Vaillant",
    description: "+1 PV de départ (et PV max) sur chaque nouvelle run.",
    icon: "i-heroicons-heart",
    branch: "RESISTANCE",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "START_HP",
    value: 1,
  },
  DESPERATE_RAGE: {
    id: "DESPERATE_RAGE",
    name: "Rage du Désespoir",
    description: "+8 dégâts infligés au boss à chaque bonne réponse tant qu'il ne reste qu'1 PV.",
    icon: "i-heroicons-fire",
    branch: "RESISTANCE",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "BOSS_DAMAGE_AT_LOW_HP",
    value: 8,
  },
  COLD_BLOOD: {
    id: "COLD_BLOOD",
    name: "Sang-Froid",
    description: "+5s de base sur le chrono des questions de boss tant qu'il ne reste qu'1 PV.",
    icon: "i-heroicons-clock",
    branch: "RESISTANCE",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "BOSS_TIME_AT_LOW_HP",
    value: 5_000,
  },
  ACT_SHIELD: {
    id: "ACT_SHIELD",
    name: "Bouclier d'Acte",
    description: "Octroie un Bouclier au début de chaque Acte.",
    icon: "i-heroicons-shield-check",
    branch: "RESISTANCE",
    tier: 2,
    cost: 70,
    prerequisites: ["VALIANT_HEART"],
    requireAll: true,
    effect: "SHIELD_ON_ACT_START",
    value: 1,
  },
  VITALITY: {
    id: "VITALITY",
    name: "Vitalité",
    description: "+1 PV de départ (et PV max) sur chaque nouvelle run.",
    icon: "i-heroicons-heart",
    branch: "RESISTANCE",
    tier: 2,
    cost: 70,
    prerequisites: ["DESPERATE_RAGE", "COLD_BLOOD"],
    requireAll: false,
    effect: "START_HP",
    value: 1,
  },
  BOSS_SHIELD: {
    id: "BOSS_SHIELD",
    name: "Bouclier du Boss",
    description: "Octroie un Bouclier au début de chaque combat de Boss.",
    icon: "i-heroicons-shield-exclamation",
    branch: "RESISTANCE",
    tier: 3,
    cost: 100,
    prerequisites: ["ACT_SHIELD", "VITALITY"],
    requireAll: true,
    effect: "SHIELD_ON_BOSS_START",
    value: 1,
  },
  SECOND_WIND: {
    id: "SECOND_WIND",
    name: "Second Souffle",
    description:
      "La 1re fois que vous devriez mourir sans qu'aucun consommable ou relique ne puisse vous ressusciter, revenez à 2 PV. Une fois par run.",
    icon: "i-heroicons-sparkles",
    branch: "RESISTANCE",
    tier: 4,
    cost: 180,
    prerequisites: ["BOSS_SHIELD"],
    requireAll: true,
    effect: "ULTIMATE_REVIVE_2HP",
    value: 2,
  },

  // ---- Dégâts (rouge) ----
  REINFORCED_STRIKE: {
    id: "REINFORCED_STRIKE",
    name: "Frappe Renforcée",
    description: "+5 dégâts de base infligés au boss à chaque bonne réponse.",
    icon: "i-heroicons-bolt",
    branch: "DAMAGE",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "BOSS_DAMAGE_BASE_BONUS",
    value: 5,
  },
  SHARP_REFLEXES: {
    id: "SHARP_REFLEXES",
    name: "Réflexes Affûtés",
    description: "+3s de base sur le chrono des questions de boss.",
    icon: "i-heroicons-clock",
    branch: "DAMAGE",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "BOSS_TIME_BONUS",
    value: 3_000,
  },
  DECISIVE_STRIKE: {
    id: "DECISIVE_STRIKE",
    name: "Frappe Décisive",
    description:
      "+10 dégâts de base infligés au boss à chaque bonne réponse (remplace Frappe Renforcée, ne s'y additionne pas).",
    icon: "i-heroicons-fire",
    branch: "DAMAGE",
    tier: 2,
    cost: 70,
    prerequisites: ["REINFORCED_STRIKE"],
    requireAll: true,
    effect: "BOSS_DAMAGE_BASE_BONUS",
    value: 10,
  },
  EXTENDED_RESPITE: {
    id: "EXTENDED_RESPITE",
    name: "Répit Prolongé",
    description:
      "+5s de base sur le chrono des questions de boss (remplace Réflexes Affûtés, ne s'y additionne pas).",
    icon: "i-heroicons-clock",
    branch: "DAMAGE",
    tier: 2,
    cost: 70,
    prerequisites: ["SHARP_REFLEXES"],
    requireAll: true,
    effect: "BOSS_TIME_BONUS",
    value: 5_000,
  },
  OPENING_BREACH: {
    id: "OPENING_BREACH",
    name: "Faille d'Entrée",
    description: "Les boss commencent le combat avec 10% de PV en moins.",
    icon: "i-heroicons-arrow-trending-down",
    branch: "DAMAGE",
    tier: 3,
    cost: 100,
    prerequisites: ["DECISIVE_STRIKE"],
    requireAll: true,
    effect: "BOSS_HP_REDUCTION_PCT",
    value: 10,
  },
  FIRST_BREATH: {
    id: "FIRST_BREATH",
    name: "Premier Souffle",
    description:
      "La 1re réponse soumise dans un combat de boss n'a plus de limite de temps (les dégâts potentiels peuvent quand même descendre à 0 selon le temps pris).",
    icon: "i-heroicons-play",
    branch: "DAMAGE",
    tier: 3,
    cost: 100,
    prerequisites: ["EXTENDED_RESPITE"],
    requireAll: true,
    effect: "BOSS_FIRST_ANSWER_NO_TIMEOUT",
    value: 1,
  },
  GUARANTEED_STRIKE: {
    id: "GUARANTEED_STRIKE",
    name: "Coup Assuré",
    description: "Les dégâts de base infligés au boss ne peuvent plus descendre sous 20.",
    icon: "i-heroicons-sparkles",
    branch: "DAMAGE",
    tier: 4,
    cost: 180,
    prerequisites: ["OPENING_BREACH", "FIRST_BREATH"],
    requireAll: false,
    effect: "BOSS_MIN_DAMAGE_FLOOR",
    value: 20,
  },

  // ---- Utilitaire (bleu) ----
  NEST_EGG: {
    id: "NEST_EGG",
    name: "Bas de Laine",
    description: "+20 or au démarrage de chaque run.",
    icon: "i-heroicons-banknotes",
    branch: "UTILITY",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "START_GOLD",
    value: 20,
  },
  BUSINESS_SENSE: {
    id: "BUSINESS_SENSE",
    name: "Sens du Commerce",
    description: "+10% d'or gagné pendant la run.",
    icon: "i-heroicons-chart-bar",
    branch: "UTILITY",
    tier: 1,
    cost: 40,
    prerequisites: [],
    requireAll: true,
    effect: "GOLD_GAIN_PCT",
    value: 10,
  },
  STARTER_KIT: {
    id: "STARTER_KIT",
    name: "Kit de Départ",
    description: "Commence chaque run avec 1 consommable aléatoire.",
    icon: "i-heroicons-gift",
    branch: "UTILITY",
    tier: 2,
    cost: 70,
    prerequisites: ["NEST_EGG"],
    requireAll: true,
    effect: "START_RANDOM_CONSUMABLE",
    value: 1,
  },
  SHARP_EYE: {
    id: "SHARP_EYE",
    name: "Œil affûté",
    description: "Chances nettement améliorées d'obtenir des reliques rares (offres et Librairie).",
    icon: "i-heroicons-eye",
    branch: "UTILITY",
    tier: 2,
    cost: 70,
    prerequisites: ["BUSINESS_SENSE"],
    requireAll: true,
    effect: "RELIC_RARITY_BOOST",
    value: 2,
  },
  FIRST_TREASURE: {
    id: "FIRST_TREASURE",
    name: "Premier Trésor",
    description: "Commence chaque run avec 1 relique commune aléatoire.",
    icon: "i-heroicons-cube",
    branch: "UTILITY",
    tier: 3,
    cost: 100,
    prerequisites: ["STARTER_KIT"],
    requireAll: true,
    effect: "START_RANDOM_COMMON_RELIC",
    value: 1,
  },
  GENEROSITY: {
    id: "GENEROSITY",
    name: "Générosité",
    description: "Les Élites proposent 4 récompenses au lieu de 3 (sans effet sur les Boss).",
    icon: "i-heroicons-gift-top",
    branch: "UTILITY",
    tier: 3,
    cost: 100,
    prerequisites: ["SHARP_EYE"],
    requireAll: true,
    effect: "ELITE_BONUS_OFFER_EXTRA",
    value: 1,
  },
  COMPOUND_INTEREST: {
    id: "COMPOUND_INTEREST",
    name: "Intérêts Composés",
    description: "+10% de Points de Savoir gagnés en fin de run.",
    icon: "i-heroicons-sparkles",
    branch: "UTILITY",
    tier: 4,
    cost: 180,
    prerequisites: ["FIRST_TREASURE", "GENEROSITY"],
    requireAll: false,
    effect: "KNOWLEDGE_POINTS_GAIN_PCT",
    value: 10,
  },
};
