import prisma from "~~/server/utils/prisma";
import type { Question } from "@prisma/client";
import { updateUserRank } from "./rankHelper";
import { achievementService } from "~~/server/services/AchievementService";
import { coinsFromXp, grantCoins } from "./walletHelper";

export interface BRPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  frameStyleKey: string | null;
  level: number;
  lives: number;
  lastAnsweredRound: number;
  lastAnswerCorrect: boolean | null;
  lastAnswerTime: Date | null;
  eliminatedAtRound: number | null;
  selectedPropositionId: number | null;
  xpEarned: number;
  isOnline: boolean;
  isReady: boolean;
  rankPoints: number;
  correctStreak?: number;
  maxCorrectStreak?: number;
}

export interface BRMatch {
  matchId: string;
  status: "WAITING" | "PLAYING" | "FINISHED";
  currentRound: number;
  currentQuestionId: number | null;
  currentQuestion: {
    id: number;
    libelle: string;
    propositions: { id: number; value: string; img: string }[];
    img: string;
    themes: string[];
  } | null;
  currentQuestionAnswer: number | null;
  currentQuestionCommentaire: string;
  currentQuestionStart: Date | null;
  currentQuestionDuration: number;
  winnerId: string | null;
  players: BRPlayer[];
  usedQuestionIds: number[];
  countdown: number; // Compte à rebours du lobby
  countdownInterval?: NodeJS.Timeout;
  roundTimer?: NodeJS.Timeout;
  nextRoundTimeout?: NodeJS.Timeout;
  clients: { userId: string; push: (message: { event: string; data: any }) => void }[];
}

class BattleRoyaleManager {
  private activeMatches: Record<string, BRMatch> = {};
  private replayMatches: Record<string, string> = {};

  constructor() {
    // Nettoyer les anciens salons orphelins après démarrage
    void this.cleanupOrphanedMatches();
  }

  /**
   * Obtient ou crée un replay de match lié à un ancien match.
   */
  async getOrCreateReplayMatch(oldMatchId: string): Promise<BRMatch> {
    const existingReplayId = this.replayMatches[oldMatchId];
    if (existingReplayId) {
      const match = this.getMatch(existingReplayId);
      if (match && match.status === "WAITING") {
        return match;
      }
    }

    const match = await this.createNewMatch();
    this.replayMatches[oldMatchId] = match.matchId;

    // Nettoyer après 10 minutes pour libérer la mémoire
    setTimeout(
      () => {
        delete this.replayMatches[oldMatchId];
      },
      10 * 60 * 1000,
    );

    return match;
  }

  private async cleanupOrphanedMatches() {
    try {
      await prisma.battleRoyaleMatch.updateMany({
        where: {
          status: { in: ["WAITING", "PLAYING"] },
          createdAt: { lt: new Date(Date.now() - 3600 * 1000) }, // plus de 1h
        },
        data: {
          status: "FINISHED",
        },
      });
    } catch (e) {
      console.error("Erreur lors du nettoyage des matchs orphelins:", e);
    }
  }

  private async deleteMatch(matchId: string) {
    const match = this.activeMatches[matchId];
    if (match) {
      if (match.countdownInterval) clearInterval(match.countdownInterval);
      if (match.roundTimer) clearTimeout(match.roundTimer);
      if (match.nextRoundTimeout) clearTimeout(match.nextRoundTimeout);
      delete this.activeMatches[matchId];
    }

    try {
      await prisma.battleRoyaleMatch.delete({
        where: { id: matchId },
      });
    } catch (e) {
      console.error(`Erreur lors de la suppression du match ${matchId} en DB:`, e);
    }
  }

  /**
   * Retire un joueur de tous les autres matchs actifs (WAITING ou PLAYING).
   */
  async removePlayerFromAllOtherMatches(userId: string, currentMatchId: string) {
    const activeMatchIds = Object.keys(this.activeMatches);
    for (const matchId of activeMatchIds) {
      if (matchId === currentMatchId) continue;
      const match = this.activeMatches[matchId];
      if (!match) continue;

      const playerIndex = match.players.findIndex((p) => p.userId === userId);
      if (playerIndex !== -1) {
        // Retirer le joueur de la mémoire
        match.players.splice(playerIndex, 1);
        match.clients = match.clients.filter((c) => c.userId !== userId);

        // Retirer de la base de données
        try {
          await prisma.battleRoyalePlayer.delete({
            where: {
              matchId_userId: { matchId, userId },
            },
          });
        } catch (e) {
          // Ignorer si déjà supprimé
        }

        // Si le match n'a plus aucun joueur connecté (online), ou plus aucun joueur tout court, on le supprime.
        const onlineCount = match.players.filter((p) => p.isOnline).length;
        if (match.players.length === 0 || (match.status !== "FINISHED" && onlineCount === 0)) {
          await this.deleteMatch(matchId);
          continue;
        }

        // Sinon, mettre à jour le match restant
        if (match.status === "WAITING") {
          this.checkLobbyCountdown(matchId);
          this.broadcast(matchId, "lobby_update", {
            players: this.getPlayersState(match),
            countdown: match.countdown,
            isCountdownRunning: !!match.countdownInterval,
          });
        } else if (match.status === "PLAYING") {
          // Si le match est en cours, vérifier s'il reste des survivants
          const survivors = match.players.filter((p) => p.lives > 0);
          if (survivors.length === 1) {
            void this.endMatch(matchId, survivors[0]!.userId);
          } else if (survivors.length === 0) {
            void this.endMatch(matchId, null);
          } else {
            this.broadcast(matchId, "lobby_update", {
              players: this.getPlayersState(match),
            });
          }
        }
      }
    }
  }

