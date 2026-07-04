import type { QuestionDTO } from "./question";
import type { BrainrunOffer, BrainrunRelicId } from "./brainrunItems";
import type { BrainrunTalentId } from "./brainrunTalents";

/** Constantes de structure de run partagées entre client et serveur (affichage de la progression). */
export const BRAINRUN_TOTAL_ACTS = 3;
export const BRAINRUN_CHOICE_POINTS_PER_ACT = 6;
export const BRAINRUN_ROOMS_PER_ACT = BRAINRUN_CHOICE_POINTS_PER_ACT + 1;
/** Temps imparti par question du combat de boss (contre-la-montre) ; le client en a besoin pour afficher le chrono. */
export const BRAINRUN_BOSS_QUESTION_TIME_MS = 10_000;
/** Sous ce délai de réponse (correcte), les dégâts infligés au boss sont doublés ; le client en a besoin pour afficher l'aperçu de dégâts. */
export const BRAINRUN_BOSS_FAST_ANSWER_MS = 2_000;
/** Dégâts infligés au boss pour une réponse correcte dans les temps (hors bonus de vitesse). */
export const BRAINRUN_BOSS_BASE_DAMAGE = 20;
/** Multiplicateur de dégâts appliqué en cas de réponse correcte rapide (< BRAINRUN_BOSS_FAST_ANSWER_MS). */
export const BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER = 2;

/**
 * Dégâts qui seraient infligés au boss si la réponse actuelle était correcte, en fonction du
 * temps déjà écoulé sur la question — décroît de BRAINRUN_BOSS_BASE_DAMAGE * multiplicateur à 0.
 * Utilisé côté client pour l'aperçu affiché pendant le combat, et côté serveur comme base du
 * calcul réel des dégâts (cf. brainrunBossDamage dans server/utils/brainrunLogic.ts).
 */
export function brainrunPotentialBossDamage(elapsedMs: number, bonusTimeMs: number = 0): number {
  if (elapsedMs >= BRAINRUN_BOSS_QUESTION_TIME_MS + bonusTimeMs) return 0;
  return elapsedMs < BRAINRUN_BOSS_FAST_ANSWER_MS
    ? BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER
    : BRAINRUN_BOSS_BASE_DAMAGE;
}

export type BrainrunRoomType = "STANDARD" | "ELITE" | "BOSS" | "REST" | "SHOP" | "EVENT";
export type BrainrunRoomStatus = "PENDING" | "ACTIVE" | "CLEARED" | "FAILED" | "SKIPPED";
export type BrainrunRunStatus = "IN_PROGRESS" | "WON" | "LOST" | "ABANDONED";

export type BrainrunRoomResponse = {
  questionId: number;
  responseId: number;
  success: boolean;
  /** PV perdus pour cette réponse (0 si correcte). */
  hpLoss: number;
  /** Dégâts infligés au boss pour cette réponse (uniquement salle BOSS, 0 sinon). */
  bossDamage?: number;
  /** true si le temps imparti a expiré avant la réponse (uniquement salle BOSS). */
  timedOut?: boolean;
  /** true si la relique Seconde Chance a été consommée pour annuler la mort sur ce coup. */
  extraLifeUsed?: boolean;
  correctResponseId?: number;
  commentaire?: string;
  commentaireImg?: string;
};

export type BrainrunRoomDTO = {
  id: number;
  runId: string;
  act: number;
  sequence: number;
  type: BrainrunRoomType | null;
  status: BrainrunRoomStatus;
  /** Id du catalogue BRAINRUN_ENEMIES (shared/brainrunEnemies.ts) ; uniquement pour STANDARD/ELITE. */
  enemyId: string | null;
  choiceTypes: BrainrunRoomType[];
  questionIds: number[];
  responses: BrainrunRoomResponse[];
  goldEarned: number;
  /** PV courants du boss (uniquement salle BOSS active/terminée, null sinon). */
  bossHealthPoint: number | null;
  /** PV max du boss au démarrage du combat (uniquement salle BOSS, null sinon). */
  bossMaxHealthPoint: number | null;
  /** Horodatage limite pour répondre à la question en cours (uniquement salle BOSS active). */
  questionDeadline: Date | null;
  /** Offres à résoudre : bonus post-combat (ELITE/BOSS) ou offres de la Boutique. */
  offers: BrainrunOffer[] | null;
  /** true uniquement pour le bonus post-combat : bloque acknowledgeRoom tant que non résolu. */
  offersRequireChoice: boolean;
  offersResolved: boolean;
  /** Clé dans le catalogue BRAINRUN_EVENTS (uniquement salle EVENT active). */
  eventId: string | null;
  /** Effet 50/50 ("eliminatedIds") ou Appel à un ami ("hintId") sur la question en cours. */
  consumableReveal: { eliminatedIds?: number[]; hintId?: number } | null;
};

export type BrainrunRunDTO = {
  id: string;
  userId: string;
  status: BrainrunRunStatus;
  currentAct: number;
  currentSequence: number;
  healthPoint: number;
  maxHealthPoint: number;
  gold: number;
  xpEarned: number | null;
  /** Points de Savoir gagnés à la fin de cette run (or converti), null tant qu'elle est en cours. */
  knowledgePointsEarned: number | null;
  createDate: Date;
  endDate: Date | null;
  /** Reliques passives possédées pour le reste de la run. */
  relics: BrainrunRelicId[];
  /** Consommables possédés, par id, nombre restant. */
  consumables: Record<string, number>;
  /** true si un Bouclier est armé : la prochaine perte de PV sera annulée. */
  shieldArmed: boolean;
};

/** Réponse de GET /api/brainrun/current : reflète intégralement l'état courant, dérivé côté serveur. */
export type BrainrunStateDTO = {
  run: BrainrunRunDTO;
  currentRoom: BrainrunRoomDTO | null;
  /** Question à afficher si la salle active est en cours de résolution (type déjà choisi). */
  currentQuestion: QuestionDTO | null;
  /** true si la salle active attend un choix du joueur parmi currentRoom.choiceTypes. */
  awaitingChoice: boolean;
};

/** Réponse de GET /api/brainrun/meta : progression metagame persistante du joueur. */
export type BrainrunMetaProgressDTO = {
  knowledgePoints: number;
  unlockedTalents: BrainrunTalentId[];
};
