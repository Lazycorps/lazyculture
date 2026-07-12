import type { QuestionDTO } from "./question";
import type {
  BrainrunConsumableId,
  BrainrunConsumableReveal,
  BrainrunOffer,
  BrainrunRelicId,
} from "./brainrunItems";
import type { BrainrunTalentId } from "./brainrunTalents";

/** Constantes de structure de run partagées entre client et serveur (affichage de la progression).
 * La forme détaillée de la carte (nœuds par rangée) est définie par acte dans
 * server/utils/brainrunConfig.ts (getBrainrunActRowWidths) ; le client n'a besoin que du décompte
 * de rangées par acte pour la progression, via getBrainrunRoomsPerAct ci-dessous. */
export const BRAINRUN_TOTAL_ACTS = 3;

/** Nombre de rangées d'un acte : l'acte 1 a une rangée Neutre en plus en tête (10 rangées : 1
 * Neutre + 9 étages), les actes 2/3 n'en ont pas (9 rangées : 9 étages), le nœud de boss de l'acte
 * précédent tenant lieu de point de départ visuel — cf. references/map.md. */
export function getBrainrunRoomsPerAct(act: number): number {
  return act === 1 ? 10 : 9;
}
/** Temps imparti par question du combat de boss (contre-la-montre) ; le client en a besoin pour
 * afficher le chrono. Rallongé de 5s (par rapport aux 10s d'origine) pour compenser la décroissance
 * continue (point par point) des dégâts potentiels, qui laisse moins de marge qu'un palier fixe. */
export const BRAINRUN_BOSS_QUESTION_TIME_MS = 15_000;
/** Dégâts de base infligés au boss pour une réponse correcte ; sert aussi de référence au
 * calibrage de ses PV (cf. BRAINRUN_BOSS_MAX_HP dans server/utils/brainrunConfig.ts). */
export const BRAINRUN_BOSS_BASE_DAMAGE = 20;
/** Multiplicateur appliqué au dégât de base pour obtenir le dégât maximal (50), infligé pour une
 * réponse instantanée (cf. brainrunPotentialBossDamage). */
export const BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER = 2.5;
/** Délai (ms) avant affichage de la révélation de la relique Sixième Sens, une fois la question
 * apparue ; le tirage lui-même est déjà décidé côté serveur (cf. consumableReveal.autoHintId),
 * ce délai ne pilote que l'affichage client. */
export const BRAINRUN_SIXTH_SENSE_DELAY_MS = 8_000;
/** Malus de boss "Alain" (memory_recall) : décompte de mémorisation forcée de la toute première
 * question d'un combat contre lui (pas de réponses affichées, pas de chrono contre-la-montre, ne
 * peut infliger ni subir aucun dégât) — cf. references/enemies-and-bosses.md. 5 tics de 1,5s. */
export const BRAINRUN_ALAIN_INTRO_TICKS = 5;
export const BRAINRUN_ALAIN_INTRO_TICK_MS = 1_500;
export const BRAINRUN_ALAIN_INTRO_MS = BRAINRUN_ALAIN_INTRO_TICKS * BRAINRUN_ALAIN_INTRO_TICK_MS;

/**
 * Dégâts qui seraient infligés au boss si la réponse actuelle était correcte, en fonction du
 * temps déjà écoulé sur la question — décroît linéairement, point par point, de
 * BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER (réponse immédiate) à 0 (temps
 * écoulé), plutôt que par paliers. Utilisé côté client pour l'aperçu affiché pendant le combat, et
 * côté serveur comme calcul réel des dégâts (cf. brainrunBossDamage dans
 * server/utils/brainrunLogic.ts).
 */
export function brainrunPotentialBossDamage(elapsedMs: number, bonusTimeMs: number = 0): number {
  const totalMs = BRAINRUN_BOSS_QUESTION_TIME_MS + bonusTimeMs;
  if (elapsedMs >= totalMs) return 0;
  const maxDamage = BRAINRUN_BOSS_BASE_DAMAGE * BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER;
  // Math.ceil (pas round) : tant qu'il reste ne serait-ce que 1ms avant l'expiration, la réponse
  // doit encore infliger au moins 1 point de dégâts — seul le timeout réel (elapsedMs >= totalMs,
  // cf. ci-dessus) doit ramener à 0.
  return Math.max(0, Math.ceil(maxDamage * (1 - elapsedMs / totalMs)));
}

