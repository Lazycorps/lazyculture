/** Catalogue de talents permanents Brainrun Phase 4 (metagame) : défini en code, comme
 * `shared/brainrunItems.ts`, et partagé client/serveur pour l'affichage sans dupliquer ces
 * données en base — seuls les ids débloqués sont persistés (BrainrunMetaProgress.unlockedTalents). */

export type BrainrunTalentId = "TOUGH_START" | "RARE_FINDER" | "STARTING_CAPITAL" | "BOSS_STRIKE";

export type BrainrunTalentEffectKind =
  | "START_HP"
  | "START_GOLD"
  | "RELIC_RARITY_BOOST"
  | "BOSS_DAMAGE";

export type BrainrunTalentDef = {
  id: BrainrunTalentId;
  name: string;
  description: string;
  icon: string;
  /** Coût en Points de Savoir, achat unique (pas de paliers/rangs). */
  cost: number;
  effect: BrainrunTalentEffectKind;
  value: number;
};

export const BRAINRUN_TALENTS: Record<BrainrunTalentId, BrainrunTalentDef> = {
  TOUGH_START: {
    id: "TOUGH_START",
    name: "Constitution",
    description: "+1 PV de départ (et PV max) sur chaque nouvelle run.",
    icon: "i-heroicons-heart",
    cost: 30,
    effect: "START_HP",
    value: 1,
  },
  RARE_FINDER: {
    id: "RARE_FINDER",
    name: "Œil affûté",
    description: "Chances nettement améliorées d'obtenir des reliques rares.",
    icon: "i-heroicons-sparkles",
    cost: 50,
    effect: "RELIC_RARITY_BOOST",
    value: 2,
  },
  STARTING_CAPITAL: {
    id: "STARTING_CAPITAL",
    name: "Bas de laine",
    description: "+20 or au démarrage de chaque run.",
    icon: "i-heroicons-banknotes",
    cost: 30,
    effect: "START_GOLD",
    value: 20,
  },
  BOSS_STRIKE: {
    id: "BOSS_STRIKE",
    name: "Frappe assurée",
    description:
      "+3 dégâts infligés au boss à chaque bonne réponse (s'additionne à la relique Adrénaline).",
    icon: "i-heroicons-bolt",
    cost: 50,
    effect: "BOSS_DAMAGE",
    value: 3,
  },
};
