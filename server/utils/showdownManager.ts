import prisma from "~/lib/prisma";
import type { Question } from "@prisma/client";
import { updateShowdownUserRank } from "./showdownRankHelper";

export interface ShowdownPlayerInMemory {
  userId: string;
  name: string;
  avatar: string;
  level: number;
  hp: number;
  xpEarned: number;
  isOnline: boolean;
  streak: number; // Combo : bonnes réponses consécutives en premier
  lastAnsweredRound: number;
  lastAnswerCorrect: boolean | null;
  lastAnswerTime: Date | null;
  selectedPropositionId: number | null;
  rankPoints: number;
}

export interface ShowdownMatchInMemory {
  matchId: string;
  status: "THEME_SELECTION" | "PLAYING" | "FINISHED";
  currentRound: number; // 0 à 15 (dans la phase actuelle)
  lastResolvedRound: number; // Dernier round dont les dégâts ont été appliqués (anti double-résolution)
  phase: number; // 1, 2, 3...
  themePool: { name: string; slug: string; picture: string }[]; // 10 thèmes proposés
  selectedThemes: {
    p1: string[]; // Thèmes choisis par le Joueur 1
    p2: string[]; // Thèmes choisis par le Joueur 2
    random: string; // Thème choisi aléatoirement par le serveur
  } | null;
  themeSelectionTurn: string | null; // userId du joueur actif pour choisir
  themeSelectionTimeLeft: number; // Compte à rebours de 10s
  questionSequence: string[]; // Séquence de 15 thèmes (slugs)
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
  currentQuestionStart: Date | null; // Moment où la question est affichée (début de la lecture)
  currentQuestionReadingDuration: number; // Temps de lecture (en s) avant l'ouverture des réponses
  currentQuestionAnswerStart: Date | null; // Moment où les réponses s'ouvrent (= start + lecture)
  currentQuestionDuration: number; // Fenêtre de réponse (en s), une fois la lecture terminée
  winnerId: string | null;
  players: ShowdownPlayerInMemory[];
  usedQuestionIds: number[];
  clients: { userId: string; push: (message: { event: string; data: any }) => void }[];
  themeSelectionTimer?: NodeJS.Timeout;
  roundTimer?: NodeJS.Timeout;
  nextRoundTimeout?: NodeJS.Timeout;
}

interface QueueEntry {
  userId: string;
  name: string;
  level: number;
  rankPoints: number;
  joinedAt: Date;
}

class ShowdownManager {
  private activeMatches: Record<string, ShowdownMatchInMemory> = {};
  private matchmakingQueue: QueueEntry[] = [];

  constructor() {
    void this.cleanupOrphanedMatches();
  }

  private async cleanupOrphanedMatches() {
    try {
      await prisma.showdownMatch.updateMany({
        where: {
          status: { in: ["WAITING", "THEME_SELECTION", "PLAYING"] },
          createdAt: { lt: new Date(Date.now() - 3600 * 1000) }, // plus de 1h
        },
        data: {
          status: "FINISHED",
        },
      });
    } catch (e) {
      console.error("Erreur lors du nettoyage des matchs orphelins (Showdown):", e);
    }
  }

  private async deleteMatch(matchId: string) {
    const match = this.activeMatches[matchId];
    if (match) {
      if (match.themeSelectionTimer) clearInterval(match.themeSelectionTimer);
      if (match.roundTimer) clearTimeout(match.roundTimer);
      if (match.nextRoundTimeout) clearTimeout(match.nextRoundTimeout);
      delete this.activeMatches[matchId];
    }

    try {
      await prisma.showdownMatch.delete({
        where: { id: matchId },
      });
    } catch (e) {
      console.error(`Erreur suppression match ${matchId} en DB (Showdown):`, e);
    }
  }

  // --- MATCHMAKING ---

  async joinQueue(
    user: { id: string; name: string },
    level: number,
  ): Promise<{ status: "searching" | "matched"; matchId?: string }> {
    // 1. Si le joueur a déjà une partie active, le reconnecter
    const activeMatch = Object.values(this.activeMatches).find(
      (m) => m.players.some((p) => p.userId === user.id) && m.status !== "FINISHED",
    );
    if (activeMatch) {
      return { status: "matched", matchId: activeMatch.matchId };
    }

    // 2. Si déjà dans la file d'attente, retourner l'état de recherche
    if (this.matchmakingQueue.some((q) => q.userId === user.id)) {
      return { status: "searching" };
    }

    // 3. Récupérer les LP compétitifs
    const rank = await prisma.showdownRank.findUnique({
      where: { userId: user.id },
    });
    const rankPoints = rank?.points || 0;

    // 4. Ajouter à la file d'attente
    this.matchmakingQueue.push({
      userId: user.id,
      name: user.name,
      level,
      rankPoints,
      joinedAt: new Date(),
    });

    // 5. Exécuter le matching de manière asynchrone
    void this.checkMatchmaking();

    return { status: "searching" };
  }