export type BrainrunRoomType =
  | "NEUTRAL"
  | "STANDARD"
  | "ELITE"
  | "BOSS"
  | "REST"
  | "SHOP"
  | "EVENT";
export type BrainrunRoomStatus = "PENDING" | "ACTIVE" | "CLEARED" | "FAILED" | "SKIPPED";
export type BrainrunRunStatus = "IN_PROGRESS" | "WON" | "LOST" | "ABANDONED";

/** Nœud de la carte d'acte tel qu'exposé au client : toutes les salles d'un acte sont toujours
 * visibles (position, tracé, type), plus de brouillard de guerre — cf. BrainrunService.buildState. */
export type BrainrunMapNodeDTO = {
  row: number;
  col: number;
  /** Colonnes de la rangée row+1 accessibles depuis ce nœud ; vide pour le Boss. */
  nextCols: number[];
  status: BrainrunRoomStatus;
  type: BrainrunRoomType;
  /** Thèmes de l'ennemi/boss de ce nœud (bannis retirés), uniquement si le joueur possède la
   * relique Prévoyance (`FORESIGHT`) et que ce nœud est un combat (Standard/Élite/Boss) ; sinon
   * `null` (pas de relique, ou salle non-combat) — alimente la modale de prévisualisation. */
  themes: string[] | null;
};

/** Question déjà tirée pour la salle de Boss en cours mais dont les propositions ne sont pas
 * encore visibles (malus "memory_recall" d'Alain, cf. references/enemies-and-bosses.md) :
 * uniquement de quoi afficher l'énoncé, jamais les propositions ni la bonne réponse — le joueur
 * doit s'en souvenir pour l'étape suivante, un payload contenant les propositions permettrait de
 * tricher en lisant le réseau plutôt qu'en mémorisant. */
export type BrainrunQuestionPreviewDTO = {
  id: number;
  libelle: string;
  img: string;
  themes: string[];
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
  /** true si la relique Spécialisation a rendu 1 PV à la fin de ce combat (salle CLEARED). */
  healthRegenerated?: boolean;
  correctResponseId?: number;
  commentaire?: string;
  commentaireImg?: string;
};

/** Résultat réellement appliqué de l'option d'Événement choisie (cf. resolveEvent) : les deltas
 * nominaux de l'option (shared/brainrunItems.ts BrainrunEventOption) ne suffisent pas à eux
 * seuls à décrire ce qu'il s'est passé, certains tirages étant aléatoires (relique/consommable
 * "RANDOM", relique sacrifiée "RANDOM_OWNED") ou modifiés par le Bouclier. */
