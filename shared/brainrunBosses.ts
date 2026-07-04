/** Catalogue des boss Brainrun (salle 7 de chaque acte), défini en code comme
 * `shared/brainrunEnemies.ts` : identité (nom, thèmes) et malus de combat, partagés
 * client/serveur sans dupliquer ces données en base. 2 boss par acte, tirés au hasard
 * à l'entrée de la salle (cf. BrainrunService.chooseOption). */

export type BrainrunBossMalusId =
  | "hidden_answer" // Gilbert : une réponse masquée ("???"), toujours cliquable
  | "swap_answers" // Le Joker : 2 réponses échangent leur position périodiquement
  | "mirror_answers" // La Sorcière : réponses affichées en miroir
  | "scrambling_letters" // François : lettres qui changent puis reviennent
  | "phoenix_revive" // Le Phoenix : revient à 50% puis 25% PV après une mise à 0
  | "progressive_blur"; // Gérard : flou qui se dissipe jusqu'à net à 3s restantes

export type BrainrunBossDef = {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  malus: BrainrunBossMalusId;
  /** Slugs de `QuestionTheme` : 4 par boss, `culture_generale` inclus systématiquement. */
  themes: string[];
};

export const BRAINRUN_BOSSES: BrainrunBossDef[] = [
  {
    id: "act1_gilbert",
    name: "Gilbert",
    act: 1,
    malus: "hidden_answer",
    themes: ["culture_generale", "geo", "histoire", "orthographe"],
  },
  {
    id: "act1_le_joker",
    name: "Le Joker",
    act: 1,
    malus: "swap_answers",
    themes: ["culture_generale", "cinema", "series_cultes", "anime-manga"],
  },
  {
    id: "act2_la_sorciere",
    name: "La Sorcière",
    act: 2,
    malus: "mirror_answers",
    themes: ["culture_generale", "mythologie", "series_cultes", "anime-manga"],
  },
  {
    id: "act2_francois",
    name: "François",
    act: 2,
    malus: "scrambling_letters",
    themes: ["culture_generale", "logique", "anime-manga", "geo"],
  },
  {
    id: "act3_le_phoenix",
    name: "Le Phoenix",
    act: 3,
    malus: "phoenix_revive",
    themes: ["culture_generale", "geo", "sport", "babylon_5"],
  },
  {
    id: "act3_gerard",
    name: "Gérard",
    act: 3,
    malus: "progressive_blur",
    themes: ["culture_generale", "inventions", "football", "cinema"],
  },
];

export function getBrainrunBossesByAct(act: number): BrainrunBossDef[] {
  return BRAINRUN_BOSSES.filter((b) => b.act === act);
}

export function getBrainrunBossById(id: string | null | undefined): BrainrunBossDef | undefined {
  if (!id) return undefined;
  return BRAINRUN_BOSSES.find((b) => b.id === id);
}
