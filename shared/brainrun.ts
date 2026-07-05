import type { QuestionDTO } from "./question";
import type {
  BrainrunConsumableId,
  BrainrunConsumableReveal,
  BrainrunOffer,
  BrainrunRelicId,
} from "./brainrunItems";
import type { BrainrunTalentId } from "./brainrunTalents";

/** Constantes de structure de run partagées entre client et serveur (affichage de la progression).
 * BRAINRUN_ROOMS_PER_ACT = nombre de rangées par acte (6 rangées de choix + 1 rangée Boss) ; la
 * forme détaillée de la carte (nœuds par rangée) est BRAINRUN_ACT_ROW_WIDTHS, côté serveur uniquement
 * (server/utils/brainrunConfig.ts), le client n'a besoin que du décompte de rangées pour la progression. */
export const BRAINRUN_TOTAL_ACTS = 3;
export const BRAINRUN_ROOMS_PER_ACT = 7;
/** Temps imparti par question du combat de boss (contre-la-montre) ; le client en a besoin pour afficher le chrono. */
export const BRAINRUN_BOSS_QUESTION_TIME_MS = 10_000;
/** Sous ce délai de réponse (correcte), les dégâts infligés au boss sont doublés ; le client en a besoin pour afficher l'aperçu de dégâts. */
export const BRAINRUN_BOSS_FAST_ANSWER_MS = 2_000;
/** Dégâts infligés au boss pour une réponse correcte dans les temps (hors bonus de vitesse). */
export const BRAINRUN_BOSS_BASE_DAMAGE = 20;
/** Multiplicateur de dégâts appliqué en cas de réponse correcte rapide (< BRAINRUN_BOSS_FAST_ANSWER_MS). */
export const BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER = 2;
/** Délai (ms) avant affichage de la révélation de la relique Sixième Sens, une fois la question
 * apparue ; le tirage lui-même est déjà décidé côté serveur (cf. consumableReveal.autoHintId),
 * ce délai ne pilote que l'affichage client. */
export const BRAINRUN_SIXTH_SENSE_DELAY_MS = 8_000;

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

/** Nœud de la carte d'acte tel qu'exposé au client : la position/le tracé sont toujours visibles,
 * `type` est masqué (null) tant que le nœud n'est ni joué ni dans la portée de vision du joueur
 * (relique Prévoyance) — cf. BrainrunService.buildState. */
export type BrainrunMapNodeDTO = {
  row: number;
  col: number;
  /** Colonnes de la rangée row+1 accessibles depuis ce nœud ; vide pour le Boss. */
  nextCols: number[];
  status: BrainrunRoomStatus;
  type: BrainrunRoomType | null;
};

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
  /** true si ce coup a mis le boss à 0 PV mais qu'il va se relever (malus "phoenix_revive"). */
  bossRevived?: boolean;
  correctResponseId?: number;
  commentaire?: string;
  commentaireImg?: string;
};

export type BrainrunRoomDTO = {
  id: number;
  runId: string;
  act: number;
  row: number;
  col: number;
  /** Colonnes de la rangée row+1 accessibles depuis ce nœud ; vide pour le Boss. */
  nextCols: number[];
  type: BrainrunRoomType;
  status: BrainrunRoomStatus;
  /** Id du catalogue BRAINRUN_ENEMIES (shared/brainrunEnemies.ts) ; uniquement pour STANDARD/ELITE. */
  enemyId: string | null;
  /** Id du catalogue BRAINRUN_BOSSES (shared/brainrunBosses.ts) ; uniquement pour BOSS. */
  bossId: string | null;
  /** Nombre de résurrections déjà consommées par le boss (uniquement pertinent pour "phoenix_revive"). */
  bossPhase: number;
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
  /** Effets ponctuels des consommables sur la question en cours (50/50, Appel à un ami, Sablier
   * Fêlé, Coup de Grâce, Antidote) ; cf. shared/brainrunItems.ts. */
  consumableReveal: BrainrunConsumableReveal | null;
};

export type BrainrunRunDTO = {
  id: string;
  userId: string;
  status: BrainrunRunStatus;
  currentAct: number;
  currentRow: number;
  /** Colonne du nœud actif dans currentRow ; null tant qu'aucun choix n'a été fait sur cette rangée. */
  currentCol: number | null;
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
  /** Thèmes bannis pour le reste de la run (relique Purge Thématique). */
  bannedThemes: string[];
  /** true entre l'octroi de Purge Thématique et le choix du thème par le joueur ; bloque
   * acknowledgeRoom, comme offersRequireChoice pour le bonus post-combat. */
  pendingThemeBanChoice: boolean;
  /** Thèmes encore tirables (non bannis) parmi lesquels choisir ; non vide seulement quand
   * pendingThemeBanChoice est true. */
  availableThemesToBan: string[];
};

/** Réponse de GET /api/brainrun/current : reflète intégralement l'état courant, dérivé côté serveur. */
export type BrainrunStateDTO = {
  run: BrainrunRunDTO;
  /** Nœud actif (en cours de résolution) ; null tant qu'aucun nœud n'a été choisi sur currentRow. */
  currentRoom: BrainrunRoomDTO | null;
  /** Question à afficher si la salle active est en cours de résolution (type déjà choisi). */
  currentQuestion: QuestionDTO | null;
  /** true si le joueur doit choisir un nœud parmi candidateCols sur currentRow. */
  awaitingChoice: boolean;
  /** Tous les nœuds de l'acte en cours (position/tracé toujours visibles, type masqué à null
   * hors de la portée de vision du joueur). */
  mapNodes: BrainrunMapNodeDTO[];
  /** Colonnes accessibles depuis la position actuelle sur run.currentRow ; non-null seulement
   * quand awaitingChoice est vrai. */
  candidateCols: number[] | null;
};

/** Réponse de GET /api/brainrun/meta : progression metagame persistante du joueur. */
export type BrainrunMetaProgressDTO = {
  knowledgePoints: number;
  unlockedTalents: BrainrunTalentId[];
  /** Reliques/consommables déjà obtenus au moins une fois, toutes runs confondues (glossaire). */
  discoveredRelics: BrainrunRelicId[];
  discoveredConsumables: BrainrunConsumableId[];
};
