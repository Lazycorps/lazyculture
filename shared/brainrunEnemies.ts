/** Catalogue des ennemis Brainrun (Classiques + Élites), défini en code comme
 * `shared/brainrunItems.ts` : identité (nom) et thèmes de questions par acte, partagés
 * client/serveur sans dupliquer ces données en base. */

export type BrainrunEnemyTier = "CLASSIC" | "ELITE";

export type BrainrunEnemyDef = {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  tier: BrainrunEnemyTier;
  /** Slugs de `QuestionTheme` : 2-3 pour un Classique, 4-5 pour un Élite. */
  themes: string[];
};

export const BRAINRUN_ENEMIES: BrainrunEnemyDef[] = [
  // --- Acte 1 — Classiques ---
  {
    id: "act1_cancre_curieux",
    name: "Le Cancre Curieux",
    act: 1,
    tier: "CLASSIC",
    themes: ["culture_generale", "orthographe"],
  },
  {
    id: "act1_fan_de_cine",
    name: "Le Fan de Ciné",
    act: 1,
    tier: "CLASSIC",
    themes: ["cinema", "series_cultes", "culture_generale"],
  },
  {
    id: "act1_supporter_ultra",
    name: "Le Supporter Ultra",
    act: 1,
    tier: "CLASSIC",
    themes: ["football", "sport", "culture_generale"],
  },
  {
    id: "act1_gamer_du_dimanche",
    name: "Le Gamer du Dimanche",
    act: 1,
    tier: "CLASSIC",
    // celeste ajouté en 4e thème (au-delà des 2-3 habituels) plutôt qu'en remplacement : il n'a
    // que 10 questions, toutes difficulté 1-3 (aucune 4-5), donc calibré uniquement pour l'Acte 1 ;
    // le diluer parmi 4 thèmes limite sa fréquence de tirage vu son faible volume.
    themes: ["video-games", "nintendo", "culture_generale", "celeste"],
  },
  {
    id: "act1_explorateur_cour_ecole",
    name: "L'Explorateur de Cour d'École",
    act: 1,
    tier: "CLASSIC",
    themes: ["geo", "animaux_du_monde", "culture_generale"],
  },
  {
    id: "act1_rat_de_bibliotheque",
    name: "Le Rat de Bibliothèque",
    act: 1,
    tier: "CLASSIC",
    themes: ["mythologie", "histoire", "culture_generale"],
  },
  {
    id: "act1_cosplayeur_debutant",
    name: "Le Cosplayeur Débutant",
    act: 1,
    tier: "CLASSIC",
    themes: ["anime-manga", "harry_potter", "culture_generale"],
  },
  {
    id: "act1_belge_bavard",
    name: "Le Belge Bavard",
    act: 1,
    tier: "CLASSIC",
    themes: ["belgique", "culture_generale"],
  },
  {
    id: "act1_bricoleur_du_dimanche",
    name: "Le Bricoleur du Dimanche",
    act: 1,
    tier: "CLASSIC",
    themes: ["inventions", "voiture", "culture_generale"],
  },
  {
    id: "act1_astronome_amateur",
    name: "L'Astronome Amateur",
    act: 1,
    tier: "CLASSIC",
    themes: ["espace", "dinosaures", "culture_generale"],
  },

  // --- Acte 1 — Élites ---
  {
    id: "act1_maitre_du_multiplexe",
    name: "Le Maître du Multiplexe",
    act: 1,
    tier: "ELITE",
    themes: ["cinema", "series_cultes", "disney", "anime-manga", "culture_generale"],
  },
  {
    id: "act1_capitaine_des_tribunes",
    name: "Le Capitaine des Tribunes",
    act: 1,
    tier: "ELITE",
    themes: ["football", "sport", "voiture", "video-games", "culture_generale"],
  },
  {
    id: "act1_gardien_des_legendes",
    name: "Le Gardien des Légendes",
    act: 1,
    tier: "ELITE",
    themes: ["lord_of_the_ring", "star_wars", "harry_potter", "mythologie", "culture_generale"],
  },
  {
    id: "act1_encyclopediste_fou",
    name: "L'Encyclopédiste Fou",
    act: 1,
    tier: "ELITE",
    themes: ["culture_generale", "histoire", "geo", "orthographe", "logique"],
  },
  {
    id: "act1_chasseur_de_tresors_perdus",
    name: "Le Chasseur de Trésors Perdus",
    act: 1,
    tier: "ELITE",
    // monuments_du_monde retiré (le plus dispensable des 5) pour laisser la place à
    // culture_generale, ajouté sur tous les ennemis de l'Acte 1 pour diluer la redondance.
    themes: ["jurassic_park", "dinosaures", "espace", "animaux_du_monde", "culture_generale"],
  },

  // --- Acte 2 — Classiques ---
  {
    id: "act2_journaliste_sportif",
    name: "Le Journaliste Sportif",
    act: 2,
    tier: "CLASSIC",
    themes: ["football", "sport", "twitch"],
  },
  {
    id: "act2_otaku_confirme",
    name: "L'Otaku Confirmé",
    act: 2,
    tier: "CLASSIC",
    themes: ["anime-manga", "harry_potter", "nintendo"],
  },
  {
    id: "act2_cine_club",
    name: "Le Ciné-Club",
    act: 2,
    tier: "CLASSIC",
    themes: ["cinema", "series_cultes", "babylon_5"],
  },
  {
    id: "act2_genealogiste",
    name: "Le Généalogiste",
    act: 2,
    tier: "CLASSIC",
    themes: ["histoire", "mythologie", "geo"],
  },
  {
    id: "act2_testeur_de_jeux",
    name: "Le Testeur de Jeux",
    act: 2,
    tier: "CLASSIC",
    themes: ["video-games", "nintendo", "world_of_warcraft"],
  },
  {
    id: "act2_reporter_animalier",
    name: "Le Reporter Animalier",
    act: 2,
    tier: "CLASSIC",
    themes: ["animaux_du_monde", "dinosaures", "espace"],
  },
  {
    id: "act2_puriste_belge",
    name: "Le Puriste Belge",
    act: 2,
    tier: "CLASSIC",
    themes: ["belgique", "gaston_lagaffe", "asterix"],
  },
  {
    id: "act2_constructeur",
    name: "Le Constructeur",
    act: 2,
    tier: "CLASSIC",
    themes: ["voiture", "inventions", "logique"],
  },
  {
    id: "act2_cartographe",
    name: "Le Cartographe",
    act: 2,
    tier: "CLASSIC",
    themes: ["geo", "drapeaux-du-monde", "monuments_du_monde"],
  },
  {
    id: "act2_linguiste",
    name: "Le Linguiste",
    act: 2,
    tier: "CLASSIC",
    themes: ["orthographe", "culture_generale", "logique"],
  },

  // --- Acte 2 — Élites ---
  {
    id: "act2_souverain_du_fandom",
    name: "Le Souverain du Fandom",
    act: 2,
    tier: "ELITE",
    themes: ["anime-manga", "harry_potter", "star_wars", "lord_of_the_ring"],
  },
  {
    id: "act2_stratege_du_stade",
    name: "Le Stratège du Stade",
    act: 2,
    tier: "ELITE",
    themes: ["football", "sport", "twitch", "voiture", "world_of_warcraft"],
  },
  {
    id: "act2_archiviste_supreme",
    name: "L'Archiviste Suprême",
    act: 2,
    tier: "ELITE",
    themes: ["histoire", "mythologie", "geo", "monuments_du_monde", "orthographe"],
  },
  {
    id: "act2_naturaliste_legendaire",
    name: "Le Naturaliste Légendaire",
    act: 2,
    tier: "ELITE",
    themes: ["animaux_du_monde", "dinosaures", "espace", "jurassic_park"],
  },
  {
    id: "act2_roi_des_belges",
    name: "Le Roi des Belges",
    act: 2,
    tier: "ELITE",
    themes: ["belgique", "gaston_lagaffe", "asterix", "tintin", "culture_generale"],
  },

  // --- Acte 3 — Classiques ---
  {
    id: "act3_veteran_du_cine_club",
    name: "Le Vétéran du Ciné-Club",
    act: 3,
    tier: "CLASSIC",
    themes: ["cinema", "series_cultes", "babylon_5"],
  },
  {
    id: "act3_grand_maitre_otaku",
    name: "Le Grand Maître Otaku",
    act: 3,
    tier: "CLASSIC",
    themes: ["anime-manga", "harry_potter", "world_of_warcraft"],
  },
  {
    id: "act3_ultra_du_ballon_rond",
    name: "L'Ultra du Ballon Rond",
    act: 3,
    tier: "CLASSIC",
    themes: ["football", "sport", "twitch"],
  },
  {
    id: "act3_ermite_des_etoiles",
    name: "L'Ermite des Étoiles",
    act: 3,
    tier: "CLASSIC",
    themes: ["espace", "dinosaures", "jurassic_park"],
  },
  {
    id: "act3_sage_belgo_francais",
    name: "Le Sage Belgo-Français",
    act: 3,
    tier: "CLASSIC",
    themes: ["belgique", "tintin", "asterix"],
  },
  {
    id: "act3_mecanicien_visionnaire",
    name: "Le Mécanicien Visionnaire",
    act: 3,
    tier: "CLASSIC",
    themes: ["voiture", "inventions", "logique"],
  },
  {
    id: "act3_cartographe_ultime",
    name: "Le Cartographe Ultime",
    act: 3,
    tier: "CLASSIC",
    themes: ["geo", "drapeaux-du-monde", "monuments_du_monde"],
  },
  {
    id: "act3_historien_maudit",
    name: "L'Historien Maudit",
    act: 3,
    tier: "CLASSIC",
    themes: ["histoire", "mythologie", "orthographe"],
  },
  {
    id: "act3_zoologiste_fantome",
    name: "Le Zoologiste Fantôme",
    act: 3,
    tier: "CLASSIC",
    themes: ["animaux_du_monde", "dinosaures", "mythologie"],
  },
  {
    id: "act3_gardien_du_multivers",
    name: "Le Gardien du Multivers",
    act: 3,
    tier: "CLASSIC",
    // lord_of_the_ring n'a aucune question à difficulté 3-4 (cf. memory
    // project_question_bank_theme_difficulty_stats) : remplacé par mythologie.
    themes: ["star_wars", "mythologie", "nintendo"],
  },

  // --- Acte 3 — Élites ---
  {
    id: "act3_oracle_cinephile",
    name: "L'Oracle Cinéphile",
    act: 3,
    tier: "ELITE",
    themes: ["cinema", "series_cultes", "disney", "anime-manga", "babylon_5"],
  },
  {
    id: "act3_titan_des_stades",
    name: "Le Titan des Stades",
    act: 3,
    tier: "ELITE",
    themes: ["football", "sport", "twitch", "voiture", "world_of_warcraft"],
  },
  {
    id: "act3_archonte_du_savoir",
    name: "L'Archonte du Savoir",
    act: 3,
    tier: "ELITE",
    themes: ["culture_generale", "histoire", "geo", "mythologie", "orthographe"],
  },
  {
    id: "act3_leviathan_des_eres_perdues",
    name: "Le Léviathan des Ères Perdues",
    act: 3,
    tier: "ELITE",
    themes: ["dinosaures", "jurassic_park", "espace", "animaux_du_monde", "monuments_du_monde"],
  },
  {
    id: "act3_souverain_des_legendes",
    name: "Le Souverain des Légendes",
    act: 3,
    tier: "ELITE",
    // star_wars/lord_of_the_ring/nintendo/tintin n'ont quasiment aucune question à difficulté 4
    // (cf. memory project_question_bank_theme_difficulty_stats) : seul harry_potter est conservé,
    // complété par des thèmes avec un vrai volume à ce palier.
    themes: ["harry_potter", "mythologie", "anime-manga", "cinema", "series_cultes"],
  },
];

export function getBrainrunEnemiesByActAndTier(
  act: number,
  tier: BrainrunEnemyTier,
): BrainrunEnemyDef[] {
  return BRAINRUN_ENEMIES.filter((e) => e.act === act && e.tier === tier);
}

export function getBrainrunEnemyById(id: string | null | undefined): BrainrunEnemyDef | undefined {
  if (!id) return undefined;
  return BRAINRUN_ENEMIES.find((e) => e.id === id);
}
