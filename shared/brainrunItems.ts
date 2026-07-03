/** Catalogue de contenu Brainrun Phase 3 (reliques, consommables, événements) : défini en code,
 * comme `server/utils/brainrunConfig.ts`, et partagé client/serveur pour l'affichage (noms,
 * icônes, descriptions) sans dupliquer ces données en base. */

export type BrainrunRelicId =
  | "ENCYCLOPEDIA"
  | "BROKEN_CHRONOMETER"
  | "SPECIALIZATION"
  | "SECOND_CHANCE"
  | "ADRENALINE"
  | "PROVIDENT_PURSE";

export type BrainrunConsumableId = "FIFTY_FIFTY" | "PHONE_A_FRIEND" | "SHIELD";

export type BrainrunRarity = "COMMON" | "RARE";

export type BrainrunRelicDef = {
  id: BrainrunRelicId;
  name: string;
  description: string;
  icon: string;
  rarity: BrainrunRarity;
};

export type BrainrunConsumableDef = {
  id: BrainrunConsumableId;
  name: string;
  description: string;
  icon: string;
};

export type BrainrunEventReward = {
  hp?: number;
  gold?: number;
  relic?: "RANDOM";
  /** "RANDOM" tire un type de consommable au hasard dans le catalogue. */
  consumables?: { id: BrainrunConsumableId | "RANDOM"; amount: number }[];
};

export type BrainrunEventCost = {
  hp?: number;
  gold?: number;
  /** Sacrifie une relique possédée au hasard (aucun effet si le joueur n'en possède aucune). */
  relic?: "RANDOM_OWNED";
};

export type BrainrunEventOption = {
  label: string;
  cost?: BrainrunEventCost;
  reward?: BrainrunEventReward;
};

export type BrainrunEventDef = {
  id: string;
  title: string;
  description: string;
  options: [BrainrunEventOption, BrainrunEventOption];
};

export type BrainrunOfferKind = "RELIC" | "CONSUMABLE" | "GOLD";

export type BrainrunOffer = {
  kind: BrainrunOfferKind;
  /** relicId, consumableId, ou "GOLD" pour l'offre de secours quand le pool est épuisé. */
  id: string;
  /** Uniquement pour les offres de la Boutique (le bonus post-combat est gratuit). */
  price?: number;
  /** Uniquement pour kind === "RELIC". */
  rarity?: BrainrunRarity;
  /** Uniquement pour kind === "GOLD" (offre de secours). */
  amount?: number;
};

export const BRAINRUN_RELICS: Record<BrainrunRelicId, BrainrunRelicDef> = {
  ENCYCLOPEDIA: {
    id: "ENCYCLOPEDIA",
    name: "Encyclopédie",
    description: "+20% d'or gagné à chaque salle.",
    icon: "i-heroicons-book-open",
    rarity: "COMMON",
  },
  BROKEN_CHRONOMETER: {
    id: "BROKEN_CHRONOMETER",
    name: "Chronomètre Brisé",
    description: "+3 secondes sur le chrono des questions de boss.",
    icon: "i-heroicons-clock",
    rarity: "RARE",
  },
  SPECIALIZATION: {
    id: "SPECIALIZATION",
    name: "Spécialisation",
    description: "Perd 1 PV de moins à chaque mauvaise réponse (minimum 1 PV perdu).",
    icon: "i-heroicons-academic-cap",
    rarity: "COMMON",
  },
  SECOND_CHANCE: {
    id: "SECOND_CHANCE",
    name: "Seconde Chance",
    description:
      "La première fois que vous devriez mourir, survivez à 1 PV à la place. Se consomme après usage.",
    icon: "i-heroicons-heart",
    rarity: "RARE",
  },
  ADRENALINE: {
    id: "ADRENALINE",
    name: "Adrénaline",
    description: "+5 dégâts infligés au boss à chaque bonne réponse.",
    icon: "i-heroicons-bolt",
    rarity: "COMMON",
  },
  PROVIDENT_PURSE: {
    id: "PROVIDENT_PURSE",
    name: "Bourse Providentielle",
    description: "+5 or fixe à chaque salle de combat nettoyée.",
    icon: "i-heroicons-banknotes",
    rarity: "COMMON",
  },
};