export type BrainrunEventOutcomeDTO = {
  optionIndex: number;
  /** Index de l'outcome tiré au sort dans la table de l'option (cf. resolveEventOption). */
  outcomeIndex: number;
  /** Texte de lore décrivant le résultat tiré au sort, affiché tel quel au joueur. */
  resultText: string;
  /** PV effectivement perdus/gagnés (0 si le Bouclier a annulé un coût, ou si soin complet). */
  hpDelta: number;
  /** true si l'outcome a restauré tous les PV (affiché à part du hpDelta chiffré). */
  fullHealGranted: boolean;
  goldDelta: number;
  /** Variation de PV max (≤ 0 : rançon d'une résurrection, cf. événement Le Phénix Érudit). */
  maxHpDelta: number;
  /** Charges de Bouclier octroyées. */
  shieldChargesGranted: number;
  /** Charges de 50/50 automatique octroyées (appliquées aux prochaines questions de combat). */
  fiftyFiftyChargesGranted: number;
  /** true si un Dernier Souffle (résurrection) a été octroyé. */
  reviveGranted: boolean;
  relicGranted: BrainrunRelicId | null;
  relicLost: BrainrunRelicId | null;
  consumablesGranted: { id: BrainrunConsumableId; amount: number }[];
  shieldConsumed: boolean;
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
  /** Résultat réellement appliqué de l'option choisie (uniquement salle EVENT CLEARED). */
  eventOutcome: BrainrunEventOutcomeDTO | null;
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
  /** Points de Savoir gagnés à la fin de cette run (or converti, bonus de talent inclus), null
   * tant qu'elle est en cours. */
  knowledgePointsEarned: number | null;
  /** Part de knowledgePointsEarned due au talent Intérêts Composés (Utilitaire) ; 0 si non
   * débloqué. Affichage détaillé du récap de fin de run ("+24 PS (+3)"). */
  knowledgePointsBonus: number;
  /** Pièces (monnaie globale UserWallet) créditées pendant cette run, uniquement aux Boss
   * d'acte vaincus (cf. server/utils/brainrunMetaHelper.ts grantBrainrunActCoins). */
  coinsEarned: number;
  createDate: Date;
  endDate: Date | null;
  /** Reliques passives possédées pour le reste de la run. */
  relics: BrainrunRelicId[];
  /** Consommables possédés, par id, nombre restant. */
  consumables: Record<string, number>;
  /** Plafond total d'emplacements de consommables (somme des valeurs de `consumables`), 3 de
   * base + bonus de la relique Sac à Dos. */
  maxConsumables: number;
  /** Charges de Bouclier actives : chacune annule 1 perte de PV. Partagées entre le consommable
   * Bouclier et les talents Bouclier d'Acte/du Boss ; expirent (repassent à 0) à la fin de chaque
   * combat, utilisées ou non. */
  shieldCharges: number;
  /** Charges de 50/50 automatique restantes (récompense d'Événement) : chacune applique un 50/50
   * à la prochaine question de combat présentée puis se consomme. Persistent entre les combats,
   * contrairement au Bouclier. */
  fiftyFiftyCharges: number;
  /** Thèmes bannis pour le reste de la run (relique Purge Thématique). */
  bannedThemes: string[];
  /** true entre l'octroi de Purge Thématique et le choix du thème par le joueur ; bloque
   * acknowledgeRoom, comme offersRequireChoice pour le bonus post-combat. */
  pendingThemeBanChoice: boolean;
  /** Thèmes encore tirables (non bannis) parmi lesquels choisir ; non vide seulement quand
   * pendingThemeBanChoice est true. */
  availableThemesToBan: string[];
  /** true dès qu'un outil de debug (set-stats/téléportation, dev uniquement) a touché cette run :
   * elle ne rapportera ni XP, ni pièces, ni Points de Savoir, et ne compte pas dans les
   * achievements (cf. references/debug-mode.md). */
  isDebugRun: boolean;
};

/** Réponse de GET /api/brainrun/current : reflète intégralement l'état courant, dérivé côté serveur. */
export type BrainrunStateDTO = {
  run: BrainrunRunDTO;
  /** Nœud actif (en cours de résolution) ; null tant qu'aucun nœud n'a été choisi sur currentRow. */
  currentRoom: BrainrunRoomDTO | null;
  /** Question à afficher si la salle active est en cours de résolution (type déjà choisi). */
  currentQuestion: QuestionDTO | null;
  /** Question suivante déjà tirée mais pas encore répondable (malus "memory_recall" d'Alain
   * uniquement) : énoncé seul, à mémoriser avant que ses propositions n'apparaissent à l'étape
   * suivante. null pour tout autre boss/salle, ou si aucune question suivante n'a encore été
   * tirée (cf. BrainrunService.buildState). */
  previewQuestion: BrainrunQuestionPreviewDTO | null;
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
  /** Nombre de runs terminées (WON/LOST/ABANDONED), hors run en cours. */
  totalRuns: number;
  /** Acte/salle de la run terminée la plus avancée ; null tant qu'aucune run n'est terminée. */
  bestRun: { act: number; row: number } | null;
};
