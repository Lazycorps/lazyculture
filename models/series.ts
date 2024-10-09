export class QuestionSeriesDTO {
  id: number = 0;
  type: string = "";
  title: string = "";
  difficulty: number = 0;
  date: Date = new Date();
  createDate: Date = new Date();
  updateDate: Date = new Date();
  userCreate: string = "";
  userUpdate: string = "";
}

export class QuestionSeriesData {
  id: number = 1;
  questionsIds: number[] = [];
}

export class QuestionSeriesResponseData {
  reponses: QuestionSeriesResponseDataResponse[] = [];
}

export class QuestionSeriesResponseDataResponse {
  questionId: number = 0;
  responseId: number = 0;
  success: boolean = false;
  elapsedTime: number = 0;
}
