import type { BrainrunRoomType, BrainrunThemeCardRarity } from "#shared/brainrun";
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

/** Plage de difficulté (inclusive, échelle Question.difficulty 1-5) par TYPE de combat, à plat sur
 * les 3 actes : la difficulté suit désormais le palier de rencontre (standard < élite < boss) et
 * non plus la profondeur dans la run. Bandes larges → viviers de questions plus grands, ce qui
 * soulage l'anti-répétition inter-runs (cf. BRAINRUN_THEME_COEFFICIENTS_PLAN.md). Seule exception :
 * culture_generale garde une modulation par acte (constante ci-dessous). */
export const BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE: Record<
  "STANDARD" | "ELITE" | "BOSS",
  [number, number]
> = {
  STANDARD: [1, 3],
  ELITE: [1, 4],
  BOSS: [2, 5],
};

/** Plage de difficulté propre au thème culture_generale, par acte — seul thème dont la difficulté
 * suit encore l'acte (il porte la sensation de progression de la run) : facile en Acte 1, corsé en
 * Acte 3. Appliquée via QuestionService.getRandomIdsByDifficulty (themeDifficultyOverrides). */
export const BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT: Record<number, [number, number]> = {
  1: [1, 2],
  2: [2, 3],
  3: [3, 5],
};

/** Bonus de coefficient qu'un ennemi applique à CHACUN de ses thèmes, uniquement pour la durée de
 * son combat, pour biaiser le tirage des questions vers ses thèmes. Valeur de base indexée par acte
 * (1-3), multipliée par le tier de la rencontre (cf. ci-dessous). Ex. boss Acte 3 (×3) sur un
 * thème → +9 de coefficient effectif sur ce thème pour ce combat. */
export const BRAINRUN_ENEMY_THEME_BONUS_BY_ACT: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
};

/** Multiplicateur du bonus de thème selon le tier de la rencontre (cf. BrainrunEnemyDef.tier +
 * combat de boss). Classique ×1, Élite ×2, Boss ×3. */
export const BRAINRUN_ENEMY_THEME_BONUS_TIER_MULTIPLIER: Record<
  "CLASSIC" | "ELITE" | "BOSS",
  number
> = {
  CLASSIC: 1,
  ELITE: 2,
  BOSS: 3,
};

/** Nombre de cartes de thème proposées après un combat gagné. */
export const BRAINRUN_THEME_CARD_COUNT = 3;

/** Bonus de coefficient accordé au thème d'une carte selon sa rareté (cf. BrainrunThemeCardRarity,
 * shared/brainrun.ts). */
export const BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY: Record<BrainrunThemeCardRarity, number> = {
  STANDARD: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 5,
};

/** Plafond du coefficient d'un thème pour une run : une carte ne peut pas le pousser au-delà (le
 * bonus de rareté est tronqué), et un thème déjà à ce plafond n'est plus injecté comme « thème
 * investi » (cf. BRAINRUN_THEME_CARD_INVESTED_CHANCE) — proposer une carte à +0 n'aurait aucun sens. */
export const BRAINRUN_THEME_COEFFICIENT_MAX = 10;

/** Poids de tirage de la rareté d'une carte de thème (total 100 → lecture directe en %). */
export const BRAINRUN_THEME_CARD_RARITY_WEIGHT: Record<BrainrunThemeCardRarity, number> = {
  STANDARD: 65,
  RARE: 22,
  EPIC: 10,
  LEGENDARY: 3,
};

/** Probabilité, POUR CHAQUE carte proposée, que son thème soit tiré parmi ceux déjà investis par
 * le joueur (coefficient > 0) plutôt que dans le pool des thèmes d'ennemi — permet de renforcer une
 * spécialisation en cours. Sans effet si le joueur n'a encore rien investi (repli sur le pool). */
export const BRAINRUN_THEME_CARD_INVESTED_CHANCE = 0.1;

/** Volume minimal de questions (toutes difficultés confondues) qu'un thème doit atteindre pour être
 * proposable en carte / tirable dans un combat — écarte les thèmes trop maigres (celeste, jeux_video,
 * orphelins) qui affameraient le tirage sur une bande de difficulté étroite. Vérifier le volume réel
 * par une requête Prisma avant de figer un seuil définitif (cf. mémoire question_bank_theme stats). */
export const BRAINRUN_THEME_MIN_QUESTION_VOLUME = 25;

/** Quotas minimums que l'algorithme d'assignation des types de nœuds d'un acte doit respecter.
 * Déclarés avant la silhouette de la carte : le tirage des largeurs en dépend, une carte trop
 * étroite rendant ces quotas insatisfiables (cf. BRAINRUN_MID_FLOOR_MIN_FREE_NODES). */
