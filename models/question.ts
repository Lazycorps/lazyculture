export class QuestionDTO {
  id: number = 0;
  difficulty: number = 0;
  source: string = "";
  createDate: Date = new Date();
  updateDate: Date = new Date();
  userCreate: string = "";
  userUpdate: string = "";
  themes: string[] = []
  data: QuestionDataDTO = new QuestionDataDTO();
}

export class QuestionDataDTO {
  type: string = "";
  difficulty: number = 0;
  theme: string[] = ["culture_generale"];
  libelle: string = "";
  img: string = "";
  response: number = 0;
  propositions: QuestionPropositionDTO[] = [];
  commentaire: string = "";
  commentaireImg: string = "";
}

export class QuestionPropositionDTO {
  id: number = 0;
  value: string = "";
  img: string = "";
}
