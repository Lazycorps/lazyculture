export class QuestionDTO {
  id: number = 0;
  difficulty: number = 0;
  data: QuestionDataDTO = new QuestionDataDTO();
}

export class QuestionDataDTO {
  type: string = "";
  libelle: string = "";
  response: number = 0;
  propositions: QuestionPropositionDTO[] = [];
  commentaire: string = "";
}

export class QuestionPropositionDTO {
  id: number = 0;
  value: string = "";
}
