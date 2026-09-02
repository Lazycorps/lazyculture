/**
 * Bornes du contenu d'une question communautaire.
 * Source unique de vérité : la prévisualisation CSV s'en sert pour prévenir l'utilisateur tôt,
 * et QuestionSubmissionService.buildQuestionData les impose avant tout stockage en base
 * (le contenu finit dans une colonne Json, sans schéma pour le contraindre).
 */

export const PROPOSITION_COUNT = 4;

export const LIBELLE_MIN_LENGTH = 5;
export const LIBELLE_MAX_LENGTH = 300;
export const PROPOSITION_MAX_LENGTH = 300;
export const COMMENTAIRE_MAX_LENGTH = 1000;
export const SOURCE_MAX_LENGTH = 500;
export const IMG_MAX_LENGTH = 500;
