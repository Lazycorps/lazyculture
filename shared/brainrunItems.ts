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
  | "RESTOCK"
  | "BACKPACK";

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
  /** Restaure tous les PV (jusqu'au PV max courant), façon feu de camp — prioritaire sur `hp`. */
  fullHeal?: boolean;
  gold?: number;
  relic?: "RANDOM";
  /** "RANDOM" tire un type de consommable au hasard dans le catalogue. */
  consumables?: { id: BrainrunConsumableId | "RANDOM"; amount: number }[];
  /** Charges de Bouclier octroyées (annulent chacune 1 perte de PV au prochain combat). */
  shieldCharges?: number;
  /** Charges de 50/50 automatique sur les N prochaines questions de combat (cf. resolveEvent). */
  fiftyFiftyCharges?: number;
  /** Octroie un Dernier Souffle (REVIVE_TOKEN) : résurrection automatique à la 1re mort. */
  revive?: boolean;
};

export type BrainrunEventCost = {
  hp?: number;
  gold?: number;
  /** Réduction permanente des PV max (ex. rançon d'une résurrection). Le coût reste toujours
   * explicite sur l'option — jamais tiré au sort — pour ne pas punir le joueur par surprise. */
  maxHp?: number;
  /** Sacrifie une relique possédée au hasard (aucun effet si le joueur n'en possède aucune). */
  relic?: "RANDOM_OWNED";
};

/** Un résultat possible d'une option d'Événement, tiré au sort masqué (poids relatif `weight`).
 * `reward` absent = "rien ne se passe". `resultText` = phrase de lore affichée au passé une fois le
 * choix résolu. Une option à un seul outcome est donc déterministe. Par convention (cf. resolveEvent),
 * un outcome ne porte jamais de coût caché : les coûts sont toujours explicites sur l'option. */
export type BrainrunEventOutcome = {
  weight: number;
  reward?: BrainrunEventReward;
  resultText: string;
};

export type BrainrunEventOption = {
  label: string;
  /** Coût explicite payé d'avance quel que soit le tirage (visible par le joueur avant de choisir). */
  cost?: BrainrunEventCost;
  /** Table de résultats masquée pondérée : au moins 1 entrée. */
  outcomes: BrainrunEventOutcome[];
};

