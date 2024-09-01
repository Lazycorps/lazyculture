export class QuestionDTO {
  id: number = 0;
  difficulty: number = 0;
  source: string = "";
  theme: string = "Culture générale";
  createDate: Date = new Date();
  updateDate: Date = new Date();
  userCreate: string = "";
  userUpdate: string = "";
  data: QuestionDataDTO = new QuestionDataDTO();
}

export class QuestionDataDTO {
  type: string = "";
  theme: string = "";
  libelle: string = "";
  response: number = 0;
  propositions: QuestionPropositionDTO[] = [];
  commentaire: string = "";
}

export class QuestionPropositionDTO {
  id: number = 0;
  value: string = "";
}
