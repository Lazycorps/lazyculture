/** Catalogue des boss Brainrun (salle 7 de chaque acte), défini en code comme
 * `shared/brainrunEnemies.ts` : identité (nom, thèmes) et malus de combat, partagés
 * client/serveur sans dupliquer ces données en base. 3 boss par acte, tirés au hasard
 * à la génération de l'acte (cf. BrainrunService.seedActGraph / assignCombatIdentities). */

export type BrainrunBossMalusId =
  | "hidden_answer" // Gilbert : une réponse masquée ("???"), toujours cliquable
  | "swap_answers" // Le Joker : 2 réponses échangent leur position périodiquement
  | "damage_resist" // The Rock : encaisse 2x moins de dégâts
  | "mirror_answers" // La Sorcière : réponses affichées en miroir
  | "scrambling_letters" // François : lettres qui changent puis reviennent
  | "speed_reduction" // Flash : le temps de réponse rétrécit à chaque question (jusqu'à -50%)
  | "phoenix_revive" // Le Phoenix : revient à 50% puis 25% PV après une mise à 0
  | "progressive_blur" // Gérard : flou qui se dissipe jusqu'à net à 3s restantes
  | "memory_recall"; // Alain : les réponses affichées sont toujours celles de la question précédente

export type BrainrunBossDef = {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  malus: BrainrunBossMalusId;
  /** Slugs de `QuestionTheme` : 5-6 par boss, `culture_generale` inclus systématiquement. */
  themes: string[];
};

export const BRAINRUN_BOSSES: BrainrunBossDef[] = [
  {
    id: "act1_gilbert",
    name: "Gilbert",
    act: 1,
    malus: "hidden_answer",
    themes: ["culture_generale", "geo", "histoire", "orthographe", "inventions"],
  },
  {
    id: "act1_le_joker",
    name: "Le Joker",
    act: 1,
    malus: "swap_answers",
    themes: ["culture_generale", "cinema", "series_cultes", "anime-manga", "sport"],
  },
  {
    id: "act1_the_rock",
    name: "The Rock",
    act: 1,
    malus: "damage_resist",
    themes: ["culture_generale", "sport", "football", "voiture", "cinema"],
  },
  {
    id: "act2_la_sorciere",
    name: "La Sorcière",
    act: 2,
    malus: "mirror_answers",
    themes: [
      "culture_generale",
      "mythologie",
      "series_cultes",
      "anime-manga",
      "harry_potter",
      "inventions",
    ],
  },
  {
    id: "act2_francois",
    name: "François",
    act: 2,
    malus: "scrambling_letters",
    themes: ["culture_generale", "logique", "anime-manga", "geo", "sport"],
  },
  {
    id: "act2_flash",
    name: "Flash",
    act: 2,
    malus: "speed_reduction",
    themes: ["culture_generale", "video-games", "espace", "logique", "drapeaux-du-monde"],
  },
  {
    id: "act3_le_phoenix",
    name: "Le Phoenix",
    act: 3,
    malus: "phoenix_revive",
    themes: ["culture_generale", "geo", "sport", "babylon_5", "series_cultes", "mythologie"],
  },
  {
    id: "act3_gerard",
    name: "Gérard",
    act: 3,
    malus: "progressive_blur",
    themes: [
      "culture_generale",
      "inventions",
      "football",
      "cinema",
      "anime-manga",
      "animaux_du_monde",
    ],
  },
  {
    id: "act3_alain",
    name: "Alain",
    act: 3,
    malus: "memory_recall",
    themes: ["culture_generale", "mythologie", "geo", "histoire", "cinema"],
  },
];

export function getBrainrunBossesByAct(act: number): BrainrunBossDef[] {
  return BRAINRUN_BOSSES.filter((b) => b.act === act);
}

export function getBrainrunBossById(id: string | null | undefined): BrainrunBossDef | undefined {
  if (!id) return undefined;
  return BRAINRUN_BOSSES.find((b) => b.id === id);
}
