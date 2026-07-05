import { computed } from "vue";
import type { QuestionDTO } from "#shared/question";
import type {
  BrainrunRoomDTO,
  BrainrunRoomType,
  BrainrunRunDTO,
  BrainrunStateDTO,
} from "#shared/brainrun";
import type { BrainrunConsumableId } from "#shared/brainrunItems";

/** État de session Brainrun : solo, tour par tour, pas de SSE — un simple fetch authentifié suffit. */
export const useBrainrunSession = () => {
  const run = useState<BrainrunRunDTO | null>("brainrun-run", () => null);
  const currentRoom = useState<BrainrunRoomDTO | null>("brainrun-room", () => null);
  const currentQuestion = useState<QuestionDTO | null>("brainrun-question", () => null);
  const awaitingChoice = useState<boolean>("brainrun-awaiting-choice", () => false);
  const loading = useState<boolean>("brainrun-loading", () => false);

  const isRunActive = computed(() => run.value?.status === "IN_PROGRESS");
  const isRunEnded = computed(() => !!run.value && run.value.status !== "IN_PROGRESS");

  function applyState(state: BrainrunStateDTO) {
    run.value = state.run;
    currentRoom.value = state.currentRoom;
    currentQuestion.value = state.currentQuestion;
    awaitingChoice.value = state.awaitingChoice;
  }

  async function fetchCurrent() {
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(await authFetch<BrainrunStateDTO>("/api/brainrun/current"));
    } catch (e) {
      // Non authentifié ou erreur transitoire : on laisse l'état à null, la page
      // affiche alors son propre écran (connexion / chargement) plutôt que de planter.
      console.error("Failed to fetch brainrun state:", e);
    } finally {
      loading.value = false;
    }
  }

  async function submitAnswer(questionId: number, userResponseId: number) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    const state = await authFetch<BrainrunStateDTO>("/api/brainrun/answer", {
      method: "post",
      body: { runId: run.value.id, questionId, userResponseId },
    });
    applyState(state);
    return state;
  }

  async function chooseOption(choice: BrainrunRoomType) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/choice", {
          method: "post",
          body: { runId: run.value.id, choice },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  /** Démarre le chrono de la question de boss suivante ; à appeler une fois le feedback lu. */
  async function readyNextBossQuestion() {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    applyState(
      await authFetch<BrainrunStateDTO>("/api/brainrun/boss-ready", {
        method: "post",
        body: { runId: run.value.id },
      }),
    );
  }

  /** pick = id de relique/consommable proposé dans currentRoom.offers, ou "SKIP". */
  async function resolveBonus(pick: string) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/bonus", {
          method: "post",
          body: { runId: run.value.id, pick },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  async function buyShopItem(offerIndex: number) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/shop-buy", {
          method: "post",
          body: { runId: run.value.id, offerIndex },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  async function leaveShop() {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/shop-leave", {
          method: "post",
          body: { runId: run.value.id },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  /** Résout le choix de thème banni après l'obtention de la relique Purge Thématique. */
  async function resolveThemeBan(theme: string) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/theme-ban", {
          method: "post",
          body: { runId: run.value.id, theme },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  async function resolveEvent(optionIndex: number) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/event", {
          method: "post",
          body: { runId: run.value.id, optionIndex },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  async function useConsumable(type: BrainrunConsumableId) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    const state = await authFetch<BrainrunStateDTO>("/api/brainrun/consumable", {
      method: "post",
      body: { runId: run.value.id, type },
    });
    applyState(state);
    return state;
  }

  async function acknowledgeRoom() {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/acknowledge", {
          method: "post",
          body: { runId: run.value.id },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  async function startNewRun() {
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(await authFetch<BrainrunStateDTO>("/api/brainrun/new", { method: "post" }));
    } finally {
      loading.value = false;
    }
  }

  async function abandonRun() {
    const { authFetch } = useAuthFetch();
    await authFetch("/api/brainrun/abandon", { method: "post" });
    reset();
  }

  function reset() {
    run.value = null;
    currentRoom.value = null;
    currentQuestion.value = null;
    awaitingChoice.value = false;
  }

  return {
    run,
    currentRoom,
    currentQuestion,
    awaitingChoice,
    loading,
    isRunActive,
    isRunEnded,
    fetchCurrent,
    submitAnswer,
    chooseOption,
    readyNextBossQuestion,
    resolveBonus,
    buyShopItem,
    leaveShop,
    resolveThemeBan,
    resolveEvent,
    useConsumable,
    acknowledgeRoom,
    startNewRun,
    abandonRun,
    reset,
  };
};