  /**
   * Récupère ou crée une partie en attente de joueurs.
   */
  async getOrCreateWaitingMatch(): Promise<BRMatch> {
    // 1. Chercher dans la mémoire
    let match = Object.values(this.activeMatches).find((m) => m.status === "WAITING");

    if (!match) {
      // 2. Créer en Base de Données
      const dbMatch = await prisma.battleRoyaleMatch.create({
        data: {
          status: "WAITING",
          currentRound: 0,
        },
      });

      // 3. Initialiser en mémoire
      match = {
        matchId: dbMatch.id,
        status: "WAITING",
        currentRound: 0,
        currentQuestionId: null,
        currentQuestion: null,
        currentQuestionAnswer: null,
        currentQuestionCommentaire: "",
        currentQuestionStart: null,
        currentQuestionDuration: 20,
        winnerId: null,
        players: [],
        usedQuestionIds: [],
        countdown: 60,
        clients: [],
      };

      this.activeMatches[match.matchId] = match;
    }

    return match;
  }

  /**
   * Crée un tout nouveau match en attente en DB et en mémoire.
   */
  async createNewMatch(): Promise<BRMatch> {
    // Créer en Base de Données
    const dbMatch = await prisma.battleRoyaleMatch.create({
      data: {
        status: "WAITING",
        currentRound: 0,
      },
    });

    // Initialiser en mémoire
    const match: BRMatch = {
      matchId: dbMatch.id,
      status: "WAITING",
      currentRound: 0,
      currentQuestionId: null,
      currentQuestion: null,
      currentQuestionAnswer: null,
      currentQuestionCommentaire: "",
      currentQuestionStart: null,
      currentQuestionDuration: 20,
      winnerId: null,
      players: [],
      usedQuestionIds: [],
      countdown: 60,
      clients: [],
    };

    this.activeMatches[match.matchId] = match;
    return match;
  }

  /**
   * Récupère la liste des matchs en attente de joueurs.
   */
  getWaitingMatches() {
    return Object.values(this.activeMatches)
      .filter((m) => m.status === "WAITING")
      .map((m) => ({
        matchId: m.matchId,
        playersCount: m.players.length,
        players: m.players.map((p) => ({
          userId: p.userId,
          name: p.name,
          isOnline: p.isOnline,
          isReady: p.isReady,
        })),
        countdown: m.countdown,
        isCountdownRunning: !!m.countdownInterval,
      }));
  }

  /**
   * Récupère une partie active en mémoire par son ID.
   */
  getMatch(matchId: string): BRMatch | undefined {
    return this.activeMatches[matchId];
  }

  /**
   * Récupère le pseudo et le niveau d'un joueur depuis la base.
   */
  async getPlayerInfo(userId: string): Promise<{ name: string; level: number }> {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const progress = await prisma.userProgress.findUnique({ where: { userId } });
    return {
      name: dbUser?.name || "Joueur",
      level: progress?.levelId || 1,
    };
  }

  /**
   * Retourne l'ID du match WAITING/PLAYING de l'utilisateur s'il est toujours
   * actif en mémoire, sinon null.
   */
  async getActiveMatchIdForUser(userId: string): Promise<string | null> {
    const playerMatch = await prisma.battleRoyalePlayer.findFirst({
      where: {
        userId,
        match: {
          status: { in: ["WAITING", "PLAYING"] },
        },
      },
      select: {
        matchId: true,
      },
    });

    if (!playerMatch) return null;
    if (!this.getMatch(playerMatch.matchId)) return null;
    return playerMatch.matchId;
  }

