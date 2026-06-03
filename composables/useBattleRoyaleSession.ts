import { ref, computed } from "vue";

export const useBattleRoyaleSession = () => {
  const matchId = useState<string | null>("br-match-id", () => null);
  const status = useState<"WAITING" | "PLAYING" | "FINISHED" | null>("br-status", () => null);
  const players = useState<any[]>("br-players", () => []);
  const countdown = useState<number>("br-countdown", () => 60);
  const isCountdownRunning = useState<boolean>("br-countdown-running", () => false);
  const myLives = useState<number>("br-my-lives", () => 3);
  const currentRound = useState<number>("br-current-round", () => 0);
  const currentQuestion = useState<any>("br-current-question", () => null);
  const currentQuestionDuration = useState<number>("br-current-question-duration", () => 20);
  const currentQuestionEndTime = useState<number>("br-current-question-end-time", () => 0);
  const responded = useState<boolean>("br-responded", () => false);
  const selectedOptionId = useState<number | null>("br-selected-option-id", () => null);
  const answersCount = useState<number>("br-answers-count", () => 0);
  const aliveCount = useState<number>("br-alive-count", () => 0);
  const showRoundResults = useState<boolean>("br-show-round-results", () => false);
  const lastRoundResults = useState<any>("br-last-round-results", () => null);
  const winnerId = useState<string | null>("br-winner-id", () => null);
  const winnerName = useState<string | null>("br-winner-name", () => null);
  const standings = useState<any[]>("br-standings", () => []);

  // For storing an active match ID found on server that is not yet connected/resumed
  const recoverableMatchId = useState<string | null>("br-recoverable-match-id", () => null);

  // Keep a single EventSource instance across the app, referenced as a global ref or state
  const eventSource = useState<any>("br-event-source", () => null);

  const isJoined = computed(() => !!matchId.value);
  const isSpectator = computed(() => myLives.value <= 0);

  function disconnect() {
    if (eventSource.value) {
      try {
        eventSource.value.close();
      } catch (e) {
        console.error("Error closing event source:", e);
      }
      eventSource.value = null;
    }
    matchId.value = null;
    status.value = null;
    players.value = [];
    countdown.value = 60;
    isCountdownRunning.value = false;
    myLives.value = 3;
    currentRound.value = 0;
    currentQuestion.value = null;
    responded.value = false;
    selectedOptionId.value = null;
    answersCount.value = 0;
    aliveCount.value = 0;
    showRoundResults.value = false;
    lastRoundResults.value = null;
    winnerId.value = null;
    winnerName.value = null;
    standings.value = [];
  }

  function connect(id: string, userId: string) {
    disconnect();
    matchId.value = id;
    recoverableMatchId.value = null;

    const source = new EventSource(`/api/battle-royale/events?matchId=${id}`);
    eventSource.value = source as any;

    // Initial sync
    source.addEventListener("sync_state", (event: any) => {
      const data = JSON.parse(event.data);
      status.value = data.status;
      currentRound.value = data.currentRound;
      currentQuestion.value = data.currentQuestion;
      currentQuestionDuration.value = data.currentQuestionDuration;
      currentQuestionEndTime.value = data.currentQuestionEndTime || 0;
      myLives.value = data.myLives;
      players.value = data.players;
      countdown.value = data.countdown;
      isCountdownRunning.value = data.isCountdownRunning || false;

      aliveCount.value = data.players.filter((p: any) => p.lives > 0).length;
      answersCount.value = data.players.filter((p: any) => p.lives > 0 && p.hasAnswered).length;
    });

    // Lobby updates
    source.addEventListener("lobby_update", (event: any) => {
      const data = JSON.parse(event.data);
      players.value = data.players.map((p: any) => ({
        ...p,
        lives: 3,
        hasAnswered: false,
      }));
      countdown.value = data.countdown;
      isCountdownRunning.value = data.isCountdownRunning || false;
    });

    // Lobby countdown
    source.addEventListener("lobby_countdown", (event: any) => {
      const data = JSON.parse(event.data);
      countdown.value = data.countdown;
      isCountdownRunning.value = data.isRunning || false;
    });

    // Match starts
    source.addEventListener("game_start", () => {
      status.value = "PLAYING";
      showRoundResults.value = false;

      // Auto-redirect if player is on another screen
      const route = useRoute();
      if (route.path !== "/series/battle-royale") {
        void navigateTo("/series/battle-royale");
      }
    });

    // New Question
    source.addEventListener("new_question", (event: any) => {
      const data = JSON.parse(event.data);
      currentRound.value = data.round;
      currentQuestion.value = data.question;
      currentQuestionDuration.value = data.duration;
      currentQuestionEndTime.value = data.endTime;

      responded.value = false;
      selectedOptionId.value = null;
      showRoundResults.value = false;

      answersCount.value = 0;
      aliveCount.value = players.value.filter((p) => p.lives > 0).length;
      players.value.forEach((p) => {
        p.hasAnswered = false;
      });
    });

    // Answers progress
    source.addEventListener("answers_progress", (event: any) => {
      const data = JSON.parse(event.data);
      answersCount.value = data.answersCount;
      aliveCount.value = data.aliveCount;
    });

    // Round ended
    source.addEventListener("round_ended", (event: any) => {
      const data = JSON.parse(event.data);
      lastRoundResults.value = data;
      showRoundResults.value = true;

      data.results.forEach((res: any) => {
        const p = players.value.find((pl) => pl.userId === res.userId);
        if (p) {
          p.lives = res.livesAfter;
        }
        if (res.userId === userId) {
          myLives.value = res.livesAfter;
        }
      });
    });

    // Match finished
    source.addEventListener("match_finished", (event: any) => {
      const data = JSON.parse(event.data);
      winnerId.value = data.winnerId;
      winnerName.value = data.winnerName;
      standings.value = data.standings;

      setTimeout(() => {
        showRoundResults.value = false;
        status.value = "FINISHED";

        // Fermer la connexion SSE mais conserver l'état pour afficher le podium
        if (eventSource.value) {
          try {
            eventSource.value.close();
          } catch (e) {
            console.error("Error closing event source on finish:", e);
          }
          eventSource.value = null;
        }
      }, 4000);
    });
  }

  async function checkActiveSession() {
    try {
      const res = await $fetch<{ matchId: string | null }>("/api/battle-royale/active-match");
      if (res && res.matchId) {
        // If we are not currently connected, mark it as recoverable
        if (matchId.value !== res.matchId) {
          recoverableMatchId.value = res.matchId;
        }
      } else {
        recoverableMatchId.value = null;
      }
    } catch (e) {
      console.error("Error checking active session:", e);
    }
  }

  return {
    matchId,
    status,
    players,
    countdown,
    isCountdownRunning,
    myLives,
    currentRound,
    currentQuestion,
    currentQuestionDuration,
    currentQuestionEndTime,
    responded,
    selectedOptionId,
    answersCount,
    aliveCount,
    showRoundResults,
    lastRoundResults,
    winnerId,
    winnerName,
    standings,
    recoverableMatchId,
    isJoined,
    isSpectator,
    connect,
    disconnect,
    checkActiveSession,
  };
};
