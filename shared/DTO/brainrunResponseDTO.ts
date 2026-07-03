import type { BrainrunRoomType } from "../brainrun";
import type { BrainrunConsumableId } from "../brainrunItems";

export type BrainrunResponseDTO = {
  runId: string;
  questionId: number;
  userResponseId: number;
};

export type BrainrunChoiceDTO = {
  runId: string;
  choice: BrainrunRoomType;
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

export type BrainrunConsumableUseDTO = {
  runId: string;
  type: BrainrunConsumableId;
};
