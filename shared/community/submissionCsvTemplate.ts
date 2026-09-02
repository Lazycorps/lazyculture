import type { BulkSubmissionRowPayload } from "#shared/DTO/questionSubmissionDTO";
import { serializeCsv } from "#shared/csv/csv";
import {
  COMMENTAIRE_MAX_LENGTH,
  LIBELLE_MAX_LENGTH,
  LIBELLE_MIN_LENGTH,
  PROPOSITION_COUNT,
  PROPOSITION_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
} from "#shared/community/questionContentRules";

/** Nombre maximum de questions par import. */
export const SUBMISSION_CSV_MAX_ROWS = 25;

/**
 * Difficulté imposée à toute question importée par CSV.
 * La difficulté n'est volontairement pas saisissable dans le fichier.
 */
export const SUBMISSION_CSV_DEFAULT_DIFFICULTY = 2;

/** Taille maximale du fichier accepté (25 lignes de texte tiennent très largement dedans). */
export const SUBMISSION_CSV_MAX_FILE_SIZE = 1024 * 1024;

export interface SubmissionCsvColumn {
  key: string;
  label: string;
  required: boolean;
  help: string;
}

/**
 * Colonnes du gabarit, dans l'ordre. Source unique de vérité, partagée par la génération
 * du gabarit, la prévisualisation client et la revalidation serveur.
 * Ni `theme` ni `difficulte` : le thème est choisi une fois dans l'interface pour tout le
 * fichier, la difficulté est imposée à SUBMISSION_CSV_DEFAULT_DIFFICULTY.
 */
export const SUBMISSION_CSV_COLUMNS: SubmissionCsvColumn[] = [
  { key: "libelle", label: "libelle", required: true, help: "L'intitulé, de 5 à 300 caractères." },
  { key: "proposition_1", label: "proposition_1", required: true, help: "Première réponse." },
  { key: "proposition_2", label: "proposition_2", required: true, help: "Deuxième réponse." },
  { key: "proposition_3", label: "proposition_3", required: true, help: "Troisième réponse." },
  { key: "proposition_4", label: "proposition_4", required: true, help: "Quatrième réponse." },
  {
    key: "bonne_reponse",
    label: "bonne_reponse",
    required: true,
    help: "Le numéro de la proposition correcte : 1, 2, 3 ou 4.",
  },
  {
    key: "image_url",
    label: "image_url",
    required: false,
    help: "Optionnel. Adresse http(s) d'une image déjà en ligne.",
  },
  {
    key: "commentaire",
    label: "commentaire",
    required: false,
    help: "Optionnel. Explication affichée au joueur après sa réponse.",
  },
  {
    key: "source",
    label: "source",
    required: false,
    help: "Optionnel. D'où provient l'information.",
  },
];

/** En-têtes obligatoires que le fichier importé doit comporter. */
export const SUBMISSION_CSV_REQUIRED_HEADERS = SUBMISSION_CSV_COLUMNS.filter((c) => c.required).map(
  (c) => c.label,
);

/** Nom de fichier proposé au téléchargement du gabarit. */
export const SUBMISSION_CSV_TEMPLATE_FILENAME = "gabarit-questions-lazyculture.csv";

/** Génère le gabarit : ligne d'en-tête + deux exemples remplis. */
export function buildTemplateCsv(): string {
  const header = SUBMISSION_CSV_COLUMNS.map((c) => c.label);
  const examples = [
    [
      "Quelle est la capitale de l'Australie ?",
      "Canberra",
      "Sydney",
      "Melbourne",
      "Perth",
      "1",
      "",
      "Sydney est la plus grande ville, mais Canberra est la capitale depuis 1913.",
      "Atlas Larousse",
    ],
    [
      "En quelle année a été fondée la Croix-Rouge ?",
      "1815",
      "1863",
      "1901",
      "1945",
      "2",
      "",
      "Fondée à Genève par Henry Dunant à la suite de la bataille de Solférino.",
      "",
    ],
  ];

  return serializeCsv([header, ...examples], ";", true);
}

/**
 * Vrai si l'adresse d'image est acceptable : vide, ou http(s).
 * Appliquée aussi bien à la prévisualisation client qu'à la revalidation serveur, pour qu'un
 * appel direct à l'API ne puisse pas contourner la règle du gabarit.
 */
export function isValidImageUrl(img: string | undefined): boolean {
  const value = (img ?? "").trim();
  return !value || /^https?:\/\//i.test(value);
}

/** Message d'erreur associé à une image_url invalide. */
export const INVALID_IMAGE_URL_ERROR =
  "La colonne image_url doit être une adresse commençant par http:// ou https://.";

/** Normalise un libellé pour la détection de doublons (casse et espaces ignorés). */
export function normalizeLibelle(libelle: string): string {
  return libelle.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Convertit une ligne de CSV (déjà indexée par nom de colonne) en contenu de question.
 * Ne connaît ni le thème ni la difficulté : c'est ce qui garantit qu'aucune valeur
 * contrainte ne peut venir du fichier.
 */
export function mapCsvRowToPayload(
  record: Record<string, string>,
  line: number,
): { row: BulkSubmissionRowPayload } | { error: string } {
  const libelle = (record.libelle ?? "").trim();
  if (libelle.length < LIBELLE_MIN_LENGTH || libelle.length > LIBELLE_MAX_LENGTH) {
    return {
      error: `L'intitulé doit comporter entre ${LIBELLE_MIN_LENGTH} et ${LIBELLE_MAX_LENGTH} caractères.`,
    };
  }

  const propositions: BulkSubmissionRowPayload["propositions"] = [];
  for (let i = 0; i < PROPOSITION_COUNT; i++) {
    const value = (record[`proposition_${i + 1}`] ?? "").trim();
    if (!value) {
      return { error: `La colonne proposition_${i + 1} ne peut pas être vide.` };
    }
    if (value.length > PROPOSITION_MAX_LENGTH) {
      return {
        error: `La colonne proposition_${i + 1} dépasse ${PROPOSITION_MAX_LENGTH} caractères.`,
      };
    }
    propositions.push({ id: i, value });
  }

  const rawResponse = (record.bonne_reponse ?? "").trim();
  const responseNumber = Number(rawResponse);
  if (
    !rawResponse ||
    !Number.isInteger(responseNumber) ||
    responseNumber < 1 ||
    responseNumber > PROPOSITION_COUNT
  ) {
    return {
      error: `La colonne bonne_reponse doit valoir 1, 2, 3 ou 4 (valeur lue : « ${rawResponse} »).`,
    };
  }

  const img = (record.image_url ?? "").trim();
  if (!isValidImageUrl(img)) {
    return { error: INVALID_IMAGE_URL_ERROR };
  }

  const commentaire = (record.commentaire ?? "").trim();
  if (commentaire.length > COMMENTAIRE_MAX_LENGTH) {
    return { error: `La colonne commentaire dépasse ${COMMENTAIRE_MAX_LENGTH} caractères.` };
  }

  const source = (record.source ?? "").trim();
  if (source.length > SOURCE_MAX_LENGTH) {
    return { error: `La colonne source dépasse ${SOURCE_MAX_LENGTH} caractères.` };
  }

  return {
    row: {
      line,
      libelle,
      propositions,
      // Convention communautaire : propositions d'ids 0..3 et réponse 0-based.
      response: responseNumber - 1,
      img: img || undefined,
      commentaire: commentaire || undefined,
      source: source || undefined,
    },
  };
}