export const BRAINRUN_MIN_PURE_COMBAT_RATIO = 0.5; // au moins 50% des nœuds hors Boss = combat (STANDARD/ELITE)
// Remontés à 2 (au lieu d'1) par rapport à l'ancien système linéaire : avec l'embranchement, un
// trajet donné pourrait sinon totalement rater ces salles si elles n'existent qu'en un exemplaire.
export const BRAINRUN_MIN_SHOP_OFFERS = 2;
export const BRAINRUN_MIN_REST_OFFERS = 2;
export const BRAINRUN_MIN_EVENT_OFFERS = 2;

/** Position (1-indexée) de l'étage forcé 100% Élite parmi les étages "du milieu" d'un acte (entre
 * l'étage 1, forcé Standard, et l'avant-dernière rangée, forcée Bibliothèque) : garantit
 * mécaniquement qu'aucune route ne peut traverser un acte sans croiser au moins une Élite. */
export const BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX = 3;

/** Nombre d'étages "du milieu" d'un acte (entre l'étage 1, forcé Standard, et l'avant-dernière
 * rangée, forcée Bibliothèque). Ce nombre est **fixe** : il détermine le nombre de rangées d'un
 * acte, dont dépendent getBrainrunRoomsPerAct (shared/brainrun.ts) et nextRowAfterClear. Seules
 * leurs LARGEURS sont tirées à chaque génération (cf. pickBrainrunMidFloorWidths). */
const BRAINRUN_MID_FLOOR_COUNT = 6;
/** Largeur des rangées fixes encadrant les étages du milieu (étage 1 et étage Bibliothèque). */
const BRAINRUN_FIXED_FLOOR_WIDTH = 3;

const BRAINRUN_MID_FLOOR_MIN_WIDTH = 2;
const BRAINRUN_MID_FLOOR_MAX_WIDTH = 4;
/** Rangées larges (BRAINRUN_MID_FLOOR_MAX_WIDTH nœuds) autorisées par acte : au moins une, pour que
 * la carte offre un vrai moment d'embranchement ; au plus deux, pour qu'elles restent des
 * respirations et non la norme. */
const BRAINRUN_MID_FLOOR_MIN_WIDE_ROWS = 1;
const BRAINRUN_MID_FLOOR_MAX_WIDE_ROWS = 2;
/** Silhouette lissée : deux rangées consécutives ne diffèrent jamais de plus d'un nœud (les étages
 * fixes à 3 comptent comme voisins du premier et du dernier étage du milieu). Évite les ruptures
 * 2→4, où la couverture force deux moitiés sans aucun nœud partagé. */
const BRAINRUN_MID_FLOOR_MAX_STEP = 1;
/** Silhouette de repli si le tirage n'aboutit pas : l'ancienne forme fixe, en diamant. */
const BRAINRUN_MID_FLOOR_FALLBACK_WIDTHS = [2, 3, 4, 4, 3, 2];

/**
 * Nombre minimal de nœuds "libres" (= étages du milieu hors étage forcé Élite, les seuls soumis aux
 * quotas de assignNodeTypes) qu'une silhouette doit offrir. En dessous, les quotas deviennent
 * insatisfiables et `assignNodeTypes` lève : il faut `libres - spéciales >= ceil(libres / 2)`, soit
 * `libres >= 2 x spéciales`. On garde une marge d'un nœud au-dessus de ce plancher algébrique pour
 * que la carte reste orientée combat plutôt que saturée de salles spéciales.
 */
const BRAINRUN_MID_FLOOR_MIN_FREE_NODES =
  2 * (BRAINRUN_MIN_SHOP_OFFERS + BRAINRUN_MIN_REST_OFFERS + BRAINRUN_MIN_EVENT_OFFERS) + 1;

/**
 * Tire les largeurs des étages du milieu d'un acte. Avant le 2026-07-21 cette silhouette était une
 * constante ([2, 3, 4, 4, 3, 2]) : toutes les cartes avaient donc la même forme, et les étages dont
 * la transition n'admettait qu'une seule solution valide se généraient à l'identique d'une run à
 * l'autre. Le tirage se fait par rejet (les contraintes globales — nombre de rangées larges,
 * raccord avec l'étage Bibliothèque — ne se vérifient qu'une fois la silhouette complète).
 */