  /**
   * Enregistre un client SSE pour recevoir les événements.
   */
  async registerClient(
    matchId: string,
    userId: string,
    pushFn: (msg: { event: string; data: any }) => void,
  ) {
    const match = this.getMatch(matchId);
    if (!match) return;

    // Supprimer une ancienne connexion du même utilisateur si elle existe
    match.clients = match.clients.filter((c) => c.userId !== userId);
    match.clients.push({ userId, push: pushFn });

    // Marquer le joueur comme en ligne
    let player = match.players.find((p) => p.userId === userId);
    if (!player) {
      // Si le joueur n'est pas en mémoire mais est inscrit dans la DB pour ce match, on le restaure
      try {
        const dbPlayer = await prisma.battleRoyalePlayer.findUnique({
          where: { matchId_userId: { matchId, userId } },
          include: {
            user: {
              include: {
                equippedAvatar: { select: { imageUrl: true } },
                equippedFrame: { select: { styleKey: true } },
              },
            },
          },
        });
        if (dbPlayer) {
          const progress = await prisma.userProgress.findUnique({
            where: { userId },
          });
          const brRank = await prisma.battleRoyaleRank.findUnique({
            where: { userId },
          });
          const level = progress?.levelId || 1;
          const rankPoints = brRank?.points || 0;
          player = {
            userId,
            name: dbPlayer.user.name || "Joueur",
            avatarUrl: dbPlayer.user.equippedAvatar?.imageUrl ?? null,
            frameStyleKey: dbPlayer.user.equippedFrame?.styleKey ?? null,
            level,
            lives: dbPlayer.lives,
            lastAnsweredRound: dbPlayer.lastAnsweredRound,
            lastAnswerCorrect: dbPlayer.lastAnswerCorrect,
            lastAnswerTime: dbPlayer.lastAnswerTime,
            eliminatedAtRound: dbPlayer.eliminatedAtRound,
            selectedPropositionId: null,
            xpEarned: dbPlayer.xpEarned,
            isOnline: true,
            isReady: false,
            rankPoints,
            correctStreak: 0,
            maxCorrectStreak: 0,
          };
          match.players.push(player);
        }
      } catch (e) {
        console.error("Erreur lors de la restauration du joueur dans le lobby:", e);
      }
    } else {
      player.isOnline = true;
    }

    // Envoyer l'état actuel directement au nouveau connecté
    pushFn({
      event: "sync_state",
      data: this.getClientSafeMatchState(match, userId),
    });

    // Diffuser la mise à jour du lobby
    this.broadcast(matchId, "lobby_update", {
      players: this.getPlayersState(match),
      countdown: match.countdown,
      isCountdownRunning: !!match.countdownInterval,
    });

    // Lancer le compte à rebours si conditions réunies
    this.checkLobbyCountdown(matchId);
  }

  /**
   * Supprime un client SSE (déconnexion).
   */
  unregisterClient(matchId: string, userId: string) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.clients = match.clients.filter((c) => c.userId !== userId);

    const player = match.players.find((p) => p.userId === userId);
    if (player) {
      player.isOnline = false;
    }

    // Si le match est en attente ou en cours et qu'il n'y a plus aucun joueur connecté en ligne (SSE), on le supprime
    const onlineCount = match.players.filter((p) => p.isOnline).length;
    if (match.status !== "FINISHED" && onlineCount === 0) {
      void this.deleteMatch(matchId);
      return;
    }

    // Réévaluer le compte à rebours
    this.checkLobbyCountdown(matchId);