export const BRAINRUN_CONSUMABLES: Record<BrainrunConsumableId, BrainrunConsumableDef> = {
  FIFTY_FIFTY: {
    id: "FIFTY_FIFTY",
    name: "50/50",
    description: "Élimine la moitié des mauvaises propositions (arrondi à l'inférieur).",
    icon: "i-heroicons-scissors",
  },
  PHONE_A_FRIEND: {
    id: "PHONE_A_FRIEND",
    name: "Appel à un ami",
    description: "Suggère une réponse — risque d'erreur croissant avec la difficulté.",
    icon: "i-heroicons-phone",
  },
  SHIELD: {
    id: "SHIELD",
    name: "Bouclier",
    description: "Annule la prochaine perte de PV, au combat comme lors d'un Événement.",
    icon: "i-heroicons-shield-check",
  },
};

export const BRAINRUN_EVENTS: Record<string, BrainrunEventDef> = {
  BLACK_MARKET: {
    id: "BLACK_MARKET",
    title: "Marché noir",
    description: "Un marchand louche vous propose une relique en échange de votre or.",
    options: [
      { label: "Refuser et poursuivre" },
      { label: "Payer 15 or", cost: { gold: 15 }, reward: { relic: "RANDOM" } },
    ],
  },
  SACRIFICIAL_ALTAR: {
    id: "SACRIFICIAL_ALTAR",
    title: "Autel sacrificiel",
    description: "Un autel ancien réclame un sacrifice de vie en échange d'un pouvoir.",
    options: [
      { label: "Ignorer l'autel" },
      { label: "Sacrifier 1 PV", cost: { hp: 1 }, reward: { relic: "RANDOM" } },
    ],
  },
  FORBIDDEN_LIBRARY: {
    id: "FORBIDDEN_LIBRARY",
    title: "Bibliothèque défendue",
    description: "Des rayonnages interdits, gardés par un mécanisme dangereux.",
    options: [
      { label: "Fouiller prudemment", reward: { gold: 10 } },
      {
        label: "S'aventurer plus loin",
        cost: { hp: 1 },
        reward: { consumables: [{ id: "FIFTY_FIFTY", amount: 2 }] },
      },
    ],
  },
  MYSTIC_ORACLE: {
    id: "MYSTIC_ORACLE",
    title: "Oracle mystique",
    description: "Un oracle propose de vous équiper avant la suite du parcours.",
    options: [
      { label: "Repartir sans rien demander" },
      {
        label: "Consulter l'oracle (-10 or)",
        cost: { gold: 10 },
        reward: {
          consumables: [
            { id: "SHIELD", amount: 1 },
            { id: "PHONE_A_FRIEND", amount: 1 },
          ],
        },
      },
    ],
  },
  GENEROUS_SPIRIT: {
    id: "GENEROUS_SPIRIT",
    title: "Esprit généreux",
    description: "Un esprit facétieux vous propose un présent, sans rien demander en retour.",
    options: [
      {
        label: "Accepter le présent",
        reward: { consumables: [{ id: "RANDOM", amount: 1 }] },
      },
      { label: "Décliner poliment" },
    ],
  },
  MYSTIC_EXCHANGE: {
    id: "MYSTIC_EXCHANGE",
    title: "Échange mystique",
    description:
      "Un esprit vous propose d'échanger une de vos reliques contre une autre, au hasard.",
    options: [
      { label: "Refuser l'échange" },
      {
        label: "Tenter l'échange",
        cost: { relic: "RANDOM_OWNED" },
        reward: { relic: "RANDOM" },
      },
    ],
  },
};

export const BRAINRUN_RELIC_RARITY_WEIGHT: Record<BrainrunRarity, number> = {
  COMMON: 3,
  RARE: 1,
};

export const BRAINRUN_RELIC_SHOP_PRICE: Record<BrainrunRarity, number> = {
  COMMON: 40,
  RARE: 90,
};

export const BRAINRUN_CONSUMABLE_SHOP_PRICE = 20;

/** Offre de secours (or) quand le pool de reliques/consommables proposables est épuisé. */
export const BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT = 15;

export const BRAINRUN_BONUS_OFFER_COUNT = 3;
export const BRAINRUN_SHOP_RELIC_OFFER_COUNT = 2;
export const BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT = 2;

/** Chance qu'"Appel à un ami" suggère une réponse fausse, en fonction de la difficulté (1-5) de
 * la question : 0% à la difficulté la plus faible, ~20% à la plus élevée, linéaire entre les deux. */
export const BRAINRUN_PHONE_A_FRIEND_MAX_WRONG_CHANCE = 0.2;
export function phoneAFriendWrongChance(difficulty: number): number {
  const clamped = Math.min(5, Math.max(1, difficulty));
  return ((clamped - 1) / 4) * BRAINRUN_PHONE_A_FRIEND_MAX_WRONG_CHANCE;
}
