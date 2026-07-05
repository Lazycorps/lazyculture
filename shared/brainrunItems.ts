/** Catalogue de contenu Brainrun Phase 3 (reliques, consommables, événements) : défini en code,
 * comme `server/utils/brainrunConfig.ts`, et partagé client/serveur pour l'affichage (noms,
 * icônes, descriptions) sans dupliquer ces données en base. */

export type BrainrunRelicId =
  | "ENCYCLOPEDIA"
  | "BROKEN_CHRONOMETER"
  | "SPECIALIZATION"
  | "SECOND_CHANCE"
  | "ADRENALINE"
  | "PROVIDENT_PURSE"
  | "THEME_PURGE"
  | "SIXTH_SENSE"
  | "EXTRA_HEART"
  | "FORESIGHT"
  | "CONSOLATION_PRIZE"
  | "EVENT_MAGNET"
  | "HAGGLER"
  | "RESTOCK";

/** Reliques pouvant être obtenues/proposées même une fois déjà possédées (exception à la règle
 * d'unicité des reliques) : chaque exemplaire supplémentaire cumule son effet. */
export const BRAINRUN_STACKABLE_RELIC_IDS: BrainrunRelicId[] = ["EXTRA_HEART"];

export type BrainrunConsumableId =
  | "FIFTY_FIFTY"
  | "PHONE_A_FRIEND"
  | "SHIELD"
  | "BOSS_CHRONO_BOOST"
  | "BOSS_DAMAGE_BOOST"
  | "MALUS_CANCEL"
  | "REDRAW_QUESTION"
  | "HEAL_POTION"
  | "RANDOM_STASH"
  | "REVIVE_TOKEN";

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
  rarity: BrainrunRarity;
  /** Prix en Boutique ; absent si l'objet n'y est jamais vendu (uniquement gagnable en jeu, cf. REVIVE_TOKEN). */
  shopPrice?: number;
};

/** Effet ponctuel appliqué à la question en cours d'une salle (persisté sur BrainrunRoom.consumableReveal,
 * réinitialisé dès la question suivante) : 50/50, Appel à un ami, et les nouveaux consommables de combat de boss. */
export type BrainrunConsumableReveal = {
  eliminatedIds?: number[];
  hintId?: number;
  /** Sablier Fêlé : bonus de temps (ms) sur la question de boss en cours. */
  chronoBonusMs?: number;
  /** Coup de Grâce : dégâts bonus si la réponse de boss en cours est correcte. */
  damageBonus?: number;
  /** Antidote : annule l'affichage du malus du boss sur la question en cours. */
  malusCancelled?: boolean;
  /** Sixième Sens : id de la bonne réponse, tiré à l'apparition de la question ; le client ne
   * l'affiche qu'après BRAINRUN_SIXTH_SENSE_DELAY_MS (contrairement à hintId, toujours correct). */
  autoHintId?: number;
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
  THEME_PURGE: {
    id: "THEME_PURGE",
    name: "Purge Thématique",
    description:
      "À l'obtention, bannissez un thème pour le reste de la run : les ennemis et boss l'ayant dans leur pool ne peuvent plus être tirés.",
    icon: "i-heroicons-no-symbol",
    rarity: "RARE",
  },
  SIXTH_SENSE: {
    id: "SIXTH_SENSE",
    name: "Sixième Sens",
    description: "5% de chance par question de révéler la bonne réponse après 8 secondes.",
    icon: "i-heroicons-light-bulb",
    rarity: "COMMON",
  },
  EXTRA_HEART: {
    id: "EXTRA_HEART",
    name: "Cœur Supplémentaire",
    description: "+1 Pv max, rempli immédiatement. Peut être obtenue plusieurs fois par run.",
    icon: "i-heroicons-heart",
    rarity: "RARE",
  },
  FORESIGHT: {
    id: "FORESIGHT",
    name: "Prévoyance",
    description: "Lors d'un choix de salle, révèle les propositions du point de choix suivant.",
    icon: "i-heroicons-eye",
    rarity: "COMMON",
  },
  CONSOLATION_PRIZE: {
    id: "CONSOLATION_PRIZE",
    name: "Lot de Consolation",
    description: "Gagnez de l'or lorsque vous ignorez une récompense.",
    icon: "i-heroicons-gift",
    rarity: "COMMON",
  },
  EVENT_MAGNET: {
    id: "EVENT_MAGNET",
    name: "Aimant à Événements",
    description:
      "Augmente la probabilité qu'un Événement s'ajoute en 3e choix lors d'une sélection de salle.",
    icon: "i-heroicons-sparkles",
    rarity: "RARE",
  },
  HAGGLER: {
    id: "HAGGLER",
    name: "Marchandeur",
    description: "Les prix des Boutiques sont réduits de 20%.",
    icon: "i-heroicons-tag",
    rarity: "COMMON",
  },
  RESTOCK: {
    id: "RESTOCK",
    name: "Fournisseur Fidèle",
    description:
      "Dès qu'un objet est acheté en Boutique, un nouvel objet du même type prend sa place.",
    icon: "i-heroicons-arrow-path",
    rarity: "RARE",
  },
};