    this.broadcast(matchId, "lobby_update", {
      players: this.getPlayersState(match),
      countdown: match.countdown,
      isCountdownRunning: !!match.countdownInterval,
    });
  }

  /**
   * Ajoute un joueur à une partie (appelé via POST /join).
   */
  async addPlayerToMatch(
    matchId: string,
    user: { id: string; name: string },
    level: number,
  ): Promise<boolean> {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "WAITING") return false;

    // Retirer le joueur de tous les autres matchs actifs
    await this.removePlayerFromAllOtherMatches(user.id, matchId);

    // Vérifier si déjà présent
    if (match.players.some((p) => p.userId === user.id)) return true;

    // Enregistrer en DB
    await prisma.battleRoyalePlayer.upsert({
      where: {
        matchId_userId: { matchId, userId: user.id },
      },
      update: {
        lives: 3,
        eliminatedAtRound: null,
      },
      create: {
        matchId,
        userId: user.id,
        lives: 3,
      },
    });

    const brRank = await prisma.battleRoyaleRank.findUnique({
      where: { userId: user.id },
    });
    const rankPoints = brRank?.points || 0;

    const cosmetics = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        equippedAvatar: { select: { imageUrl: true } },
        equippedFrame: { select: { styleKey: true } },
      },
    });

    // Ajouter en mémoire
    match.players.push({
      userId: user.id,
      name: user.name,
      avatarUrl: cosmetics?.equippedAvatar?.imageUrl ?? null,
      frameStyleKey: cosmetics?.equippedFrame?.styleKey ?? null,
      level,
      lives: 3,
      lastAnsweredRound: -1,
      lastAnswerCorrect: null,
      lastAnswerTime: null,
      eliminatedAtRound: null,
      selectedPropositionId: null,
      xpEarned: 0,
      isOnline: false, // Devient true lors de la connexion SSE
      isReady: false,
      rankPoints,
      correctStreak: 0,
      maxCorrectStreak: 0,
    });

    return true;
  }

  /**
   * Gère la réception d'une réponse d'un joueur.
   */
  submitAnswer(
    matchId: string,
    userId: string,
    propositionId: number,
  ): { success: boolean; message: string } {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") {
      return { success: false, message: "Partie non active" };
    }

    const player = match.players.find((p) => p.userId === userId);
    if (!player || player.lives <= 0) {
      return { success: false, message: "Vous ne participez pas ou êtes éliminé" };
    }

    if (player.lastAnsweredRound === match.currentRound) {
      return { success: false, message: "Vous avez déjà répondu pour ce round" };
    }

    // Enregistrer la réponse temporaire
    player.lastAnsweredRound = match.currentRound;
    player.selectedPropositionId = propositionId;
    player.lastAnswerTime = new Date();

    // Déterminer la correction
    const isCorrect = propositionId === match.currentQuestionAnswer;
    player.lastAnswerCorrect = isCorrect;

    // Diffuser le nombre de réponses reçues
    const answersCount = match.players.filter(
      (p) => p.lives > 0 && p.lastAnsweredRound === match.currentRound,
    ).length;

    const aliveCount = match.players.filter((p) => p.lives > 0).length;

    this.broadcast(matchId, "answers_progress", {
      answersCount,
      aliveCount,
      answeredUserIds: match.players
        .filter((p) => p.lives > 0 && p.lastAnsweredRound === match.currentRound)
        .map((p) => p.userId),
    });

    // Si tout le monde a répondu avant la fin du chrono, on accélère la fin du round !
    if (answersCount >= aliveCount) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      void this.resolveRound(matchId);
    }

    return { success: true, message: "Réponse enregistrée" };
  }

  /**
   * Envoie une emote à tous les participants d'un match.
   */
  sendEmote(matchId: string, userId: string, emote: string): { success: boolean; message: string } {
    const match = this.getMatch(matchId);
    if (!match) {
      return { success: false, message: "Partie non active" };
    }

    const player = match.players.find((p) => p.userId === userId);
    if (!player) {
      return { success: false, message: "Vous ne participez pas à ce match" };
    }

    this.broadcast(matchId, "emote", {
      userId,
      name: player.name,
      emote,
    });

    return { success: true, message: "Emote envoyée" };
  }

  // --- LOGIQUE INTERNE DU JEU ---

  private checkLobbyCountdown(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "WAITING") return;

    const onlinePlayers = match.players.filter((p) => p.isOnline);
    const onlineCount = onlinePlayers.length;

    // Au moins 2 joueurs requis pour lancer le chrono
    if (onlineCount < 2) {
      this.stopLobbyCountdown(match);
      this.broadcast(matchId, "lobby_countdown", { countdown: match.countdown, isRunning: false });
      return;
    }

    const readyCount = onlinePlayers.filter((p) => p.isReady).length;
    const readyRatio = readyCount / onlineCount;

    if (readyRatio === 1.0) {
      // 100% Prêt -> Démarrage sous 5 secondes
      if (match.countdownInterval) {
        match.countdown = Math.min(match.countdown, 5);
      } else {
        match.countdown = 5;
        this.startLobbyCountdownInterval(match);
      }
      this.broadcast(matchId, "lobby_countdown", { countdown: match.countdown, isRunning: true });
    } else if (readyRatio >= 0.75) {
      // Au moins 75% Prêt -> Décompte de 60 secondes
      if (!match.countdownInterval) {
        match.countdown = 60;
        this.startLobbyCountdownInterval(match);
      } else {
        // Si on repasse de 100% à >=75%, on réinitialise à 60s
        if (match.countdown < 5) {
          match.countdown = 60;
        }
      }
      this.broadcast(matchId, "lobby_countdown", { countdown: match.countdown, isRunning: true });
    } else {
      // En dessous de 75% Prêt -> Annulation du chrono
      if (match.countdownInterval) {
        this.stopLobbyCountdown(match);
        this.broadcast(matchId, "lobby_countdown", {
          countdown: match.countdown,
          isRunning: false,
        });
      }
    }
  }

  private startLobbyCountdownInterval(match: BRMatch) {
    if (match.countdownInterval) clearInterval(match.countdownInterval);

    match.countdownInterval = setInterval(() => {
      match.countdown--;
      this.broadcast(match.matchId, "lobby_countdown", {
        countdown: match.countdown,
        isRunning: true,
      });

      if (match.countdown <= 0) {
        this.stopLobbyCountdown(match);
        void this.startMatch(match.matchId);
      }
    }, 1000);
  }

  private stopLobbyCountdown(match: BRMatch) {
    if (match.countdownInterval) {
      clearInterval(match.countdownInterval);
      match.countdownInterval = undefined;
    }
    match.countdown = 60;
  }

  setPlayerReady(matchId: string, userId: string, isReady: boolean) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "WAITING") return;

    const player = match.players.find((p) => p.userId === userId);
    if (player) {
      player.isReady = isReady;
    }

    // Réévaluer le compte à rebours
    this.checkLobbyCountdown(matchId);

    // Diffuser la mise à jour
    this.broadcast(matchId, "lobby_update", {
      players: this.getPlayersState(match),
      countdown: match.countdown,
      isCountdownRunning: !!match.countdownInterval,
    });
  }

  private async startMatch(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match) return;

    // Pruner les joueurs hors ligne avant de commencer le match
    const offlinePlayers = match.players.filter((p) => !p.isOnline);
    match.players = match.players.filter((p) => p.isOnline);

    if (offlinePlayers.length > 0) {
      const offlineUserIds = offlinePlayers.map((p) => p.userId);
      await prisma.battleRoyalePlayer
        .deleteMany({
          where: {
            matchId,
            userId: { in: offlineUserIds },
          },
        })
        .catch(console.error);
    }

    // Si moins de 2 joueurs connectés restants, on repasse en attente
    if (match.players.length < 2) {
      match.status = "WAITING";
      this.broadcast(matchId, "lobby_update", {
        players: this.getPlayersState(match),
        countdown: match.countdown,
        isCountdownRunning: !!match.countdownInterval,
      });
      return;
    }

    match.status = "PLAYING";
    match.currentRound = 0;

    // Mettre à jour en DB
    await prisma.battleRoyaleMatch.update({
      where: { id: matchId },
      data: { status: "PLAYING" },
    });

    this.broadcast(matchId, "game_start", { matchId });

    // Lancer le premier round
    void this.nextRound(matchId);
  }

  private async nextRound(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") return;

    match.currentRound++;

    // Réinitialiser les choix temporaires des joueurs
    match.players.forEach((p) => {
      p.selectedPropositionId = null;
      p.lastAnswerCorrect = null;
      p.lastAnswerTime = null;
    });

    // 1. Déterminer la difficulté
    let targetDifficulty = 1;
    if (match.currentRound >= 16) targetDifficulty = 4;
    else if (match.currentRound >= 11) targetDifficulty = 3;
    else if (match.currentRound >= 6) targetDifficulty = 2;

    // 2. Sélectionner une question aléatoire non encore utilisée
    let question = await this.fetchRandomQuestion(targetDifficulty, match.usedQuestionIds);
    if (!question) {
      // Si aucune question trouvée pour cette difficulté, tenter n'importe laquelle
      question = await this.fetchRandomQuestion(undefined, match.usedQuestionIds);
    }

    if (!question) {
      // Plus aucune question dans la base de données... Fin de partie forcée
      void this.endMatch(matchId, null);
      return;
    }

    match.usedQuestionIds.push(question.id);
    match.currentQuestionId = question.id;

    // Extraire les données de propositions
    const rawData = question.data as any;
    const propositions = rawData?.propositions || [];
    const answerId = rawData?.response || null;
    const commentaire = rawData?.commentaire || "";

    match.currentQuestionAnswer = answerId;
    match.currentQuestionCommentaire = commentaire;
    match.currentQuestionStart = new Date();

    // Calculer le temps shrinking
    // Débute à 20s, diminue de 2s toutes les 3 questions, minimum 5s
    const step = Math.floor((match.currentRound - 1) / 3);
    match.currentQuestionDuration = Math.max(5, 20 - step * 2);

    // Préparer la question sans la réponse pour le client
    match.currentQuestion = {
      id: question.id,
      libelle: rawData?.libelle || "Question sans titre",
      propositions: propositions.map((p: any) => ({
        id: p.id,
        value: p.value,
        img: p.img || "",
      })),
      img: question.picture || rawData?.img || "",
      themes: rawData?.theme || [],
    };

    // Mettre à jour en DB
    await prisma.battleRoyaleMatch.update({
      where: { id: matchId },
      data: {
        currentRound: match.currentRound,
        currentQuestionId: question.id,
        currentQuestionStart: match.currentQuestionStart,
        currentQuestionDuration: match.currentQuestionDuration,
      },
    });

    // Diffuser la question
    this.broadcast(matchId, "new_question", {
      round: match.currentRound,
      question: match.currentQuestion,
      duration: match.currentQuestionDuration,
      endTime: Date.now() + match.currentQuestionDuration * 1000,
    });

    // Lancer le timer de fin de round
    match.roundTimer = setTimeout(() => {
      void this.resolveRound(matchId);
    }, match.currentQuestionDuration * 1000);
  }

  private async resolveRound(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") return;

    if (match.roundTimer) clearTimeout(match.roundTimer);

    const correctResponseId = match.currentQuestionAnswer;
    const roundIndex = match.currentRound;

    const roundResults: {
      userId: string;
      name: string;
      livesBefore: number;
      livesAfter: number;
      answered: boolean;
      correct: boolean;
      eliminated: boolean;
    }[] = [];

    // 1. Déduire les vies des joueurs incorrects ou n'ayant pas répondu
    for (const player of match.players) {
      if (player.lives <= 0) continue; // Déjà éliminé

      const answered = player.lastAnsweredRound === roundIndex;
      const correct = answered && player.selectedPropositionId === correctResponseId;

      if (correct) {
        player.correctStreak = (player.correctStreak || 0) + 1;
        player.maxCorrectStreak = Math.max(player.maxCorrectStreak || 0, player.correctStreak);
      } else {
        player.correctStreak = 0;
      }

      const livesBefore = player.lives;
      let livesAfter = livesBefore;

      if (!correct) {
        livesAfter = Math.max(0, livesBefore - 1);
        player.lives = livesAfter;

        if (livesAfter === 0) {
          player.eliminatedAtRound = roundIndex;
        }
      }

      // Distribuer de l'XP de participation
      const baseXP = correct ? 15 : 5;
      player.xpEarned += baseXP;

      roundResults.push({
        userId: player.userId,
        name: player.name,
        livesBefore,
        livesAfter,
        answered,
        correct,
        eliminated: livesAfter === 0,
      });

      // Mettre à jour en DB pour ce joueur
      await prisma.battleRoyalePlayer.update({
        where: {
          matchId_userId: { matchId, userId: player.userId },
        },
        data: {
          lives: livesAfter,
          eliminatedAtRound: player.eliminatedAtRound,
          xpEarned: player.xpEarned,
          lastAnsweredRound: player.lastAnsweredRound,
          lastAnswerCorrect: correct,
          lastAnswerTime: player.lastAnswerTime,
        },
      });

      // Ajouter de l'XP globale au profil de l'utilisateur
      await prisma.userProgress
        .update({
          where: { userId: player.userId },
          data: {
            xp: { increment: baseXP },
          },
        })
        .catch(console.error);
    }

    // Trouver le joueur ayant répondu correctement le plus rapidement
    const correctPlayers = match.players.filter(
      (p) =>
        p.lastAnsweredRound === roundIndex &&
        p.lastAnswerCorrect === true &&
        p.lastAnswerTime !== null,
    );

    let fastestPlayer: { userId: string; name: string; timeTaken: number } | null = null;
    if (correctPlayers.length > 0 && match.currentQuestionStart) {
      correctPlayers.sort((a, b) => a.lastAnswerTime!.getTime() - b.lastAnswerTime!.getTime());
      const fastest = correctPlayers[0]!;
      const timeTaken = Math.max(
        0,
        (fastest.lastAnswerTime!.getTime() - match.currentQuestionStart.getTime()) / 1000,
      );
      fastestPlayer = {
        userId: fastest.userId,
        name: fastest.name,
        timeTaken,
      };
    }

    // 2. Diffuser les résultats du round
    this.broadcast(matchId, "round_ended", {
      round: roundIndex,
      correctAnswerId: correctResponseId,
      commentaire: match.currentQuestionCommentaire,
      results: roundResults,
      fastestPlayer,
    });

    // 3. Vérifier les conditions de fin de match
    const survivors = match.players.filter((p) => p.lives > 0);

    if (survivors.length === 1) {
      // 1 survivant restant -> Victoire !
      void this.endMatch(matchId, survivors[0]!.userId);
    } else if (survivors.length === 0) {
      // Personne n'a survécu. On cherche le vainqueur parmi les derniers éliminés de ce round
      // Critère : vitesse de réponse de la bonne réponse, ou juste vitesse de réponse si tous faux
      const lastRoundEliminated = match.players.filter((p) => p.eliminatedAtRound === roundIndex);

      let winnerId: string | null = null;

      // Essayer de trouver celui qui a répondu juste mais est mort (ne devrait pas arriver si lives > 0, mais au cas où)
      const correctAnswers = lastRoundEliminated.filter((p) => p.lastAnswerCorrect === true);

      if (correctAnswers.length > 0) {
        // Le plus rapide à avoir répondu juste
        correctAnswers.sort(
          (a, b) => (a.lastAnswerTime?.getTime() || 0) - (b.lastAnswerTime?.getTime() || 0),
        );
        winnerId = correctAnswers[0]!.userId;
      } else {
        // Tous faux. Le plus rapide à avoir répondu
        const answeredPlayers = lastRoundEliminated.filter((p) => p.lastAnswerTime !== null);
        if (answeredPlayers.length > 0) {
          answeredPlayers.sort(
            (a, b) => (a.lastAnswerTime?.getTime() || 0) - (b.lastAnswerTime?.getTime() || 0),
          );
          winnerId = answeredPlayers[0]!.userId;
        } else {
          // Aucun n'a répondu
          winnerId = lastRoundEliminated[0]?.userId || null;
        }
      }

      void this.endMatch(matchId, winnerId);
    } else {
      // Plus d'un survivant -> Attendre 7 secondes (affichage correction) puis lancer le round suivant
      match.nextRoundTimeout = setTimeout(() => {
        void this.nextRound(matchId);
      }, 7000);
    }
  }

  private async endMatch(matchId: string, winnerId: string | null) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.status = "FINISHED";
    match.winnerId = winnerId;

    // Trier les joueurs du premier au dernier
    const sortedPlayers = [...match.players].sort((a, b) => {
      // Les joueurs en vie d'abord, classés par vies descendantes
      if (a.lives !== b.lives) {
        return b.lives - a.lives;
      }
      // Puis par round d'élimination descendant
      const aElim = a.eliminatedAtRound || 0;
      const bElim = b.eliminatedAtRound || 0;
      if (aElim !== bElim) {
        return bElim - aElim;
      }
      // En cas d'égalité, par vitesse de dernière réponse
      const aTime = a.lastAnswerTime?.getTime() || Infinity;
      const bTime = b.lastAnswerTime?.getTime() || Infinity;
      return aTime - bTime;
    });

    const totalPlayers = sortedPlayers.length;

    // Calculer la moyenne des LP de départ du lobby
    const validRankPoints = sortedPlayers
      .map((p) => p.rankPoints)
      .filter((pts): pts is number => typeof pts === "number" && !isNaN(pts));
    const lobbyAvgPoints =
      validRankPoints.length > 0
        ? validRankPoints.reduce((sum, pts) => sum + pts, 0) / validRankPoints.length
        : undefined;

    // Attribuer les bonus proportionnels au nombre de joueurs, au classement, et aux rounds joués
    for (let i = 0; i < totalPlayers; i++) {
      const player = sortedPlayers[i]!;
      const rank = i + 1;

      // 1. Calculer le bonus de classement : (totalJoueurs - rang + 1) * 20
      const rankBonus = (totalPlayers - rank + 1) * 20;

      // 2. Calculer le bonus de rounds joués : 10 XP par round
      const roundsPlayed = player.lives > 0 ? match.currentRound : player.eliminatedAtRound || 0;
      const roundsBonus = roundsPlayed * 10;

      const totalBonus = rankBonus + roundsBonus;

      // Mettre à jour l'XP du joueur en mémoire
      player.xpEarned += totalBonus;

      // Mettre à jour en DB pour ce match
      await prisma.battleRoyalePlayer
        .update({
          where: { matchId_userId: { matchId, userId: player.userId } },
          data: { xpEarned: player.xpEarned },
        })
        .catch(console.error);

      // Ajouter de l'XP globale au profil utilisateur
      await prisma.userProgress
        .update({
          where: { userId: player.userId },
          data: { xp: { increment: totalBonus } },
        })
        .catch(console.error);

      // Créditer les pièces du match (une seule fois, sur l'XP totale du match)
      await grantCoins(player.userId, coinsFromXp(player.xpEarned)).catch(console.error);

      // Mettre à jour le classement compétitif (LP et rang)
      const rankUpdate = await updateUserRank(
        player.userId,
        rank,
        totalPlayers,
        lobbyAvgPoints,
      ).catch((err) => {
        console.error("Erreur lors de la mise à jour du rang compétitif:", err);
        return null;
      });

      // Vérifier les exploits Battle Royale
      const unlockedAchievements = await achievementService
        .checkBattleRoyaleAchievements(player.userId, {
          lives: player.lives,
          roundsPlayed: player.lives > 0 ? match.currentRound : player.eliminatedAtRound || 0,
          isWinner: winnerId === player.userId,
          correctStreak: player.maxCorrectStreak || 0,
        })
        .catch((err) => {
          console.error("Erreur lors de la vérification des exploits Battle Royale:", err);
          return [];
        });

      // Stocker les détails du rang et des achievements mis à jour sur l'objet player pour l'utiliser dans la diffusion
      (player as any).rankUpdate = rankUpdate;
      (player as any).unlockedAchievements = unlockedAchievements;
    }

    // Sauvegarder en DB
    await prisma.battleRoyaleMatch.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        winnerId,
      },
    });

    const winnerName = winnerId
      ? match.players.find((p) => p.userId === winnerId)?.name || "Inconnu"
      : null;

    // Diffuser la fin du match avec le classement déjà trié, l'XP mis à jour et les infos LP
    this.broadcast(matchId, "match_finished", {
      winnerId,
      winnerName,
      standings: sortedPlayers.map((p) => {
        const update = (p as any).rankUpdate;
        return {
          userId: p.userId,
          name: p.name,
          lives: p.lives,
          xpEarned: p.xpEarned,
          eliminatedAtRound: p.eliminatedAtRound,
          lpChange: update?.lpChange ?? 0,
          oldPoints: update?.oldPoints ?? 0,
          newPoints: update?.newPoints ?? 0,
          oldRank: update?.oldRank,
          newRank: update?.newRank,
          isPromoted: update?.isPromoted ?? false,
          isDemoted: update?.isDemoted ?? false,
          unlockedAchievements: (p as any).unlockedAchievements ?? [],
        };
      }),
    });

    // Supprimer le match de la mémoire active après 5 minutes pour libérer les ressources
    setTimeout(
      () => {
        delete this.activeMatches[matchId];
      },
      5 * 60 * 1000,
    );
  }

  // --- OUTILS ---

  private async fetchRandomQuestion(
    difficulty?: number,
    excludeIds: number[] = [],
  ): Promise<Question | null> {
    try {
      const excludedThemes = await prisma.questionTheme.findMany({
        where: { battleRoyale: false },
        select: { slug: true },
      });
      const excludedSlugs = excludedThemes.map((t) => t.slug);

      const count = await prisma.question.count({
        where: {
          deleted: false,
          ...(difficulty !== undefined && { difficulty }),
          id: { notIn: excludeIds },
          ...(excludedSlugs.length > 0 && {
            NOT: excludedSlugs.map((slug) => ({
              data: {
                path: ["theme"],
                array_contains: slug,
              },
            })),
          }),
        },
      });

      if (count === 0) return null;

      const skip = Math.floor(Math.random() * count);
      const question = await prisma.question.findFirst({
        where: {
          deleted: false,
          ...(difficulty !== undefined && { difficulty }),
          id: { notIn: excludeIds },
          ...(excludedSlugs.length > 0 && {
            NOT: excludedSlugs.map((slug) => ({
              data: {
                path: ["theme"],
                array_contains: slug,
              },
            })),
          }),
        },
        skip,
      });

      return question;
    } catch (e) {
      console.error("Erreur lors de la sélection de la question:", e);
      return null;
    }
  }

  private broadcast(matchId: string, eventName: string, data: any) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.clients.forEach((client) => {
      try {
        client.push({ event: eventName, data });
      } catch (e) {
        console.error(`Erreur d'envoi SSE au client ${client.userId}:`, e);
      }
    });
  }

  private getPlayersState(match: BRMatch) {
    return match.players.map((p) => ({
      userId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl,
      frameStyleKey: p.frameStyleKey,
      level: p.level,
      lives: p.lives,
      isOnline: p.isOnline,
      isReady: p.isReady,
      hasAnswered: p.lastAnsweredRound === match.currentRound,
      rankPoints: p.rankPoints || 0,
    }));
  }

  /**
   * Retourne un état de la partie adapté à un utilisateur spécifique (pour éviter la triche).
   */
  private getClientSafeMatchState(match: BRMatch, userId: string) {
    const player = match.players.find((p) => p.userId === userId);
    return {
      matchId: match.matchId,
      status: match.status,
      currentRound: match.currentRound,
      currentQuestion: match.currentQuestion,
      currentQuestionDuration: match.currentQuestionDuration,
      currentQuestionEndTime: match.currentQuestionStart
        ? match.currentQuestionStart.getTime() + match.currentQuestionDuration * 1000
        : null,
      myLives: player ? player.lives : 0,
      myStatus: player ? (player.lives <= 0 ? "SPECTATOR" : "ALIVE") : "SPECTATOR",
      players: this.getPlayersState(match),
      countdown: match.countdown,
      isCountdownRunning: !!match.countdownInterval,
    };
  }
}

export const battleRoyaleManager = new BattleRoyaleManager();