export type BrainrunEventDef = {
  id: string;
  /** Acte auquel l'événement appartient (1-3) : le pool est tiré sans remise par acte à la
   * génération de la carte (cf. assignEventIdentities), garantissant aucun doublon sur une run. */
  act: number;
  title: string;
  description: string;
  /** 2 à 3 options proposées au joueur. */
  options: BrainrunEventOption[];
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
    description: "20% de chance de récupérer 1 PV à la fin de chaque combat.",
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
    description:
      "Cliquez sur un nœud de combat, où qu'il soit sur la carte, pour voir les thèmes de son ennemi.",
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
    description: "Chance qu'un futur combat sur la carte se transforme en Événement.",
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
  BACKPACK: {
    id: "BACKPACK",
    name: "Sac à Dos",
    description: "+2 emplacements de consommables (5 au lieu de 3).",
    icon: "i-heroicons-briefcase",
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

/**
 * Catalogue des Événements, groupés par acte (8 par acte, aucun doublon possible sur une run car
 * tirés sans remise à la génération de la carte, cf. assignEventIdentities). Montée en puissance
 * par acte : Acte 1 petits enjeux (or/PV/communs), Acte 2 enjeux moyens (RARE, 2 charges, 50/50 x3),
 * Acte 3 gros enjeux (relique, résurrection contre PV max, effets premium).
 *
 * Convention "façon Slay the Spire" : le `cost` d'une option est explicite et payé d'avance ; le
 * `reward` est tiré au sort masqué dans `outcomes` (pondéré par `weight`), avec parfois "rien ne se
 * passe" (outcome sans reward). Un outcome ne porte jamais de coût caché — les pertes sont toujours
 * annoncées sur l'option (cf. resolveEventOption).
 */
export const BRAINRUN_EVENTS: Record<string, BrainrunEventDef> = {
  // ─────────────────────────────── ACTE 1 — petits enjeux ───────────────────────────────
  GRIMOIRE_CORNE: {
    id: "GRIMOIRE_CORNE",
    act: 1,
    title: "Le Grimoire Corné",
    description: "Un vieux manuel scolaire gonflé d'humidité gît sur un pupitre poussiéreux.",
    options: [
      {
        label: "Le feuilleter",
        outcomes: [
          {
            weight: 65,
            reward: { gold: 10 },
            resultText: "Une pièce oubliée glisse d'entre les pages.",
          },
          { weight: 35, resultText: "Les pages collées ne révèlent qu'une odeur de moisi." },
        ],
      },
      {
        label: "En arracher le chapitre interdit",
        cost: { hp: 1 },
        outcomes: [
          {
            weight: 80,
            reward: { consumables: [{ id: "RANDOM", amount: 1 }] },
            resultText: "Le savoir défendu se matérialise entre vos mains.",
          },
          {
            weight: 20,
            resultText: "La page se désagrège en poussière avant que vous ne lisiez un mot.",
          },
        ],
      },
    ],
  },
  FONTAINE_REPONSES: {
    id: "FONTAINE_REPONSES",
    act: 1,
    title: "La Fontaine aux Réponses",
    description: "Une source claire murmure des demi-vérités à qui tend l'oreille.",
    options: [
      {
        label: "Boire une gorgée",
        outcomes: [
          { weight: 60, reward: { hp: 1 }, resultText: "L'eau vive vous ravigote." },
          { weight: 40, resultText: "Le goût est amer ; rien ne se passe." },
        ],
      },
      {
        label: "Y jeter une pièce",
        cost: { gold: 5 },
        outcomes: [
          {
            weight: 70,
            reward: { shieldCharges: 1 },
            resultText: "Un halo protecteur enveloppe votre esprit.",
          },
          {
            weight: 30,
            reward: { gold: 15 },
            resultText: "La fontaine recrache une poignée de pièces, généreuse.",
          },
        ],
      },
    ],
  },
  BIBLIOTHECAIRE_FANTOME: {
    id: "BIBLIOTHECAIRE_FANTOME",
    act: 1,
    title: "Le Bibliothécaire Fantôme",
    description: "Un spectre érudit vous soumet une colle sur un détail oublié de l'Histoire.",
    options: [
      {
        label: "Tenter votre chance",
        outcomes: [
          {
            weight: 50,
            reward: { gold: 12 },
            resultText: "Bonne réponse ! Le fantôme vous récompense d'un sourire et d'or.",
          },
          { weight: 50, resultText: "Faux. Le spectre soupire et se dissipe." },
        ],
      },
      {
        label: "Avouer votre ignorance",
        outcomes: [
          {
            weight: 1,
            reward: { consumables: [{ id: "PHONE_A_FRIEND", amount: 1 }] },
            resultText: "Touché par votre humilité, il vous confie un moyen d'appeler à l'aide.",
          },
        ],
      },
    ],
  },
  COLPORTEUR_ANECDOTES: {
    id: "COLPORTEUR_ANECDOTES",
    act: 1,
    title: "Le Colporteur d'Anecdotes",
    description: "Un marchand ambulant vend des « faits véridiques » à la criée.",
    options: [
      {
        label: "Lui acheter un tuyau",
        cost: { gold: 10 },
        outcomes: [
          {
            weight: 60,
            reward: { consumables: [{ id: "FIFTY_FIFTY", amount: 1 }] },
            resultText: "Son astuce vous aidera à éliminer les mauvaises pistes.",
          },
          {
            weight: 25,
            reward: { consumables: [{ id: "PHONE_A_FRIEND", amount: 1 }] },
            resultText: "Il vous glisse le contact d'un ami savant.",
          },
          { weight: 15, resultText: "Le « fait » était une pure invention. Argent perdu." },
        ],
      },
      {
        label: "Passer votre chemin",
        outcomes: [{ weight: 1, resultText: "Vous ignorez le bonimenteur et poursuivez." }],
      },
    ],
  },
  MALLE_CANCRE: {
    id: "MALLE_CANCRE",
    act: 1,
    title: "La Malle du Cancre",
    description: "Un coffre d'écolier abandonné, cadenas rouillé par les années.",
    options: [
      {
        label: "Forcer le cadenas",
        cost: { hp: 1 },
        outcomes: [
          {
            weight: 70,
            reward: { gold: 18 },
            resultText: "Un magot d'argent de poche accumulé au fil des ans !",
          },
          {
            weight: 20,
            reward: { consumables: [{ id: "RANDOM", amount: 1 }] },
            resultText: "Un objet oublié mais bien utile s'y cachait.",
          },
          { weight: 10, resultText: "La malle était vide, hormis des copies raturées." },
        ],
      },
      {
        label: "Laisser fermé",
        outcomes: [{ weight: 1, resultText: "Vous respectez le secret du cancre et continuez." }],
      },
    ],
  },
  PARCHEMIN_VIERGE: {
    id: "PARCHEMIN_VIERGE",
    act: 1,
    title: "Le Parchemin Vierge",
    description: "Un parchemin ancien réclame qu'on y inscrive une trace de savoir.",
    options: [
      {
        label: "Y inscrire votre nom",
        outcomes: [
          {
            weight: 55,
            reward: { relic: "RANDOM" },
            resultText: "Le parchemin s'illumine et vous confère un artefact.",
          },
          { weight: 45, resultText: "L'encre sèche sans magie. Rien ne se produit." },
        ],
      },
      {
        label: "Ranger le parchemin",
        outcomes: [{ weight: 1, resultText: "Vous laissez le parchemin à un futur érudit." }],
      },
    ],
  },
  DUEL_TRIVIA: {
    id: "DUEL_TRIVIA",
    act: 1,
    title: "Le Duel de Trivia",
    description: "Un rival vous provoque en duel de culture générale, mise à l'appui.",
    options: [
      {
        label: "Relever le défi",
        cost: { gold: 5 },
        outcomes: [
          {
            weight: 60,
            reward: { gold: 15 },
            resultText: "Vous coiffez votre rival au poteau et raflez la mise !",
          },
          { weight: 40, resultText: "Battu d'une question. Votre mise est perdue." },
        ],
      },
      {
        label: "Décliner",
        outcomes: [{ weight: 1, resultText: "Vous refusez le duel, prudent." }],
      },
    ],
  },
  AUTEL_NOVICES: {
    id: "AUTEL_NOVICES",
    act: 1,
    title: "L'Autel des Novices",
    description: "Un petit autel dédié aux apprentis, où l'on dépose une offrande.",
    options: [
      {
        label: "Offrir une pièce",
        cost: { gold: 10 },
        outcomes: [
          {
            weight: 65,
            reward: { shieldCharges: 1 },
            resultText: "L'autel vous bénit d'une protection.",
          },
          {
            weight: 35,
            reward: { relic: "RANDOM" },
            resultText: "Une relique modeste apparaît sur la pierre.",
          },
        ],
      },
      {
        label: "Prier gratuitement",
        outcomes: [
          {
            weight: 30,
            reward: { hp: 1 },
            resultText: "Un souffle apaisant vous soigne légèrement.",
          },
          { weight: 70, resultText: "Votre prière reste sans réponse." },
        ],
      },
    ],
  },
  // ─────────────────────────────── ACTE 2 — enjeux moyens ───────────────────────────────
  BIBLIOTHEQUE_INTERDITE: {
    id: "BIBLIOTHEQUE_INTERDITE",
    act: 2,
    title: "La Bibliothèque Interdite",
    description: "Des rayonnages scellés, gardés par un mécanisme grinçant.",
    options: [
      {
        label: "Fouiller prudemment",
        outcomes: [
          {
            weight: 60,
            reward: { gold: 20 },
            resultText: "Vous dénichez une bourse dissimulée entre deux traités.",
          },
          { weight: 40, resultText: "Les rayons accessibles ne recèlent rien de valeur." },
        ],
      },
      {
        label: "Briser le sceau",
        cost: { hp: 1 },
        outcomes: [
          {
            weight: 70,
            reward: { relic: "RANDOM" },
            resultText: "Un artefact scellé vous est révélé.",
          },
          {
            weight: 30,
            reward: { gold: 25 },
            resultText: "Pas de relique, mais un coffret d'or bien garni.",
          },
        ],
      },
    ],
  },
  ORACLE_AMBIGU: {
    id: "ORACLE_AMBIGU",
    act: 2,
    title: "L'Oracle Ambigu",
    description: "Une voyante trouble entrevoit trois futurs possibles pour vous.",
    options: [
      {
        label: "Payer la vision",
        cost: { gold: 15 },
        outcomes: [
          {
            weight: 50,
            reward: { fiftyFiftyCharges: 3 },
            resultText: "Elle vous montre les pièges de vos trois prochaines épreuves.",
          },
          {
            weight: 35,
            reward: { shieldCharges: 2 },
            resultText: "Elle dresse autour de vous un double rempart.",
          },
          { weight: 15, resultText: "Sa transe échoue ; la fumée se dissipe sans révélation." },
        ],
      },
      {
        label: "Repartir",
        outcomes: [{ weight: 1, resultText: "Vous quittez l'antre sans consulter l'oracle." }],
      },
    ],
  },
  PACTE_SAVOIR: {
    id: "PACTE_SAVOIR",
    act: 2,
    title: "Le Pacte du Savoir",
    description: "Un esprit propose d'échanger l'un de vos artefacts contre un autre, au hasard.",
    options: [
      {
        label: "Tenter l'échange",
        cost: { relic: "RANDOM_OWNED" },
        outcomes: [
          {
            weight: 75,
            reward: { relic: "RANDOM" },
            resultText: "L'échange est équitable : une nouvelle relique remplace l'ancienne.",
          },
          {
            weight: 25,
            reward: { relic: "RANDOM", gold: 10 },
            resultText: "L'esprit, magnanime, ajoute un pourboire à l'échange.",
          },
        ],
      },
      {
        label: "Refuser",
        outcomes: [{ weight: 1, resultText: "Vous serrez vos reliques et déclinez." }],
      },
    ],
  },
  MARCHE_OMBRES: {
    id: "MARCHE_OMBRES",
    act: 2,
    title: "Le Marché aux Ombres",
    description: "Sous un porche obscur, un trafiquant propose une relique de contrebande.",
    options: [
      {
        label: "Payer le prix fort",
        cost: { gold: 25 },
        outcomes: [
          {
            weight: 80,
            reward: { relic: "RANDOM" },
            resultText: "La marchandise est authentique : une relique change de mains.",
          },
          {
            weight: 20,
            reward: { relic: "RANDOM", gold: 20 },
            resultText: "Pièce de collection ! Le trafiquant vous rétrocède même une part.",
          },
        ],
      },
      {
        label: "Refuser la marchandise",
        outcomes: [{ weight: 1, resultText: "Vous déclinez l'offre douteuse et poursuivez." }],
      },
    ],
  },
  SABLIER_FISSURE: {
    id: "SABLIER_FISSURE",
    act: 2,
    title: "Le Sablier Fissuré",
    description: "Un sablier fêlé fait miroiter un répit face aux gardiens à venir.",
    options: [
      {
        label: "Le retourner",
        outcomes: [
          {
            weight: 50,
            reward: {
              consumables: [
                { id: "BOSS_CHRONO_BOOST", amount: 1 },
                { id: "BOSS_DAMAGE_BOOST", amount: 1 },
              ],
            },
            resultText: "Le temps vous confie de quoi bousculer un boss.",
          },
          {
            weight: 50,
            reward: { consumables: [{ id: "MALUS_CANCEL", amount: 1 }] },
            resultText: "Un antidote se cristallise dans le verre fêlé.",
          },
        ],
      },
      {
        label: "Ne pas y toucher",
        outcomes: [{ weight: 1, resultText: "Vous laissez le sablier à sa lente agonie." }],
      },
    ],
  },
  SALLE_EXAMEN: {
    id: "SALLE_EXAMEN",
    act: 2,
    title: "La Salle d'Examen",
    description: "Une salle silencieuse ; un surveillant vous tend une copie et un chronomètre.",
    options: [
      {
        label: "Composer",
        cost: { hp: 1 },
        outcomes: [
          {
            weight: 60,
            reward: { gold: 30 },
            resultText: "Copie brillante : votre bourse d'excellence est bien garnie.",
          },
          {
            weight: 25,
            reward: { relic: "RANDOM" },
            resultText: "Le jury, impressionné, vous décerne un artefact.",
          },
          { weight: 15, resultText: "Copie blanche. Le stress n'a rien donné." },
        ],
      },
      {
        label: "Sécher l'examen",
        outcomes: [
          {
            weight: 40,
            reward: { gold: 8 },
            resultText: "Vous revendez vos notes à un cancre dans le couloir.",
          },
          { weight: 60, resultText: "Vous filez sans demander votre reste." },
        ],
      },
    ],
  },
  PUITS_SOUHAITS: {
    id: "PUITS_SOUHAITS",
    act: 2,
    title: "Le Puits à Souhaits Érudit",
    description: "Un puits ancien exauce, dit-on, les vœux des esprits curieux.",
    options: [
      {
        label: "Y jeter une bourse",
        cost: { gold: 20 },
        outcomes: [
          {
            weight: 55,
            reward: { shieldCharges: 2 },
            resultText: "Deux gardiens invisibles se dressent à vos côtés.",
          },
          { weight: 30, reward: { hp: 2 }, resultText: "Une eau régénérante remonte du puits." },
          {
            weight: 15,
            reward: { gold: 40 },
            resultText: "Le puits déborde de pièces : jackpot !",
          },
        ],
      },
      {
        label: "Regarder au fond",
        outcomes: [
          {
            weight: 25,
            reward: { consumables: [{ id: "RANDOM", amount: 1 }] },
            resultText: "Un objet flotte à la surface, à portée de main.",
          },
          { weight: 75, resultText: "Vous ne voyez que votre reflet dans l'eau noire." },
        ],
      },
    ],
  },
  COPISTE_MALADE: {
    id: "COPISTE_MALADE",
    act: 2,
    title: "Le Copiste Malade",
    description: "Un vieux copiste fiévreux propose de léguer son savoir contre votre vitalité.",
    options: [
      {
        label: "Recueillir ses notes",
        cost: { hp: 2 },
        outcomes: [
          {
            weight: 80,
            reward: { relic: "RANDOM" },
            resultText: "Ses années de labeur se condensent en une relique précieuse.",
          },
          {
            weight: 20,
            reward: { relic: "RANDOM", consumables: [{ id: "RANDOM", amount: 1 }] },
            resultText: "Il vous lègue bien plus qu'espéré.",
          },
        ],
      },
      {
        label: "Le veiller",
        outcomes: [
          {
            weight: 30,
            reward: { hp: 1 },
            resultText: "Votre bonté vous apaise ; vous récupérez un peu.",
          },
          {
            weight: 70,
            resultText: "Vous veillez le copiste jusqu'à l'aube, sans autre récompense.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────── ACTE 3 — gros enjeux ───────────────────────────────
  BIBLIOTHEQUE_ALEXANDRIE: {
    id: "BIBLIOTHEQUE_ALEXANDRIE",
    act: 3,
    title: "La Grande Bibliothèque",
    description: "La bibliothèque ultime brûle ; le savoir du monde part en fumée sous vos yeux.",
    options: [
      {
        label: "Sauver un manuscrit",
        cost: { hp: 2 },
        outcomes: [
          {
            weight: 75,
            reward: { relic: "RANDOM" },
            resultText: "Vous arrachez aux flammes un traité inestimable.",
          },
          {
            weight: 25,
            reward: { relic: "RANDOM", gold: 20 },
            resultText: "Le manuscrit sauvé recelait aussi une bourse.",
          },
        ],
      },
      {
        label: "Contempler l'incendie",
        outcomes: [
          {
            weight: 40,
            reward: { gold: 25 },
            resultText: "Vous monnayez quelques feuillets calcinés à un collectionneur.",
          },
          { weight: 60, resultText: "Vous regardez, impuissant, le savoir se consumer." },
        ],
      },
    ],
  },
  PHENIX_ERUDIT: {
    id: "PHENIX_ERUDIT",
    act: 3,
    title: "Le Phénix Érudit",
    description:
      "Un phénix de parchemin offre de renaître avec vous — au prix permanent d'une part de votre vitalité.",
    options: [
      {
        label: "Accepter le don (−1 PV max)",
        cost: { maxHp: 1 },
        outcomes: [
          {
            weight: 1,
            reward: { revive: true },
            resultText:
              "Le phénix scelle en vous une seconde vie, prélevant un peu de votre souffle.",
          },
        ],
      },
      {
        label: "Refuser le pacte",
        outcomes: [
          {
            weight: 1,
            resultText: "Vous déclinez ; certaines dettes ne valent pas d'être contractées.",
          },
        ],
      },
    ],
  },
  ORACLE_TROIS_VERITES: {
    id: "ORACLE_TROIS_VERITES",
    act: 3,
    title: "L'Oracle des Trois Vérités",
    description: "Un grand oracle propose de dévoiler les pièges de vos trois prochaines épreuves.",
    options: [
      {
        label: "Payer le grand rituel",
        cost: { gold: 30 },
        outcomes: [
          {
            weight: 60,
            reward: { fiftyFiftyCharges: 3 },
            resultText: "Les faux-semblants de vos trois prochaines questions vous apparaissent.",
          },
          {
            weight: 40,
            reward: { shieldCharges: 2 },
            resultText: "À défaut de clairvoyance, l'oracle vous protège doublement.",
          },
        ],
      },
      {
        label: "Décliner",
        outcomes: [
          { weight: 1, resultText: "Vous préférez affronter l'inconnu à visage découvert." },
        ],
      },
    ],
  },
  TRIBUNAL_SAVOIR: {
    id: "TRIBUNAL_SAVOIR",
    act: 3,
    title: "Le Tribunal du Savoir",
    description:
      "Un tribunal d'érudits juge votre valeur ; plaider coûte cher mais peut rapporter gros.",
    options: [
      {
        label: "Plaider votre cause",
        cost: { gold: 40 },
        outcomes: [
          {
            weight: 60,
            reward: { relic: "RANDOM", gold: 30 },
            resultText: "Le jury tranche en votre faveur : relique et dédommagement !",
          },
          { weight: 40, resultText: "Débouté. Les frais de justice sont perdus." },
        ],
      },
      {
        label: "Renoncer",
        outcomes: [{ weight: 1, resultText: "Vous quittez la salle sans plaider." }],
      },
    ],
  },
  CHAMBRE_FORTE_SAGES: {
    id: "CHAMBRE_FORTE_SAGES",
    act: 3,
    title: "La Chambre Forte des Sages",
    description: "Une chambre forte scellée par des énigmes millénaires.",
    options: [
      {
        label: "Crocheter la serrure",
        cost: { hp: 2 },
        outcomes: [
          {
            weight: 70,
            reward: { gold: 50 },
            resultText: "Un trésor d'érudition converti en or pur !",
          },
          {
            weight: 20,
            reward: { relic: "RANDOM" },
            resultText: "Un artefact des sages repose au fond du coffre.",
          },
          { weight: 10, resultText: "La chambre était déjà pillée. Rien." },
        ],
      },
      {
        label: "S'éloigner",
        outcomes: [{ weight: 1, resultText: "Vous jugez le risque trop grand et passez." }],
      },
    ],
  },
  SANCTUAIRE_REPOS: {
    id: "SANCTUAIRE_REPOS",
    act: 3,
    title: "Le Sanctuaire du Repos",
    description: "Un havre de paix où méditer avant l'assaut final.",
    options: [
      {
        label: "Méditer",
        outcomes: [
          {
            weight: 35,
            reward: { fullHeal: true },
            resultText: "Une paix profonde vous envahit ; toutes vos blessures se referment.",
          },
          {
            weight: 40,
            reward: { hp: 2 },
            resultText: "Une méditation profonde restaure vos forces.",
          },
          { weight: 25, reward: { hp: 1 }, resultText: "Un court repos vous ravigote un peu." },
        ],
      },
      {
        label: "Communier avec les lieux",
        cost: { gold: 10 },
        outcomes: [
          {
            weight: 80,
            reward: { shieldCharges: 2 },
            resultText: "L'esprit du sanctuaire vous arme de deux protections.",
          },
          { weight: 20, reward: { hp: 3 }, resultText: "Une vague de vitalité vous submerge." },
        ],
      },
    ],
  },
  ECHANGE_FAUSTIEN: {
    id: "ECHANGE_FAUSTIEN",
    act: 3,
    title: "L'Échange Faustien",
    description: "Un contrat mirifique promet monts et merveilles contre l'une de vos reliques.",
    options: [
      {
        label: "Signer le pacte",
        cost: { relic: "RANDOM_OWNED" },
        outcomes: [
          {
            weight: 90,
            reward: { relic: "RANDOM", consumables: [{ id: "RANDOM", amount: 1 }] },
            resultText: "Le pacte tient ses promesses : bien plus que ce que vous cédez.",
          },
          {
            weight: 10,
            reward: { relic: "RANDOM" },
            resultText: "L'échange se fait, honnête sans être fastueux.",
          },
        ],
      },
      {
        label: "Brûler le contrat",
        outcomes: [{ weight: 1, resultText: "Vous jetez le parchemin au feu, méfiant." }],
      },
    ],
  },
  RELIQUE_SCELLEE: {
    id: "RELIQUE_SCELLEE",
    act: 3,
    title: "La Relique Scellée",
    description: "Une relique palpite sous un sceau de sang et de savoir.",
    options: [
      {
        label: "Briser le sceau",
        cost: { hp: 2 },
        outcomes: [
          {
            weight: 70,
            reward: { relic: "RANDOM" },
            resultText: "Le sceau cède ; la relique est vôtre.",
          },
          {
            weight: 30,
            reward: { relic: "RANDOM", shieldCharges: 2 },
            resultText: "La relique libère aussi une aura protectrice.",
          },
        ],
      },
      {
        label: "Laisser dormir",
        outcomes: [
          {
            weight: 20,
            reward: { gold: 15 },
            resultText: "Vous récupérez quelques éclats du sceau, monnayables.",
          },
          { weight: 80, resultText: "Vous laissez la relique à son sommeil." },
        ],
      },
    ],
  },
};

/** Ids des événements d'un acte donné (pool tiré sans remise à la génération de la carte). */
export function getBrainrunEventIdsByAct(act: number): string[] {
  return Object.values(BRAINRUN_EVENTS)
    .filter((event) => event.act === act)
    .map((event) => event.id);
}

/** PV max plancher en-dessous duquel une option d'Événement à coût `maxHp` est refusée (client
 * ET serveur), pour ne pas laisser le joueur se réduire à un état ingérable via une résurrection. */
export const BRAINRUN_EVENT_MIN_MAX_HP = 2;

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