export const BRAINRUN_CONSUMABLES: Record<BrainrunConsumableId, BrainrunConsumableDef> = {
  FIFTY_FIFTY: {
    id: "FIFTY_FIFTY",
    name: "50/50",
    description: "Élimine la moitié des mauvaises propositions (arrondi à l'inférieur).",
    icon: "i-heroicons-scissors",
    rarity: "COMMON",
    shopPrice: 20,
  },
  PHONE_A_FRIEND: {
    id: "PHONE_A_FRIEND",
    name: "Appel à un ami",
    description: "Suggère une réponse — risque d'erreur croissant avec la difficulté.",
    icon: "i-heroicons-phone",
    rarity: "COMMON",
    shopPrice: 20,
  },
  SHIELD: {
    id: "SHIELD",
    name: "Bouclier",
    description: "Annule la prochaine perte de PV, au combat comme lors d'un Événement.",
    icon: "i-heroicons-shield-check",
    rarity: "COMMON",
    shopPrice: 20,
  },
  BOSS_CHRONO_BOOST: {
    id: "BOSS_CHRONO_BOOST",
    name: "Sablier Fêlé",
    description: "+5 secondes sur le chrono de la question de boss en cours.",
    icon: "i-heroicons-clock",
    rarity: "COMMON",
    shopPrice: 15,
  },
  BOSS_DAMAGE_BOOST: {
    id: "BOSS_DAMAGE_BOOST",
    name: "Coup de Grâce",
    description: "+10 dégâts au boss si la réponse en cours est correcte.",
    icon: "i-heroicons-fire",
    rarity: "COMMON",
    shopPrice: 20,
  },
  MALUS_CANCEL: {
    id: "MALUS_CANCEL",
    name: "Antidote",
    description: "Annule le malus du boss sur la question en cours.",
    icon: "i-heroicons-beaker",
    rarity: "COMMON",
    shopPrice: 10,
  },
  REDRAW_QUESTION: {
    id: "REDRAW_QUESTION",
    name: "Nouvelle Pioche",
    description: "Remplace la question en cours par une nouvelle, de même difficulté.",
    icon: "i-heroicons-arrow-path",
    rarity: "RARE",
    shopPrice: 35,
  },
  HEAL_POTION: {
    id: "HEAL_POTION",
    name: "Potion de Soin",
    description: "Régénère 1 point de vie.",
    icon: "i-heroicons-heart",
    rarity: "RARE",
    shopPrice: 35,
  },
  RANDOM_STASH: {
    id: "RANDOM_STASH",
    name: "Cargaison Surprise",
    description: "Tire 3 consommables courants au hasard.",
    icon: "i-heroicons-gift",
    rarity: "RARE",
    shopPrice: 30,
  },
  REVIVE_TOKEN: {
    id: "REVIVE_TOKEN",
    name: "Dernier Souffle",
    description:
      "Vous ressuscite automatiquement à 1 PV la première fois où vous devriez mourir. Se consomme après usage.",
    icon: "i-heroicons-sparkles",
    rarity: "RARE",
    // Pas de shopPrice : jamais en vente en Boutique, uniquement en bonus post-combat/Événement.
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

/** Poids de tirage par rareté, partagé par les reliques et les consommables (RARE ~4x moins fréquent que COMMON). */
export const BRAINRUN_RARITY_WEIGHT: Record<BrainrunRarity, number> = {
  COMMON: 3,
  RARE: 1,
};

export const BRAINRUN_RELIC_SHOP_PRICE: Record<BrainrunRarity, number> = {
  COMMON: 40,
  RARE: 90,
};

/** Offre de secours (or) quand le pool de reliques/consommables proposables est épuisé. */
export const BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT = 15;

export const BRAINRUN_BONUS_OFFER_COUNT = 3;
export const BRAINRUN_SHOP_RELIC_OFFER_COUNT = 2;
export const BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT = 2;

/** Nombre de consommables tirés par "Cargaison Surprise" (toujours dans le pool Commun). */
export const BRAINRUN_RANDOM_STASH_COUNT = 3;
/** Bonus de temps (ms) accordé par "Sablier Fêlé" sur la question de boss en cours. */
export const BRAINRUN_CHRONO_BOOST_MS = 5000;
/** Dégâts bonus accordés par "Coup de Grâce" si la réponse de boss en cours est correcte. */
export const BRAINRUN_DAMAGE_BOOST_AMOUNT = 10;

/** Chance qu'"Appel à un ami" suggère une réponse fausse, en fonction de la difficulté (1-5) de
 * la question : 0% à la difficulté la plus faible, ~20% à la plus élevée, linéaire entre les deux. */
export const BRAINRUN_PHONE_A_FRIEND_MAX_WRONG_CHANCE = 0.2;
export function phoneAFriendWrongChance(difficulty: number): number {
  const clamped = Math.min(5, Math.max(1, difficulty));
  return ((clamped - 1) / 4) * BRAINRUN_PHONE_A_FRIEND_MAX_WRONG_CHANCE;
}
