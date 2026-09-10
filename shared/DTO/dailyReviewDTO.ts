export interface DailyReviewPropositionDTO {
  id: number;
  value: string;
  img?: string;
}

export interface DailyQuestionReviewDTO {
  questionId: number;
  order: number;
  libelle: string;
  img?: string;
  themes: string[];
  authorName?: string;
  authorSlug?: string;
  propositions: DailyReviewPropositionDTO[];
  userResponseId: number;
  correctResponseId: number;
  isCorrect: boolean;
  commentaire: string;
  commentaireImg?: string;
}

export interface DailySeriesReviewDTO {
  seriesId: number;
  title: string;
  date: string;
  score: number;
  totalQuestions: number;
  questions: DailyQuestionReviewDTO[];
}
