import type { QuestionDTO } from "./question";

/** Constantes de structure de run partagées entre client et serveur (affichage de la progression). */
export const BRAINRUN_TOTAL_ACTS = 3;
export const BRAINRUN_CHOICE_POINTS_PER_ACT = 6;
export const BRAINRUN_ROOMS_PER_ACT = BRAINRUN_CHOICE_POINTS_PER_ACT + 1;

export type BrainrunRoomType = "STANDARD" | "ELITE" | "BOSS" | "REST" | "SHOP" | "EVENT";
export type BrainrunRoomStatus = "PENDING" | "ACTIVE" | "CLEARED" | "FAILED" | "SKIPPED";
export type BrainrunRunStatus = "IN_PROGRESS" | "WON" | "LOST" | "ABANDONED";

export type BrainrunRoomResponse = {
  questionId: number;
  responseId: number;
  success: boolean;
  /** PV perdus pour cette réponse (0 si correcte). */
  hpLoss: number;
};

export type BrainrunRoomDTO = {
  id: number;
  runId: string;
  act: number;
  sequence: number;
  type: BrainrunRoomType | null;
  status: BrainrunRoomStatus;
  choiceTypes: BrainrunRoomType[];
  questionIds: number[];
  responses: BrainrunRoomResponse[];
  goldEarned: number;
};

export type BrainrunRunDTO = {
  id: string;
  userId: string;
  status: BrainrunRunStatus;
  currentAct: number;
  currentSequence: number;
  healthPoint: number;
  maxHealthPoint: number;
  gold: number;
  xpEarned: number | null;
  createDate: Date;
  endDate: Date | null;
};

/** Réponse de GET /api/brainrun/current : reflète intégralement l'état courant, dérivé côté serveur. */
export type BrainrunStateDTO = {
  run: BrainrunRunDTO;
  currentRoom: BrainrunRoomDTO | null;
  /** Question à afficher si la salle active est en cours de résolution (type déjà choisi). */
  currentQuestion: QuestionDTO | null;
  /** true si la salle active attend un choix du joueur parmi currentRoom.choiceTypes. */
  awaitingChoice: boolean;
};
