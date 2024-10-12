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
}

export type QuestionSeriesData = {
  id: number;
  questionsIds: number[];
}

export type QuestionSeriesResponseData = {
  reponses: QuestionSeriesResponseDataResponse[];
}

export type QuestionSeriesResponseDataResponse = {
  questionId: number;
  responseId: number;
  success: boolean;
  elapsedTime: number;
}
