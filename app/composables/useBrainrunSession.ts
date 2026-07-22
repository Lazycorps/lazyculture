import { computed } from "vue";
import type { QuestionDTO } from "#shared/question";
import type {
  BrainrunMapNodeDTO,
  BrainrunQuestionPreviewDTO,
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
  // Malus "Alain" (memory_recall) uniquement : question déjà tirée mais pas encore répondable,
  // énoncé seul (cf. shared/brainrun.ts BrainrunQuestionPreviewDTO) — null pour tout autre boss.
  const previewQuestion = useState<BrainrunQuestionPreviewDTO | null>(
    "brainrun-preview-question",
    () => null,
  );
  const awaitingChoice = useState<boolean>("brainrun-awaiting-choice", () => false);
  const mapNodes = useState<BrainrunMapNodeDTO[]>("brainrun-map-nodes", () => []);
  const candidateCols = useState<number[] | null>("brainrun-candidate-cols", () => null);
  const loading = useState<boolean>("brainrun-loading", () => false);

  const isRunActive = computed(() => run.value?.status === "IN_PROGRESS");
  const isRunEnded = computed(() => !!run.value && run.value.status !== "IN_PROGRESS");
  // Décompte de mémorisation forcée de la 1re question d'un combat contre Alain (cf.
  // references/enemies-and-bosses.md) : pas de currentQuestion tant qu'il n'y a rien à valider,
  // seul previewQuestion (l'énoncé) est exposé — dérivé de l'état serveur plutôt qu'un flag
  // séparé, même principe que combatIntroType dans app/pages/brainrun/index.vue.
  const isAlainMemoryIntro = computed(
    () => currentRoom.value?.type === "BOSS" && !currentQuestion.value && !!previewQuestion.value,
  );
  // Cartes de thème à présenter après un combat gagné, tant qu'elles ne sont pas résolues (choisies
  // ou passées) ; null sinon. La machine à états (app/pages/brainrun/index.vue) affiche cet écran
  // AVANT le bonus relique/consommable pour les Élites/Boss.
  const pendingThemeCards = computed(() =>
    currentRoom.value?.themeCardOffer && !currentRoom.value.themeCardResolved
      ? currentRoom.value.themeCardOffer
      : null,
  );

  function applyState(state: BrainrunStateDTO) {
    run.value = state.run;
    currentRoom.value = state.currentRoom;
    currentQuestion.value = state.currentQuestion;
    previewQuestion.value = state.previewQuestion;
    awaitingChoice.value = state.awaitingChoice;
    mapNodes.value = state.mapNodes;
    candidateCols.value = state.candidateCols;
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

  /** col = colonne du nœud choisi sur la rangée courante, parmi candidateCols. */
  async function chooseNode(col: number) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/choice", {
          method: "post",
          body: { runId: run.value.id, col },
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

  /** pick = slug d'une carte de currentRoom.themeCardOffer, ou "SKIP" pour passer. */
  async function resolveThemeCard(pick: string) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/theme-card", {
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

  /** Résout le choix fait dans la Bibliothèque active : se reposer (+1 PV) ou bannir un thème. */
  async function resolveRest(choice: "HEAL" | "BAN_THEME", theme?: string) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/rest", {
          method: "post",
          body: { runId: run.value.id, choice, theme },
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

  /** Jette un exemplaire d'un consommable possédé pour libérer un emplacement. */
  async function discardConsumable(type: BrainrunConsumableId) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    const state = await authFetch<BrainrunStateDTO>("/api/brainrun/discard-consumable", {
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

  /** Debug uniquement (import.meta.dev, rejeté par le serveur sinon) : force PV/or de la run en
   * cours. Les champs omis conservent leur valeur actuelle. */
  async function debugSetStats(patch: {
    healthPoint?: number;
    maxHealthPoint?: number;
    gold?: number;
    themeCoefficients?: Record<string, number>;
  }) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/debug/set-stats", {
          method: "post",
          body: { runId: run.value.id, ...patch },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  /** Debug uniquement : téléporte vers un nœud précis (doit être PENDING), en forçant
   * optionnellement son type et/ou l'ennemi/boss tiré pour le combat. */
  async function debugJump(target: {
    act: number;
    row: number;
    col: number;
    roomType?: BrainrunRoomType;
    forcedCombatId?: string;
  }) {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/debug/jump", {
          method: "post",
          body: { runId: run.value.id, ...target },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  /** Debug uniquement : rejette la carte de l'acte en cours (nouveau graphe, nouveaux types de
   * salle, nouveaux ennemis) et replace le joueur à son entrée — PV/or/reliques conservés. */
  async function debugRegenerateMap() {
    if (!run.value) return;
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      applyState(
        await authFetch<BrainrunStateDTO>("/api/brainrun/debug/regenerate-map", {
          method: "post",
          body: { runId: run.value.id },
        }),
      );
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    run.value = null;
    currentRoom.value = null;
    currentQuestion.value = null;
    previewQuestion.value = null;
    awaitingChoice.value = false;
    mapNodes.value = [];
    candidateCols.value = null;
  }

  return {
    run,
    currentRoom,
    currentQuestion,
    previewQuestion,
    awaitingChoice,
    mapNodes,
    candidateCols,
    loading,
    isRunActive,
    isRunEnded,
    isAlainMemoryIntro,
    pendingThemeCards,
    fetchCurrent,
    submitAnswer,
    chooseNode,
    readyNextBossQuestion,
    resolveBonus,
    resolveThemeCard,
    buyShopItem,
    leaveShop,
    resolveThemeBan,
    resolveRest,
    resolveEvent,
    useConsumable,
    discardConsumable,
    acknowledgeRoom,
    startNewRun,
    abandonRun,
    reset,
    debugSetStats,
    debugJump,
    debugRegenerateMap,
  };
};
