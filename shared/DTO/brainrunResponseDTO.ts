import type { BrainrunConsumableId } from "../brainrunItems";
import type { BrainrunTalentId } from "../brainrunTalents";
import type { BrainrunRoomType } from "../brainrun";

export type BrainrunResponseDTO = {
  runId: string;
  questionId: number;
  userResponseId: number;
};

/** col = colonne du nœud choisi sur la rangée courante (run.currentRow), parmi candidateCols. */
export type BrainrunChoiceDTO = {
  runId: string;
  col: number;
};

/** pick = id de relique/consommable proposé, ou "SKIP" pour ne rien prendre. */
export type BrainrunBonusChoiceDTO = {
  runId: string;
  pick: string;
};

/** Choix d'une carte de thème post-combat : `pick` = themeSlug de l'une des cartes proposées, ou
 * "SKIP" pour passer (applique la relique Lot de Consolation si possédée). */
export type BrainrunThemeCardChoiceDTO = {
  runId: string;
  pick: string;
};

export type BrainrunShopBuyDTO = {
  runId: string;
  offerIndex: number;
};

export type BrainrunEventChoiceDTO = {
  runId: string;
  optionIndex: number;
};

/** choice = "HEAL" (+1 PV) ou "BAN_THEME" (theme requis, doit figurer dans availableThemesToBan). */
export type BrainrunRestChoiceDTO = {
  runId: string;
  choice: "HEAL" | "BAN_THEME";
  theme?: string;
};

export type BrainrunConsumableUseDTO = {
  runId: string;
  type: BrainrunConsumableId;
};

export type BrainrunTalentUnlockDTO = {
  talentId: BrainrunTalentId;
};

/** Debug uniquement (assertDebugAccess côté serveur : dev libre, admin requis en prod) : force
 * PV/or de la run en cours, sans passer par une salle. Les champs omis conservent leur valeur
 * actuelle. `themeCoefficients` : entrées à fusionner dans les coefficients de la run (un coef ≤ 0
 * retire le thème), pour tester le tirage pondéré et les cartes sans jouer une run entière. */
export type BrainrunDebugSetStatsDTO = {
  runId: string;
  healthPoint?: number;
  maxHealthPoint?: number;
  gold?: number;
  themeCoefficients?: Record<string, number>;
};

/** Debug uniquement : téléporte la run vers un nœud précis (must be PENDING), en forçant
 * optionnellement son type et/ou l'ennemi/boss tiré pour le combat. */
export type BrainrunDebugJumpDTO = {
  runId: string;
  act: number;
  row: number;
  col: number;
  roomType?: BrainrunRoomType;
  forcedCombatId?: string;
};