export function pickBrainrunMidFloorWidths(random: () => number = Math.random): number[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const widths: number[] = [];
    for (let floor = 0; floor < BRAINRUN_MID_FLOOR_COUNT; floor++) {
      const previous = widths[floor - 1] ?? BRAINRUN_FIXED_FLOOR_WIDTH;
      const choices: number[] = [];
      for (
        let width = BRAINRUN_MID_FLOOR_MIN_WIDTH;
        width <= BRAINRUN_MID_FLOOR_MAX_WIDTH;
        width++
      ) {
        if (Math.abs(width - previous) <= BRAINRUN_MID_FLOOR_MAX_STEP) choices.push(width);
      }
      widths.push(choices[Math.floor(random() * choices.length)]!);
    }
    // Raccord avec l'étage Bibliothèque qui suit, et rareté des rangées larges.
    const last = widths[BRAINRUN_MID_FLOOR_COUNT - 1]!;
    if (Math.abs(last - BRAINRUN_FIXED_FLOOR_WIDTH) > BRAINRUN_MID_FLOOR_MAX_STEP) continue;
    const wideRows = widths.filter((w) => w === BRAINRUN_MID_FLOOR_MAX_WIDTH).length;
    if (wideRows < BRAINRUN_MID_FLOOR_MIN_WIDE_ROWS) continue;
    if (wideRows > BRAINRUN_MID_FLOOR_MAX_WIDE_ROWS) continue;
    // L'étage forcé 100% Élite est hors quotas : les nœuds soumis aux quotas sont ceux des cinq
    // autres étages du milieu (cf. assignNodeTypes).
    const freeNodes =
      widths.reduce((sum, w) => sum + w, 0) - widths[BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX - 1]!;
    if (freeNodes < BRAINRUN_MID_FLOOR_MIN_FREE_NODES) continue;
    return widths;
  }
  return [...BRAINRUN_MID_FLOOR_FALLBACK_WIDTHS];
}

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
export function buildBrainrunActRowWidths(act: number, midFloorWidths: number[]): number[] {
  const floors = [
    BRAINRUN_FIXED_FLOOR_WIDTH,
    ...midFloorWidths,
    BRAINRUN_FIXED_FLOOR_WIDTH,
    1, // Boss
  ];
  return act === 1 ? [1, ...floors] : floors;
}

/** Tire une forme de carte complète pour un acte (silhouette aléatoire + rangées fixes). La forme
 * réelle d'un acte déjà semé se lit sur les `BrainrunRoom` persistés, jamais en rappelant cette
 * fonction — elle ne redonnerait pas la même carte. */
export function pickBrainrunActRowWidths(
  act: number,
  random: () => number = Math.random,
): number[] {
  return buildBrainrunActRowWidths(act, pickBrainrunMidFloorWidths(random));
}

/** Nombre maximum d'Élites qu'une route (rangée 1 → Boss) peut traverser sur un acte ; appliqué
 * a posteriori par enforceEliteRouteBounds (server/utils/brainrunLogic.ts), qui retype en Standard
 * les Élites en excès si une route en dépasse le nombre. */
export const BRAINRUN_MAX_ELITE_PER_ROUTE = 4;

/** Nombre maximum de nœuds mono-cible (une seule sortie) consécutifs sur un trajet : au-delà,
 * `generateActEdges` impose un embranchement. Autrement dit, en montant, le joueur retrouve un vrai
 * choix au moins tous les 3 nœuds. Les mono-routes sont assumées entre-temps — c'est la respiration
 * d'une carte façon Slay the Spire, pas un défaut à minimiser. */
export const BRAINRUN_MAX_CONSECUTIVE_MONO_NODES = 3;

/** Écart maximal, en colonnes, entre une cible et la position "naturelle" (proportionnelle) de son
 * nœud dans la rangée suivante. À 1, une arête relie toujours des nœuds adjacents : **elle ne saute
 * jamais par-dessus un nœud** (pas de trait qui passe au-dessus de la colonne 2 pour aller de 1 à
 * 3). C'est une règle de lisibilité de la carte, pas d'équilibrage — ne pas la relever. */
export const BRAINRUN_MAX_TARGET_DRIFT = 1;

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
/** Malus de boss "The Rock" (damage_resist) : multiplicateur appliqué aux dégâts infligés au
 * boss, en tout dernier (après reliques/talents/consommables) — encaisse 2x moins. */
export const BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER = 0.5;
/** Malus de boss "Flash" (speed_reduction) : réduction du temps de réponse, en fraction du temps
 * initial (BRAINRUN_BOSS_QUESTION_TIME_MS), par question déjà répondue dans ce combat — cumulative,
 * plafonnée à BRAINRUN_FLASH_MAX_TIME_REDUCTION_RATIO. */
export const BRAINRUN_FLASH_TIME_REDUCTION_STEP_RATIO = 0.1;
export const BRAINRUN_FLASH_MAX_TIME_REDUCTION_RATIO = 0.5;
/** Probabilité de récupérer 1 PV en fin de combat gagné (relique Spécialisation). */
export const BRAINRUN_SPECIALIZATION_HEAL_CHANCE = 0.2;
/** Emplacements de consommables de base, et bonus accordé par la relique Sac à Dos. */
export const BRAINRUN_BASE_CONSUMABLE_SLOTS = 3;
export const BRAINRUN_BACKPACK_BONUS_SLOTS = 2;
