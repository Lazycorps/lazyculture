export interface OpenQuizzDB {
  fournisseur: string;
  licence: string;
  rédacteur: string;
  difficulté: string;
  version: number;
  "mise-à-jour": string;
  "catégorie-nom-slogan": OpenQuizzDBCatgorieNomSlogan;
  quizz: OpenQuizzDBQuizz;
}

export interface OpenQuizzDBCatgorieNomSlogan {
  fr: OpenQuizzDBLanguage;
  en: OpenQuizzDBLanguage;
  es: OpenQuizzDBLanguage;
  it: OpenQuizzDBLanguage;
  de: OpenQuizzDBLanguage;
  nl: OpenQuizzDBLanguage;
}

export interface OpenQuizzDBLanguage {
  catégorie: string;
  nom: string;
  slogan: string;
}

export interface OpenQuizzDBQuizz {
  fr: OpenQuizzDBQuestionDifficulty;
  en: OpenQuizzDBQuestionDifficulty;
  de: OpenQuizzDBQuestionDifficulty;
  es: OpenQuizzDBQuestionDifficulty;
  it: OpenQuizzDBQuestionDifficulty;
  nl: OpenQuizzDBQuestionDifficulty;
}

export interface OpenQuizzDBQuestionDifficulty {
  débutant: OpenQuizzDBQuestion[];
  confirmé: OpenQuizzDBQuestion[];
  expert: OpenQuizzDBQuestion[];
}

export interface OpenQuizzDBQuestion {
  id: number;
  question: string;
  propositions: string[];
  réponse: string;
  anecdote: string;
}
