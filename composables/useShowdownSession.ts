import { ref, computed } from "vue";

export const useShowdownSession = () => {
  const matchId = useState<string | null>("sd-match-id", () => null);
  const status = useState<"THEME_SELECTION" | "PLAYING" | "FINISHED" | null>(
    "sd-status",
    () => null,
  );
  const currentRound = useState<number>("sd-current-round", () => 0);
  const phase = useState<number>("sd-phase", () => 1);
  const themePool = useState<any[]>("sd-theme-pool", () => []);
  const selectedThemes = useState<any>("sd-selected-themes", () => null);
  const themeSelectionTurn = useState<string | null>("sd-theme-selection-turn", () => null);
  const themeSelectionTimeLeft = useState<number>("sd-theme-selection-time-left", () => 20);
  const currentQuestion = useState<any>("sd-current-question", () => null);
  const currentQuestionDuration = useState<number>("sd-current-question-duration", () => 20);
  const currentQuestionEndTime = useState<number>("sd-current-question-end-time", () => 0);
  const myHp = useState<number>("sd-my-hp", () => 100);
  const myStreak = useState<number>("sd-my-streak", () => 0);
  const opponent = useState<any>("sd-opponent", () => null);
  const responded = useState<boolean>("sd-responded", () => false);
  const selectedOptionId = useState<number | null>("sd-selected-option-id", () => null);
  const winnerId = useState<string | null>("sd-winner-id", () => null);
  const recoverableMatchId = useState<string | null>("sd-recoverable-match-id", () => null);
  const eventSource = useState<any>("sd-event-source", () => null);
  const isP1 = useState<boolean>("sd-is-p1", () => true);

  const showRoundResults = useState<boolean>("sd-show-round-results", () => false);
  const lastRoundResults = useState<any>("sd-last-round-results", () => null);
  const opponentHasAnswered = useState<boolean>("sd-opponent-has-answered", () => false);

  const isJoined = computed(() => !!matchId.value);

  function disconnect() {
    if (eventSource.value) {
      try {
        eventSource.value.close();
      } catch (e) {
        console.error("Error closing Showdown event source:", e);
      }
      eventSource.value = null;
    }
    matchId.value = null;
    status.value = null;
    currentRound.value = 0;
    phase.value = 1;
    themePool.value = [];
    selectedThemes.value = null;
    themeSelectionTurn.value = null;
    themeSelectionTimeLeft.value = 20;
    currentQuestion.value = null;
    myHp.value = 100;
    myStreak.value = 0;
    opponent.value = null;
    responded.value = false;
    selectedOptionId.value = null;
    winnerId.value = null;
    isP1.value = true;
    showRoundResults.value = false;
    lastRoundResults.value = null;
    opponentHasAnswered.value = false;
  }

  function connect(id: string, userId: string) {
    disconnect();
    matchId.value = id;
    recoverableMatchId.value = null;

    const source = new EventSource(`/api/multiplayer/showdown/events?matchId=${id}`);
    eventSource.value = source as any;

    // Synchronisation initiale
    source.addEventListener("sync_state", (event: any) => {
      const data = JSON.parse(event.data);
      status.value = data.status;
      currentRound.value = data.currentRound;
      phase.value = data.phase;
      themePool.value = data.themePool;
      selectedThemes.value = data.selectedThemes;
      themeSelectionTurn.value = data.themeSelectionTurn;
      themeSelectionTimeLeft.value = data.themeSelectionTimeLeft;
      currentQuestion.value = data.currentQuestion;
      currentQuestionDuration.value = data.currentQuestionDuration;
      currentQuestionEndTime.value = data.currentQuestionEndTime || 0;
      myHp.value = data.myHp;
      myStreak.value = data.myStreak;
      opponent.value = data.opponent;
      responded.value = data.hasAnswered;
      selectedOptionId.value = data.selectedPropositionId;
      isP1.value = data.isP1 ?? true;
    });

    // Mises à jour des joueurs
    source.addEventListener("players_update", (event: any) => {
      const playersList = JSON.parse(event.data);
      const me = playersList.find((p: any) => p.userId === userId);
      const opp = playersList.find((p: any) => p.userId !== userId);

      if (me) {
        myHp.value = me.hp;
        myStreak.value = me.streak;
      }
      if (opp) {
        opponent.value = opp;
      }
    });

    // Synchronisation de la sélection de thèmes
    source.addEventListener("theme_selection_sync", (event: any) => {
      const data = JSON.parse(event.data);
      themeSelectionTurn.value = data.turn;
      themeSelectionTimeLeft.value = data.timeLeft;
      if (data.selectedThemes) {
        selectedThemes.value = data.selectedThemes;
      }
    });

    // Décompte de la draft
    source.addEventListener("theme_selection_countdown", (event: any) => {
      const data = JSON.parse(event.data);
      themeSelectionTimeLeft.value = data.timeLeft;
    });

    // Sélection effectuée
    source.addEventListener("theme_selected_sync", (event: any) => {
      const data = JSON.parse(event.data);
      selectedThemes.value = data.selectedThemes;
    });

    // Début du jeu
    source.addEventListener("game_start", () => {
      status.value = "PLAYING";
      showRoundResults.value = false;
      const route = useRoute();
      if (route.path !== "/series/showdown") {
        void navigateTo("/series/showdown");
      }
    });

    // Transition de phase (toutes les 15 questions)
    source.addEventListener("phase_transition", (event: any) => {
      const data = JSON.parse(event.data);
      phase.value = data.phase;
      themePool.value = data.themePool;
      themeSelectionTurn.value = data.turn;
      status.value = "THEME_SELECTION";
      currentRound.value = 0;
      showRoundResults.value = false;
      lastRoundResults.value = null;
      selectedThemes.value = null;
    });

    // Nouvelle question
    source.addEventListener("new_question", (event: any) => {
      const data = JSON.parse(event.data);
      currentRound.value = data.round;
      currentQuestion.value = data.question;
      currentQuestionDuration.value = data.duration;
      currentQuestionEndTime.value = data.endTime;

      responded.value = false;
      selectedOptionId.value = null;
      showRoundResults.value = false;
      opponentHasAnswered.value = false;
    });

    // Réception d'une réponse de l'adversaire
    source.addEventListener("answer_received", (event: any) => {
      const data = JSON.parse(event.data);
      if (data.userId !== userId) {
        opponentHasAnswered.value = data.hasAnswered;
      }
    });

    // Fin du round (résultats, dégâts, correction)
    source.addEventListener("round_ended", (event: any) => {
      const data = JSON.parse(event.data);
      lastRoundResults.value = data;
      showRoundResults.value = true;

      // Mettre à jour les HP en direct
      if (data.p1.userId === userId) {
        myHp.value = data.p1.hpAfter;
        myStreak.value = data.p1.streak;
        if (opponent.value) {
          opponent.value.hp = data.p2.hpAfter;
          opponent.value.streak = data.p2.streak;
        }
      } else {
        myHp.value = data.p2.hpAfter;
        myStreak.value = data.p2.streak;
        if (opponent.value) {
          opponent.value.hp = data.p1.hpAfter;
          opponent.value.streak = data.p1.streak;
        }
      }
    });

    // Match terminé
    source.addEventListener("match_finished", (event: any) => {
      const data = JSON.parse(event.data);
      winnerId.value = data.winnerId;
      lastRoundResults.value = data; // Contient aussi les détails de score finaux

      setTimeout(() => {
        showRoundResults.value = false;
        status.value = "FINISHED";

        // Fermer la liaison SSE tout en conservant le state local pour le podium
        if (eventSource.value) {
          try {
            eventSource.value.close();
          } catch (e) {}
          eventSource.value = null;
        }
      }, 3500);
    });
  }

  async function checkActiveSession() {
    try {
      const res = await $fetch<{ matchId: string | null }>(
        "/api/multiplayer/showdown/active-match",
      );
      if (res && res.matchId) {
        if (matchId.value !== res.matchId) {
          recoverableMatchId.value = res.matchId;
        }
      } else {
        recoverableMatchId.value = null;
      }
    } catch (e) {
      console.error("Error checking active Showdown session:", e);
    }
  }

  return {
    matchId,
    status,
    currentRound,
    phase,
    themePool,
    selectedThemes,
    themeSelectionTurn,
    themeSelectionTimeLeft,
    currentQuestion,
    currentQuestionDuration,
    currentQuestionEndTime,
    myHp,
    myStreak,
    opponent,
    responded,
    selectedOptionId,
    winnerId,
    recoverableMatchId,
    isP1,
    isJoined,
    showRoundResults,
    lastRoundResults,
    opponentHasAnswered,
    connect,
    disconnect,
    checkActiveSession,
  };
};
