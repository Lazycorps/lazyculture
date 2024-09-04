export class QuestionDTO {
  id: number = 0;
  difficulty: number = 0;
  source: string = "";
  createDate: Date = new Date();
  updateDate: Date = new Date();
  userCreate: string = "";
  userUpdate: string = "";
  data: QuestionDataDTO = new QuestionDataDTO();
}

export class QuestionDataDTO {
  type: string = "";
  theme: string[] = ["culture_generale"];
  libelle: string = "";
  response: number = 0;
  propositions: QuestionPropositionDTO[] = [];
  commentaire: string = "";
}

export class QuestionPropositionDTO {
  id: number = 0;
  value: string = "";
}
