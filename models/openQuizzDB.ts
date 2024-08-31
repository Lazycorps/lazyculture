export interface OpenQuizzDB {
  fournisseur: string
  licence: string
  rédacteur: string
  difficulté: string
  version: number
  "mise-à-jour": string
  "catégorie-nom-slogan": CatgorieNomSlogan
  quizz: Quizz
}

export interface CatgorieNomSlogan {
  fr: Fr
  en: En
  es: Es
  it: It
  de: De
  nl: Nl
}

export interface Fr {
  catégorie: string
  nom: string
  slogan: string
}

export interface En {
  catégorie: string
  nom: string
  slogan: string
}

export interface Es {
  catégorie: string
  nom: string
  slogan: string
}

export interface It {
  catégorie: string
  nom: string
  slogan: string
}

export interface De {
  catégorie: string
  nom: string
  slogan: string
}

export interface Nl {
  catégorie: string
  nom: string
  slogan: string
}

export interface Quizz {
  fr: Fr2
  en: En2
  de: De2
  es: Es2
  it: It2
  nl: Nl2
}

export interface Fr2 {
  débutant: Dbutant[]
  confirmé: Confirm[]
  expert: Expert[]
}

export interface Dbutant {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface En2 {
  débutant: Dbutant2[]
  confirmé: Confirm2[]
  expert: Expert2[]
}

export interface Dbutant2 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm2 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert2 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface De2 {
  débutant: Dbutant3[]
  confirmé: Confirm3[]
  expert: Expert3[]
}

export interface Dbutant3 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm3 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert3 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Es2 {
  débutant: Dbutant4[]
  confirmé: Confirm4[]
  expert: Expert4[]
}

export interface Dbutant4 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm4 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert4 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface It2 {
  débutant: Dbutant5[]
  confirmé: Confirm5[]
  expert: Expert5[]
}

export interface Dbutant5 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm5 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert5 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Nl2 {
  débutant: Dbutant6[]
  confirmé: Confirm6[]
  expert: Expert6[]
}

export interface Dbutant6 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Confirm6 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}

export interface Expert6 {
  id: number
  question: string
  propositions: string[]
  réponse: string
  anecdote: string
}
