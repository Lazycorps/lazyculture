import type { BrainrunConsumableId } from "../brainrunItems";
import type { BrainrunTalentId } from "../brainrunTalents";

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