  leaveQueue(userId: string): boolean {
    const initialLength = this.matchmakingQueue.length;
    this.matchmakingQueue = this.matchmakingQueue.filter((q) => q.userId !== userId);
    return this.matchmakingQueue.length < initialLength;
  }

  getQueueStatus(userId: string): { status: "searching" | "matched" | "none"; matchId?: string } {
    const activeMatch = Object.values(this.activeMatches).find(
      (m) => m.players.some((p) => p.userId === userId) && m.status !== "FINISHED",
    );
    if (activeMatch) {
      return { status: "matched", matchId: activeMatch.matchId };
    }

    if (this.matchmakingQueue.some((q) => q.userId === userId)) {
      return { status: "searching" };
    }

    return { status: "none" };
  }

  private async checkMatchmaking() {
    if (this.matchmakingQueue.length < 2) return;

    let i = 0;
    while (i < this.matchmakingQueue.length) {
      const p1 = this.matchmakingQueue[i]!;
      let bestMatchIdx = -1;
      let minDiff = Infinity;

      for (let j = 0; j < this.matchmakingQueue.length; j++) {
        if (i === j) continue;
        const p2 = this.matchmakingQueue[j]!;
        const diff = Math.abs(p1.rankPoints - p2.rankPoints);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatchIdx = j;
        }
      }

      if (bestMatchIdx !== -1) {
        const p2 = this.matchmakingQueue[bestMatchIdx]!;
        const now = Date.now();
        const p1Wait = now - p1.joinedAt.getTime();
        const p2Wait = now - p2.joinedAt.getTime();

        // Matching si LP proche (<= 200) ou si l'un d'eux attend depuis plus de 5 secondes
        if (minDiff <= 200 || p1Wait > 5000 || p2Wait > 5000) {
          // Retirer de la queue (en retirant le plus grand index d'abord pour préserver les indices)
          this.matchmakingQueue.splice(Math.max(i, bestMatchIdx), 1);
          this.matchmakingQueue.splice(Math.min(i, bestMatchIdx), 1);

          // Créer la partie
          await this.createMatch(p1, p2);

          // Réinitialiser la recherche suite à la modification du tableau
          i = 0;
          continue;
        }
      }
      i++;
    }
  }

  private async createMatch(p1: QueueEntry, p2: QueueEntry) {
    try {
      // 1. Enregistrer dans la DB
      const dbMatch = await prisma.showdownMatch.create({
        data: {
          status: "THEME_SELECTION",
          currentRound: 0,
          players: {
            create: [
              { userId: p1.userId, hp: 100 },
              { userId: p2.userId, hp: 100 },
            ],
          },
        },
      });

      // 2. Récupérer 10 thèmes uniques au hasard pour la phase de draft
      const allThemes = await prisma.questionTheme.findMany();
      // Mélanger et prendre 10
      const shuffledThemes = allThemes.sort(() => 0.5 - Math.random());
      const selectedPool = shuffledThemes.slice(0, 10).map((t) => ({
        name: t.name,
        slug: t.slug,
        picture: t.picture || "",
      }));

      // 3. Initialiser en mémoire
      const match: ShowdownMatchInMemory = {
        matchId: dbMatch.id,
        status: "THEME_SELECTION",
        currentRound: 0,
        lastResolvedRound: -1,
        phase: 1,
        themePool: selectedPool,
        selectedThemes: {
          p1: [],
          p2: [],
          random: "",
        },
        themeSelectionTurn: p1.userId, // Le premier joueur commence à choisir
        themeSelectionTimeLeft: 20,
        questionSequence: [],
        currentQuestionId: null,
        currentQuestion: null,
        currentQuestionAnswer: null,
        currentQuestionCommentaire: "",
        currentQuestionStart: null,
        currentQuestionReadingDuration: 0,
        currentQuestionAnswerStart: null,
        currentQuestionDuration: 20, // 20 secondes pour répondre par défaut
        winnerId: null,
        players: [
          {
            userId: p1.userId,
            name: p1.name,
            avatar: "🎮",
            level: p1.level,
            hp: 100,
            xpEarned: 0,
            isOnline: false,
            streak: 0,
            lastAnsweredRound: -1,
            lastAnswerCorrect: null,
            lastAnswerTime: null,
            selectedPropositionId: null,
            rankPoints: p1.rankPoints,
          },
          {
            userId: p2.userId,
            name: p2.name,
            avatar: "🎮",
            level: p2.level,
            hp: 100,
            xpEarned: 0,
            isOnline: false,
            streak: 0,
            lastAnsweredRound: -1,
            lastAnswerCorrect: null,
            lastAnswerTime: null,
            selectedPropositionId: null,
            rankPoints: p2.rankPoints,
          },
        ],
        usedQuestionIds: [],
        clients: [],
      };

      this.activeMatches[match.matchId] = match;

      // Démarrer le compte à rebours de choix de thèmes
      this.startThemeSelectionCountdown(match.matchId);
    } catch (e) {
      console.error("Erreur lors de la création du match Showdown:", e);
    }
  }

  // --- EVENTS & SYNC ---

  getMatch(matchId: string): ShowdownMatchInMemory | undefined {
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
   * Retourne l'ID de la partie active (non terminée) en mémoire pour cet
   * utilisateur, sinon null.
   */
  getActiveMatchIdForUser(userId: string): string | null {
    const match = Object.values(this.activeMatches).find(
      (m) => m.players.some((p) => p.userId === userId) && m.status !== "FINISHED",
    );
    return match ? match.matchId : null;
  }

  async registerClient(
    matchId: string,
    userId: string,
    pushFn: (msg: { event: string; data: any }) => void,
  ) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.clients = match.clients.filter((c) => c.userId !== userId);
    match.clients.push({ userId, push: pushFn });

    const player = match.players.find((p) => p.userId === userId);
    if (player) {
      player.isOnline = true;
    }

    // Synchronisation immédiate
    pushFn({
      event: "sync_state",
      data: this.getClientSafeMatchState(match, userId),
    });

    // Diffuser la mise à jour aux autres
    this.broadcast(matchId, "players_update", this.getClientSafePlayers(match));
  }

  unregisterClient(matchId: string, userId: string) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.clients = match.clients.filter((c) => c.userId !== userId);
    const player = match.players.find((p) => p.userId === userId);
    if (player) {
      player.isOnline = false;
    }

    // Supprimer le match si plus aucun joueur en ligne et non terminé
    const onlineCount = match.players.filter((p) => p.isOnline).length;
    if (match.status !== "FINISHED" && onlineCount === 0) {
      void this.deleteMatch(matchId);
      return;
    }

    this.broadcast(matchId, "players_update", this.getClientSafePlayers(match));
  }

  private broadcast(matchId: string, eventName: string, data: any) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.clients.forEach((c) => {
      try {
        c.push({ event: eventName, data });
      } catch (e) {
        console.error(`Erreur d'envoi SSE Showdown à ${c.userId}:`, e);
      }
    });
  }

  private getClientSafePlayers(match: ShowdownMatchInMemory) {
    return match.players.map((p) => ({
      userId: p.userId,
      name: p.name,
      avatar: p.avatar,
      level: p.level,
      hp: p.hp,
      isOnline: p.isOnline,
      streak: p.streak,
      rankPoints: p.rankPoints,
    }));
  }

  private getClientSafeMatchState(match: ShowdownMatchInMemory, userId: string) {
    const player = match.players.find((p) => p.userId === userId);
    const opponent = match.players.find((p) => p.userId !== userId);
    return {
      matchId: match.matchId,
      status: match.status,
      currentRound: match.currentRound,
      phase: match.phase,
      themePool: match.themePool,
      selectedThemes: match.selectedThemes,
      themeSelectionTurn: match.themeSelectionTurn,
      themeSelectionTimeLeft: match.themeSelectionTimeLeft,
      currentQuestion: match.currentQuestion,
      currentQuestionDuration: match.currentQuestionDuration,
      currentQuestionReadingDuration: match.currentQuestionReadingDuration,
      currentQuestionAnswerStartTime: match.currentQuestionAnswerStart
        ? match.currentQuestionAnswerStart.getTime()
        : null,
      currentQuestionEndTime: match.currentQuestionAnswerStart
        ? match.currentQuestionAnswerStart.getTime() + match.currentQuestionDuration * 1000
        : null,
      myHp: player ? player.hp : 0,
      myStreak: player ? player.streak : 0,
      opponent: opponent
        ? {
            userId: opponent.userId,
            name: opponent.name,
            avatar: opponent.avatar,
            level: opponent.level,
            hp: opponent.hp,
            isOnline: opponent.isOnline,
            streak: opponent.streak,
            rankPoints: opponent.rankPoints,
          }
        : null,
      hasAnswered: player ? player.lastAnsweredRound === match.currentRound : false,
      selectedPropositionId: player ? player.selectedPropositionId : null,
      winnerId: match.winnerId,
      isP1: match.players[0]?.userId === userId,
    };
  }

  // --- THEME SELECTION LOGIC ---

  private startThemeSelectionCountdown(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "THEME_SELECTION") return;

    if (match.themeSelectionTimer) clearInterval(match.themeSelectionTimer);

    match.themeSelectionTimeLeft = 20;
    this.broadcast(matchId, "theme_selection_sync", {
      turn: match.themeSelectionTurn,
      timeLeft: match.themeSelectionTimeLeft,
    });

    match.themeSelectionTimer = setInterval(() => {
      match.themeSelectionTimeLeft--;
      this.broadcast(matchId, "theme_selection_countdown", {
        timeLeft: match.themeSelectionTimeLeft,
      });

      if (match.themeSelectionTimeLeft <= 0) {
        clearInterval(match.themeSelectionTimer);
        this.autoSelectTheme(matchId);
      }
    }, 1000);
  }

  private autoSelectTheme(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "THEME_SELECTION") return;

    const chosenSlugs = [...(match.selectedThemes?.p1 || []), ...(match.selectedThemes?.p2 || [])];
    const availableThemes = match.themePool.filter((t) => !chosenSlugs.includes(t.slug));

    if (availableThemes.length > 0) {
      const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]!;
      this.selectTheme(matchId, match.themeSelectionTurn!, randomTheme.slug);
    }
  }

  selectTheme(matchId: string, userId: string, themeSlug: string): boolean {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "THEME_SELECTION") return false;
    if (match.themeSelectionTurn !== userId) return false;

    // S'assurer que le thème fait partie de la liste et n'a pas déjà été choisi
    const themeObj = match.themePool.find((t) => t.slug === themeSlug);
    if (!themeObj) return false;

    const p1Choices = match.selectedThemes?.p1 || [];
    const p2Choices = match.selectedThemes?.p2 || [];

    if (p1Choices.includes(themeSlug) || p2Choices.includes(themeSlug)) {
      return false;
    }

    if (match.players[0]!.userId === userId) {
      p1Choices.push(themeSlug);
    } else {
      p2Choices.push(themeSlug);
    }

    match.selectedThemes = {
      p1: p1Choices,
      p2: p2Choices,
      random: "",
    };

    if (match.themeSelectionTimer) clearInterval(match.themeSelectionTimer);

    // Évaluer le prochain tour
    const totalSelected = p1Choices.length + p2Choices.length;

    // Ordre de draft : P1 -> P2 -> P1 -> P2 (ou roles inversés si phase paire)
    const startingPlayerIdx = (match.phase - 1) % 2; // 0 ou 1
    const p1 = match.players[startingPlayerIdx]!;
    const p2 = match.players[1 - startingPlayerIdx]!;

    if (totalSelected === 1) {
      // Tour 2 : p2 choisit
      match.themeSelectionTurn = p2.userId;
      this.startThemeSelectionCountdown(matchId);
    } else if (totalSelected === 2) {
      // Tour 3 : p1 choisit
      match.themeSelectionTurn = p1.userId;
      this.startThemeSelectionCountdown(matchId);
    } else if (totalSelected === 3) {
      // Tour 4 : p2 choisit
      match.themeSelectionTurn = p2.userId;
      this.startThemeSelectionCountdown(matchId);
    } else if (totalSelected === 4) {
      // Fin de la draft : Choisir un thème aléatoire parmi les 6 restants
      const remaining = match.themePool.filter(
        (t) => !p1Choices.includes(t.slug) && !p2Choices.includes(t.slug),
      );
      const randomTheme = remaining[Math.floor(Math.random() * remaining.length)]!;
      match.selectedThemes.random = randomTheme.slug;

      // Déterminer l'ordre des thèmes pour les questions
      // P1_T1, P2_T1, P1_T2, P2_T2, RAND
      // p1 et p2 font référence au starter et au suiveur de cette phase
      const p1Themes = match.players[0]!.userId === p1.userId ? p1Choices : p2Choices;
      const p2Themes = match.players[0]!.userId === p2.userId ? p1Choices : p2Choices;

      const p1_t1 = p1Themes[0] || "";
      const p1_t2 = p1Themes[1] || "";
      const p2_t1 = p2Themes[0] || "";
      const p2_t2 = p2Themes[1] || "";
      const rand = match.selectedThemes.random;

      // Motif [P1_T1, P2_T1, P1_T2, P2_T2, RAND] répété 3 fois
      const seq: string[] = [];
      for (let k = 0; k < 3; k++) {
        seq.push(p1_t1, p2_t1, p1_t2, p2_t2, rand);
      }
      match.questionSequence = seq;

      // Passer en phase de jeu
      match.status = "PLAYING";
      match.currentRound = 0;
      match.themeSelectionTurn = null;

      // Sauvegarder l'état en DB
      void prisma.showdownMatch
        .update({
          where: { id: matchId },
          data: { status: "PLAYING" },
        })
        .catch(console.error);

      this.broadcast(matchId, "game_start", { matchId });

      // Lancer le premier round avec un petit délai de transition de 2s
      setTimeout(() => {
        void this.nextRound(matchId);
      }, 2000);
    }

    // Diffuser la sélection effectuée
    this.broadcast(matchId, "theme_selected_sync", {
      selectedThemes: match.selectedThemes,
    });

    return true;
  }

  // --- GAMEPLAY FLOW ---

  private async nextRound(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") return;

    match.currentRound++;

    // Si on a dépassé 15 questions, on relance une draft de thèmes !
    if (match.currentRound > 15) {
      match.phase++;
      match.currentRound = 0;
      match.status = "THEME_SELECTION";
      match.selectedThemes = { p1: [], p2: [], random: "" };
      match.questionSequence = [];

      // Reprendre 10 thèmes aléatoires
      const allThemes = await prisma.questionTheme.findMany();
      const shuffledThemes = allThemes.sort(() => 0.5 - Math.random());
      match.themePool = shuffledThemes.slice(0, 10).map((t) => ({
        name: t.name,
        slug: t.slug,
        picture: t.picture || "",
      }));

      // Inverser le joueur qui commence la sélection
      const startingPlayerIdx = (match.phase - 1) % 2; // 0 ou 1
      match.themeSelectionTurn = match.players[startingPlayerIdx]!.userId;

      // Mettre à jour en DB
      await prisma.showdownMatch
        .update({
          where: { id: matchId },
          data: { status: "THEME_SELECTION", currentRound: 0 },
        })
        .catch(console.error);

      // Diffuser la transition de phase
      this.broadcast(matchId, "phase_transition", {
        phase: match.phase,
        themePool: match.themePool,
        turn: match.themeSelectionTurn,
      });

      this.startThemeSelectionCountdown(matchId);
      return;
    }

    // Réinitialiser les réponses des joueurs
    match.players.forEach((p) => {
      p.selectedPropositionId = null;
      p.lastAnswerCorrect = null;
      p.lastAnswerTime = null;
    });

    // 1. Déterminer la difficulté progressive (1 à 5 sur les 15 questions)
    // R1-3 -> diff 1, R4-6 -> diff 2, R7-9 -> diff 3, R10-12 -> diff 4, R13-15 -> diff 5
    const step = Math.floor((match.currentRound - 1) / 3);
    const targetDifficulty = Math.min(5, Math.max(1, step + 1));

    // 2. Récupérer le thème de la question en cours
    const activeThemeSlug = match.questionSequence[match.currentRound - 1]!;

    // 3. Charger la question
    let question = await this.fetchThemeQuestion(
      activeThemeSlug,
      targetDifficulty,
      match.usedQuestionIds,
    );
    if (!question) {
      // Fallback sans difficulté
      question = await this.fetchThemeQuestion(activeThemeSlug, undefined, match.usedQuestionIds);
    }

    if (!question) {
      // Si aucune question trouvée dans ce thème, prendre n'importe quelle question aléatoire
      const randomQ = await prisma.question.findFirst({
        where: { deleted: false, id: { notIn: match.usedQuestionIds } },
      });
      question = randomQ;
    }

    if (!question) {
      // Plus aucune question disponible : match nul forcé
      void this.endMatch(matchId, null);
      return;
    }

    match.usedQuestionIds.push(question.id);
    match.currentQuestionId = question.id;

    const rawData = question.data as any;
    const propositions = rawData?.propositions || [];
    const answerId = rawData?.response || null;
    const commentaire = rawData?.commentaire || "";

    match.currentQuestionAnswer = answerId;
    match.currentQuestionCommentaire = commentaire;

    // Temps de lecture : laisse à chacun le temps de lire la question avant que le
    // chrono de rapidité ne démarre, pour que la vitesse de lecture ne pénalise pas.
    // Calculé selon la longueur du texte (énoncé + propositions), borné entre 3 et 9s.
    const libelleText: string = rawData?.libelle || "";
    const propositionsText: number = propositions.reduce(
      (sum: number, p: any) => sum + (p?.value?.length || 0),
      0,
    );
    const totalTextLength = libelleText.length + propositionsText;
    let readingDuration = Math.ceil(totalTextLength / 20);
    if (question.picture || rawData?.img) readingDuration += 2; // image à observer
    readingDuration = Math.min(9, Math.max(3, readingDuration));

    // Le round dure 20s au total : la lecture est prélevée sur ce budget, le reste
    // constitue la fenêtre de réponse (au moins 11s).
    const totalRoundDuration = 20;
    const answerDuration = totalRoundDuration - readingDuration;

    const now = new Date();
    match.currentQuestionStart = now;
    match.currentQuestionReadingDuration = readingDuration;
    match.currentQuestionAnswerStart = new Date(now.getTime() + readingDuration * 1000);
    match.currentQuestionDuration = answerDuration; // Fenêtre de réponse (après lecture)

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
    await prisma.showdownMatch
      .update({
        where: { id: matchId },
        data: {
          currentRound: match.currentRound,
          currentQuestionId: question.id,
          currentQuestionStart: match.currentQuestionStart,
          currentQuestionDuration: match.currentQuestionDuration,
        },
      })
      .catch(console.error);

    // Diffuser la question
    const answerStartMs = match.currentQuestionAnswerStart!.getTime();
    this.broadcast(matchId, "new_question", {
      round: match.currentRound,
      themeSlug: activeThemeSlug,
      question: match.currentQuestion,
      duration: match.currentQuestionDuration,
      readingDuration: match.currentQuestionReadingDuration,
      answerStartTime: answerStartMs,
      endTime: answerStartMs + match.currentQuestionDuration * 1000,
    });

    // Lancer le timer : lecture + fenêtre de réponse
    const totalRoundMs =
      (match.currentQuestionReadingDuration + match.currentQuestionDuration) * 1000;
    match.roundTimer = setTimeout(() => {
      void this.resolveRound(matchId);
    }, totalRoundMs);
  }

  private async fetchThemeQuestion(
    themeSlug: string,
    difficulty?: number,
    excludeIds: number[] = [],
  ): Promise<Question | null> {
    try {
      const whereClause = {
        deleted: false,
        id: { notIn: excludeIds },
        data: {
          path: ["theme"],
          array_contains: themeSlug,
        },
        ...(difficulty !== undefined && { difficulty }),
      };

      const count = await prisma.question.count({ where: whereClause });
      if (count === 0) return null;

      const skip = Math.floor(Math.random() * count);
      return await prisma.question.findFirst({
        where: whereClause,
        skip,
      });
    } catch (e) {
      console.error("Erreur lors de la récupération de la question de thème:", e);
      return null;
    }
  }

  submitAnswer(
    matchId: string,
    userId: string,
    propositionId: number,
  ): { success: boolean; message: string } {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") {
      return { success: false, message: "Partie inactive" };
    }

    const player = match.players.find((p) => p.userId === userId);
    if (!player || player.hp <= 0) {
      return { success: false, message: "Vous ne participez pas ou êtes K.O." };
    }

    if (player.lastAnsweredRound === match.currentRound) {
      return { success: false, message: "Vous avez déjà répondu." };
    }

    // Le round a déjà été résolu (timer écoulé ou bonne réponse adverse) :
    // ne plus accepter de réponse tardive pendant la fenêtre de transition.
    if (match.lastResolvedRound === match.currentRound) {
      return { success: false, message: "Le round est terminé." };
    }

    // Phase de lecture : les réponses ne sont pas encore ouvertes.
    if (
      match.currentQuestionAnswerStart &&
      Date.now() < match.currentQuestionAnswerStart.getTime()
    ) {
      return { success: false, message: "Lisez la question avant de répondre." };
    }

    // Si l'adversaire a déjà répondu JUSTE en premier, le round est gelé
    const opponent = match.players.find((p) => p.userId !== userId);
    if (
      opponent &&
      opponent.lastAnsweredRound === match.currentRound &&
      opponent.lastAnswerCorrect === true
    ) {
      return { success: false, message: "L'adversaire a déjà donné la bonne réponse." };
    }

    player.lastAnsweredRound = match.currentRound;
    player.selectedPropositionId = propositionId;
    player.lastAnswerTime = new Date();

    const isCorrect = propositionId === match.currentQuestionAnswer;
    player.lastAnswerCorrect = isCorrect;

    // Diffuser la progression de la réponse
    this.broadcast(matchId, "answer_received", {
      userId,
      hasAnswered: true,
    });

    // Évaluer si le round doit se terminer immédiatement :
    // 1. Si la réponse est correcte, fin du round instantanée (le premier à répondre juste l'emporte)
    if (isCorrect) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      void this.resolveRound(matchId);
      return { success: true, message: "Bonne réponse enregistrée !" };
    }

    // 2. Si les deux joueurs ont répondu (et donc que les deux ont faux, car si un était juste la condition 1 aurait trigger)
    const alivePlayers = match.players.filter((p) => p.hp > 0);
    const answersCount = alivePlayers.filter(
      (p) => p.lastAnsweredRound === match.currentRound,
    ).length;

    if (answersCount >= alivePlayers.length) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      void this.resolveRound(matchId);
    }

    return { success: true, message: "Réponse incorrecte enregistrée." };
  }

  private async resolveRound(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match || match.status !== "PLAYING") return;

    // Empêcher toute double résolution du même round (timer + réponse quasi simultanés,
    // ou réponse tardive durant la fenêtre de transition de 3s) qui appliquerait
    // deux fois les dégâts.
    if (match.lastResolvedRound === match.currentRound) return;
    match.lastResolvedRound = match.currentRound;

    if (match.roundTimer) clearTimeout(match.roundTimer);

    const roundIndex = match.currentRound;
    const correctResponseId = match.currentQuestionAnswer;
    const duration = match.currentQuestionDuration;

    const p1 = match.players[0]!;
    const p2 = match.players[1]!;

    const p1Ans = p1.lastAnsweredRound === roundIndex;
    const p2Ans = p2.lastAnsweredRound === roundIndex;

    const p1Correct = p1Ans && p1.selectedPropositionId === correctResponseId;
    const p2Correct = p2Ans && p2.selectedPropositionId === correctResponseId;

    let p1DamageTaken = 0;
    let p2DamageTaken = 0;

    let p1SpeedRatio = 0;
    let p2SpeedRatio = 0;

    // Calculer les ratios de rapidité (1.0 = instantané, 0.0 = temps écoulé).
    // Le chrono démarre à l'ouverture des réponses (fin de la lecture), pas à
    // l'affichage : la vitesse de lecture n'impacte donc pas le score.
    const answerStartMs =
      match.currentQuestionAnswerStart?.getTime() ?? match.currentQuestionStart?.getTime() ?? 0;
    if (p1Correct && p1.lastAnswerTime && answerStartMs) {
      const timeTaken = (p1.lastAnswerTime.getTime() - answerStartMs) / 1000;
      p1SpeedRatio = Math.max(0, Math.min(1, (duration - timeTaken) / duration));
    }
    if (p2Correct && p2.lastAnswerTime && answerStartMs) {
      const timeTaken = (p2.lastAnswerTime.getTime() - answerStartMs) / 1000;
      p2SpeedRatio = Math.max(0, Math.min(1, (duration - timeTaken) / duration));
    }

    const getComboMultiplier = (streak: number) => {
      if (streak <= 1) return 1.0;
      if (streak === 2) return 1.25;
      if (streak === 3) return 1.5;
      return 2.0; // 4+
    };

    // Cas 1 : Personne n'a répondu juste -> Les deux perdent 5 HP !
    if (!p1Correct && !p2Correct) {
      p1.streak = 0;
      p2.streak = 0;
      p1DamageTaken = 5;
      p2DamageTaken = 5;
    }
    // Cas 2 : P1 est correct (et donc forcément premier correct ou l'autre a faux)
    else if (
      p1Correct &&
      (!p2Correct || (p1.lastAnswerTime?.getTime() || 0) < (p2.lastAnswerTime?.getTime() || 0))
    ) {
      p1.streak++;
      p2.streak = 0;

      // Dégâts infligés à P2
      const mult = getComboMultiplier(p1.streak);
      const baseDmg = 10;
      p2DamageTaken = Math.round(baseDmg * (1 + p1SpeedRatio) * mult);

      // Pénalité supplémentaire de 10 points si P2 a répondu faux (au lieu de timeout)
      if (p2Ans && !p2Correct) {
        p2DamageTaken += 10;
      }

      p1.xpEarned += p1SpeedRatio > 0.8 ? 20 : 15;
    }
    // Cas 3 : P2 est correct
    else if (p2Correct) {
      p2.streak++;
      p1.streak = 0;

      // Dégâts infligés à P1
      const mult = getComboMultiplier(p2.streak);
      const baseDmg = 10;
      p1DamageTaken = Math.round(baseDmg * (1 + p2SpeedRatio) * mult);

      // Pénalité supplémentaire de 10 points si P1 a répondu faux (au lieu de timeout)
      if (p1Ans && !p1Correct) {
        p1DamageTaken += 10;
      }

      p2.xpEarned += p2SpeedRatio > 0.8 ? 20 : 15;
    }

    // Appliquer les dégâts
    p1.hp = Math.max(0, p1.hp - p1DamageTaken);
    p2.hp = Math.max(0, p2.hp - p2DamageTaken);

    // XP de participation de base
    p1.xpEarned += p1Correct ? 5 : 2;
    p2.xpEarned += p2Correct ? 5 : 2;

    // Mettre à jour les HP en base de données de manière asynchrone
    await prisma.showdownPlayer
      .update({
        where: { matchId_userId: { matchId, userId: p1.userId } },
        data: { hp: p1.hp, xpEarned: p1.xpEarned },
      })
      .catch(console.error);

    await prisma.showdownPlayer
      .update({
        where: { matchId_userId: { matchId, userId: p2.userId } },
        data: { hp: p2.hp, xpEarned: p2.xpEarned },
      })
      .catch(console.error);

    // Diffuser les résultats du round
    this.broadcast(matchId, "round_ended", {
      round: roundIndex,
      correctAnswerId: correctResponseId,
      commentaire: match.currentQuestionCommentaire,
      p1: {
        userId: p1.userId,
        selectedOptionId: p1.selectedPropositionId,
        correct: p1Correct,
        hpBefore: p1.hp + p1DamageTaken,
        hpAfter: p1.hp,
        damageTaken: p1DamageTaken,
        streak: p1.streak,
      },
      p2: {
        userId: p2.userId,
        selectedOptionId: p2.selectedPropositionId,
        correct: p2Correct,
        hpBefore: p2.hp + p2DamageTaken,
        hpAfter: p2.hp,
        damageTaken: p2DamageTaken,
        streak: p2.streak,
      },
    });

    // 3. Vérifier les conditions de fin de match (K.O.)
    if (p1.hp <= 0 || p2.hp <= 0) {
      let winnerId: string | null = null;
      if (p1.hp > 0 && p2.hp <= 0) winnerId = p1.userId;
      else if (p2.hp > 0 && p1.hp <= 0) winnerId = p2.userId;
      // Si double K.O., c'est un match nul (winnerId = null)

      void this.endMatch(matchId, winnerId);
    } else {
      // Attendre 3 secondes (bonne réponse mise en évidence) puis lancer le round suivant
      match.nextRoundTimeout = setTimeout(() => {
        void this.nextRound(matchId);
      }, 3000);
    }
  }

  private async endMatch(matchId: string, winnerId: string | null) {
    const match = this.getMatch(matchId);
    if (!match) return;

    match.status = "FINISHED";
    match.winnerId = winnerId;

    const p1 = match.players[0]!;
    const p2 = match.players[1]!;

    // 1. Déterminer les récompenses XP (100 XP vainqueur, 30 XP perdant)
    if (winnerId) {
      const winner = match.players.find((p) => p.userId === winnerId)!;
      const loser = match.players.find((p) => p.userId !== winnerId)!;
      winner.xpEarned += 100;
      loser.xpEarned += 30;
    } else {
      // Match nul
      p1.xpEarned += 50;
      p2.xpEarned += 50;
    }

    // 2. Mettre à jour l'XP globale des utilisateurs
    for (const player of match.players) {
      await prisma.userProgress
        .update({
          where: { userId: player.userId },
          data: { xp: { increment: player.xpEarned } },
        })
        .catch(console.error);
    }

    // 3. Mettre à jour le classement compétitif LP (Elo)
    let p1RankUpdate = null;
    let p2RankUpdate = null;

    if (winnerId) {
      const isP1Winner = p1.userId === winnerId;
      p1RankUpdate = await updateShowdownUserRank(p1.userId, p2.userId, isP1Winner).catch(
        console.error,
      );
      p2RankUpdate = await updateShowdownUserRank(p2.userId, p1.userId, !isP1Winner).catch(
        console.error,
      );
    } else {
      // Si match nul, pas de variation de LP
    }

    // 4. Enregistrer dans la DB
    await prisma.showdownMatch
      .update({
        where: { id: matchId },
        data: {
          status: "FINISHED",
          winnerId,
        },
      })
      .catch(console.error);

    // Diffuser la fin du match
    this.broadcast(matchId, "match_finished", {
      winnerId,
      p1: {
        userId: p1.userId,
        name: p1.name,
        hp: p1.hp,
        xpEarned: p1.xpEarned,
        lpChange: p1RankUpdate?.lpChange ?? 0,
        oldPoints: p1RankUpdate?.oldPoints ?? 0,
        newPoints: p1RankUpdate?.newPoints ?? 0,
        oldRank: p1RankUpdate?.oldRank,
        newRank: p1RankUpdate?.newRank,
        isPromoted: p1RankUpdate?.isPromoted ?? false,
        isDemoted: p1RankUpdate?.isDemoted ?? false,
      },
      p2: {
        userId: p2.userId,
        name: p2.name,
        hp: p2.hp,
        xpEarned: p2.xpEarned,
        lpChange: p2RankUpdate?.lpChange ?? 0,
        oldPoints: p2RankUpdate?.oldPoints ?? 0,
        newPoints: p2RankUpdate?.newPoints ?? 0,
        oldRank: p2RankUpdate?.oldRank,
        newRank: p2RankUpdate?.newRank,
        isPromoted: p2RankUpdate?.isPromoted ?? false,
        isDemoted: p2RankUpdate?.isDemoted ?? false,
      },
    });

    // Supprimer le match de la mémoire active après 5 minutes
    setTimeout(
      () => {
        if (match.themeSelectionTimer) clearInterval(match.themeSelectionTimer);
        if (match.roundTimer) clearTimeout(match.roundTimer);
        if (match.nextRoundTimeout) clearTimeout(match.nextRoundTimeout);
        delete this.activeMatches[matchId];
      },
      5 * 60 * 1000,
    );
  }
}

export const showdownManager = new ShowdownManager();
