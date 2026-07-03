import type { BrainrunRoomType } from "../brainrun";

export type BrainrunResponseDTO = {
  runId: string;
  questionId: number;
  userResponseId: number;
};

export type BrainrunChoiceDTO = {
  runId: string;
  choice: BrainrunRoomType;
};
