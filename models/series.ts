export type UserSeriesDTO = {
  series: QuestionSeriesDTO;
  userResponse: QuestionSeriesResponseDTO;
};

export type QuestionSeriesDTO = {
  id: number;
  type: string;
  title: string;
  difficulty: number;
  date: Date;
  data: QuestionSeriesData;
  createDate: Date;
  updateDate: Date;
  userCreate: string;
  userUpdate: string;
};

export type QuestionSeriesData = {
  id: number;
  questionsIds: number[];
};

export type QuestionSeriesResponseDTO = {
  id: number;
  seriesId: number;
  userId: string;
  data: QuestionSeriesResponseData;
  createDate: Date;
  updateDate: Date;
};

export type QuestionSeriesResponseData = {
  seriesType: string;
  responses: QuestionSeriesResponseDataResponse[];
  xpEarned: number;
  score: number;
  nextQuestion: number;
};

export type QuestionSeriesResponseDataResponse = {
  questionId: number;
  responseId: number;
  success: boolean;
  elapsedTime: number;
};
