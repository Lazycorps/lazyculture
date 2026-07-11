<template>
  <div
    ref="containerRef"
    class="relative w-full flex flex-col justify-center select-none min-h-0 transition-all duration-300"
    :style="{ paddingBottom: isAlainIntroPhase ? undefined : `${actionBarHeight + 12}px` }"
    v-if="localQuestion || isAlainIntroPhase"
    @pointerdown="pauseSwap"
    @pointerup="resumeSwap"
    @pointercancel="resumeSwap"
  >
    <!-- Malus "Alain" : lecture forcée de la 1re question du combat, sans réponses ni chrono
         contre-la-montre — décompte de mémorisation avant que le déroulé normal ne démarre. -->
    <div v-if="isAlainIntroPhase" class="text-center py-6 px-3 space-y-5">
      <p class="text-[11px] font-black text-amber-400 uppercase tracking-wider font-display">
        Retenez bien cette question !
      </p>
      <QuestionDisplay
        :libelle="previewQuestion?.libelle ?? ''"
        :img="previewQuestion?.img ?? ''"
        :themes="previewQuestion?.themes ?? []"
        :propositions="[]"
        :disabled="true"
        :showReporting="false"
        :questionId="previewQuestion?.id ?? 0"
      />
      <div class="flex flex-col items-center gap-1 pt-1">
        <span class="text-4xl font-black font-display text-amber-400 tabular-nums animate-pulse">
          {{ alainTicksRemaining }}
        </span>
        <span class="text-[10px] text-gray-500 uppercase tracking-wider font-display">
          Mémorisez...
        </span>
      </div>
    </div>

    <template v-else>
      <!-- Progression dans la salle (Standard/Elite uniquement : questionIds a un total fixe,
           contrairement au Boss qui en génère à la volée tant qu'il n'est pas à 0 PV). -->
      <p
        v-if="!isBossRoom && questionTotal > 0"
        class="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider font-display mb-2"
      >
        Question {{ questionIndex }}/{{ questionTotal }}
      </p>

      <!-- Malus "Alain" (hors décompte) : l'énoncé affiché ci-dessous est celui de la question
           SUIVANTE (à mémoriser à son tour) — les réponses cliquables restent celles de la
           question précédente, cf. mainLibelle/showsPreviewAsMainQuestion. -->
      <p
        v-if="showsPreviewAsMainQuestion"
        class="text-center text-[10px] font-bold text-amber-400/80 uppercase tracking-wider font-display mb-1"
      >
        Répondez à la question précédente
      </p>

      <QuestionDisplay
        v-if="localQuestion"
        ref="questionDisplay"
        :libelle="mainLibelle"
        :img="mainImg"
        :themes="mainThemes"
        :propositions="displayPropositions"
        :disabled="responded"
        :selectedOptionId="selectedResponse"
        :correctOptionId="greenResponse"
        :incorrectOptionId="redResponse"
        :showCorrectIncorrectColors="responded"
        :showReporting="true"
        :questionId="localQuestion.id"
        :eliminatedIds="eliminatedIds"
        :hintId="revealedHintId"
        :answerBlurPx="answerBlurPx"
        :mirrorAnswers="mirrorAnswers"
        @selectOption="selectOption"
      />

      <!-- Consommables : 50/50, Appel à un ami, Bouclier — usage unique pendant la question. -->
      <div
        v-if="!responded && availableConsumables.length > 0"
        class="flex justify-center flex-wrap gap-2 mt-3"
      >
        <div v-for="consumable in availableConsumables" :key="consumable.id" class="relative">
          <button
            type="button"
            :disabled="consumableLoading"
            :title="consumable.description"
            class="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold font-display text-gray-300 disabled:opacity-40 transition-colors"
            @pointerdown="longPress.onPointerDown(consumable.id, $event)"
            @pointerup="longPress.onPointerUp(consumable.id)"
            @pointerleave="longPress.onPointerLeave(consumable.id)"
            @pointercancel="longPress.onPointerLeave(consumable.id)"
            @contextmenu.prevent
            @click="handleConsumableClick(consumable.id)"
          >
            <UIcon :name="consumable.icon" class="text-sm text-amber-400" />
            {{ consumable.name }}
            <span class="text-gray-500">×{{ consumable.count }}</span>
          </button>
          <div
            v-if="longPress.activeId.value === consumable.id"
            class="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 shadow-xl text-left pointer-events-none"
          >
            <p class="text-[11px] font-black font-display text-white tracking-wide">
              {{ consumable.name }}
            </p>
            <p class="text-[10px] text-gray-400 leading-snug mt-0.5">
              {{ consumable.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Bar (Duolingo Style - Unified Validate & Continue Action) -->
      <div
        ref="actionBarRef"
        class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl shadow-2xl flex flex-col transition-all duration-300"
        :class="[
          revealed
            ? showComment
              ? 'p-3 md:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]'
              : 'p-2.5 md:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
            : 'p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
          revealed
            ? isCorrect
              ? 'bg-emerald-950/95 border-emerald-500/30 shadow-emerald-500/10 animate-slide-up'
              : 'bg-rose-950/95 border-rose-500/30 shadow-rose-500/10 animate-slide-up'
            : 'bg-slate-950/80 border-white/10',
        ]"
      >
        <div class="max-w-xl mx-auto w-full flex flex-col">
          <div class="w-full">
            <div v-if="revealed" class="flex items-start space-x-2.5 md:space-x-3 mb-2 md:mb-3">
              <div
                class="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm md:text-base flex-shrink-0"
                :class="
                  isCorrect
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
                "
              >
                <UIcon v-if="isCorrect" name="i-heroicons-check-circle" />
                <UIcon v-else name="i-heroicons-exclamation-triangle" />
              </div>
              <div class="space-y-0.5 min-w-0 flex-1">
                <h4
                  class="font-black font-display text-sm tracking-wide flex items-center justify-between"
                  :class="isCorrect ? 'text-emerald-400' : 'text-rose-400'"
                >
                  <span>{{ isCorrect ? "Bravo !" : "Incorrect" }}</span>
                  <UButton
                    variant="ghost"
                    :color="isCorrect ? 'success' : 'error'"
                    size="xs"
                    class="p-1 -mr-1"
                    :icon="showComment ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    @click="toggleComment"
                  />
                </h4>
                <div
                  v-show="showComment"
                  class="max-h-[20dvh] md:max-h-28 overflow-y-auto pr-2 custom-scrollbar select-text"
                >
                  <p class="text-[13px] text-gray-300 font-medium leading-relaxed">
                    {{
                      commentaire ||
                      (isCorrect ? "C'est exact !" : "Dommage ! Ouvrez l'œil pour la suite.")
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="w-full flex justify-center">
            <UButton
              v-if="!responded && !userStore.autoValidateAnswer"
              size="lg"
              class="w-full font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
              :color="selectedResponse != null ? 'primary' : 'neutral'"
              :disabled="selectedResponse == null || loading"
              :loading="loading"
              @click="validateResponse"
            >
              Valider
            </UButton>
            <UButton
              v-else
              :size="showComment ? 'lg' : 'md'"
              class="w-full font-black font-display uppercase tracking-widest justify-center shadow-lg transition-all duration-300"
              :class="showComment ? 'py-2.5 md:py-3.5' : 'py-2 md:py-2.5 text-xs md:text-sm'"
              :color="revealed ? (isCorrect ? 'success' : 'error') : 'neutral'"
              :loading="!revealed"
              :disabled="!revealed"
              @click="nextQuestion"
            >
              Continuer
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { QuestionDTO } from "#shared/question";
import {
  BRAINRUN_ALAIN_INTRO_TICK_MS,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_SIXTH_SENSE_DELAY_MS,
  type BrainrunQuestionPreviewDTO,
} from "#shared/brainrun";
import { BRAINRUN_CONSUMABLES, type BrainrunConsumableId } from "#shared/brainrunItems";
import { getBrainrunBossById } from "#shared/brainrunBosses";

const props = defineProps<{
  question: QuestionDTO | null;
  /** Malus "Alain" (memory_recall) uniquement : question suivante déjà tirée, énoncé seul. */
  previewQuestion?: BrainrunQuestionPreviewDTO | null;
}>();

const emit = defineEmits<{
  advanced: [];
}>();

const brainrun = useBrainrunSession();
const userStore = useUserStore();
const showBottomNav = useState("showBottomNav", () => true);
// Signale à la page parente de garder cet écran affiché tant que le feedback de la
// dernière question d'une salle est visible, même si l'état serveur (currentQuestion/
// isRunActive) a déjà basculé vers la salle/run suivante — la transition visuelle
// n'a lieu qu'au clic sur "Continuer" (cf. nextQuestion()).
const holdOnFeedback = useState("brainrun-hold-on-feedback", () => false);

const loading = ref(false);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref<number | null>(null);
const redResponse = ref<number | null>(null);
const greenResponse = ref<number | null>(null);
const questionDisplay = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const actionBarRef = ref<HTMLElement | null>(null);

// Combat de boss (contre-la-montre) : chrono par question, dérivé de brainrun.currentRoom
// (mis à jour par le serveur, seule source de vérité du temps restant). Partagé via useState
// avec la page parente, qui affiche la barre de PV du boss + les dégâts potentiels à partir
// de cette même valeur (à la place du séparateur habituel entre l'en-tête et la question).
const timedOutFlag = ref(false);
const remainingMs = useState("brainrun-boss-remaining-ms", () => BRAINRUN_BOSS_QUESTION_TIME_MS);
let bossTimerInterval: ReturnType<typeof setInterval> | null = null;

const isBossRoom = computed(() => brainrun.currentRoom.value?.type === "BOSS");
// Malus "Alain" (memory_recall) : décompte de mémorisation forcée de la 1re question du combat,
// sans réponses ni chrono contre-la-montre — dérivé de l'état serveur (currentQuestion null tant
// que rien n'est validable), cf. useBrainrunSession.
const isAlainIntroPhase = brainrun.isAlainMemoryIntro;

// 50/50 / Appel à un ami / Sablier Fêlé / Coup de Grâce / Antidote : effet calculé et persisté
// côté serveur pour la question en cours (le client a déjà data.response/propositions, mais
// l'inventaire et le tirage aléatoire sont gérés par le serveur, cf. BrainrunService.useConsumable).
const eliminatedIds = computed(
  () => brainrun.currentRoom.value?.consumableReveal?.eliminatedIds ?? [],
);
const hintId = computed(() => brainrun.currentRoom.value?.consumableReveal?.hintId ?? null);
// Relique Sixième Sens : le tirage (5% de chance) est déjà décidé côté serveur pour la question
// en cours ; ce timer ne pilote que le délai d'affichage (8s) avant de révéler autoHintId.
const autoHintId = computed(() => brainrun.currentRoom.value?.consumableReveal?.autoHintId ?? null);
const autoHintRevealed = ref(false);
let autoHintTimeout: ReturnType<typeof setTimeout> | null = null;
const revealedHintId = computed(() =>
  hintId.value !== null ? hintId.value : autoHintRevealed.value ? autoHintId.value : null,
);
const chronoBoostUsed = computed(
  () => (brainrun.currentRoom.value?.consumableReveal?.chronoBonusMs ?? 0) > 0,
);
const damageBoostUsed = computed(
  () => (brainrun.currentRoom.value?.consumableReveal?.damageBonus ?? 0) > 0,
);
const malusCancelled = computed(
  () => brainrun.currentRoom.value?.consumableReveal?.malusCancelled ?? false,
);
const consumableLoading = ref(false);
const availableConsumables = computed(() => {
  const consumables = brainrun.run.value?.consumables ?? {};
  const shieldArmed = brainrun.run.value?.shieldArmed ?? false;
  const run = brainrun.run.value;
  // Ordre d'acquisition (pas l'ordre du catalogue), cf. ownedConsumables dans
  // app/pages/brainrun/index.vue.
  return (Object.keys(consumables) as BrainrunConsumableId[])
    .filter((id) => {
      if ((consumables[id] ?? 0) <= 0) return false;
      // Dernier Souffle ne se déclenche qu'automatiquement, jamais depuis cette barre.
      if (id === "REVIVE_TOKEN") return false;
      if (id === "SHIELD") return !shieldArmed;
      if (id === "FIFTY_FIFTY") return eliminatedIds.value.length === 0;
      if (id === "PHONE_A_FRIEND") return hintId.value === null;
      if (id === "HEAL_POTION") return !!run && run.healthPoint < run.maxHealthPoint;
      if (id === "BOSS_CHRONO_BOOST") return isBossRoom.value && !chronoBoostUsed.value;
      if (id === "BOSS_DAMAGE_BOOST") return isBossRoom.value && !damageBoostUsed.value;
      if (id === "MALUS_CANCEL") return isBossRoom.value && !malusCancelled.value;
      return true; // Nouvelle Pioche, Cargaison Surprise : toujours utilisables tant qu'on en possède
    })
    .map((id) => ({ ...BRAINRUN_CONSUMABLES[id], count: consumables[id]! }));
});

async function handleUseConsumable(type: BrainrunConsumableId) {
  consumableLoading.value = true;
  try {
    await brainrun.useConsumable(type);
  } catch (e) {
    console.error("Failed to use brainrun consumable:", e);
  } finally {
    consumableLoading.value = false;
  }
}

// Appui maintenu 1,5s (mobile) pour révéler l'effet du consommable ; le clic qui suit ce
// relâchement ne doit pas déclencher son usage, cf. useBrainrunLongPress.
const longPress = useBrainrunLongPress();

function handleConsumableClick(id: BrainrunConsumableId) {
  if (longPress.consumeLongPress(id)) return;
  handleUseConsumable(id);
}

function updateRemainingMs() {
  const deadline = brainrun.currentRoom.value?.questionDeadline;
  remainingMs.value = deadline
    ? Math.max(0, new Date(deadline).getTime() - Date.now())
    : BRAINRUN_BOSS_QUESTION_TIME_MS;
}

function stopBossTimer() {
  if (bossTimerInterval) clearInterval(bossTimerInterval);
  bossTimerInterval = null;
}

function startBossTimerIfNeeded() {
  stopBossTimer();
  // Pas de question à afficher (salle terminée, écran de récap/fin à venir) : rien à chronométrer.
  // Le décompte de mémorisation d'Alain (isAlainIntroPhase) n'a pas de localQuestion — il utilise
  // le même questionDeadline/remainingMs, décompté différemment (cf. handleAlainIntroTimeout).
  if (!isBossRoom.value || (!localQuestion.value && !isAlainIntroPhase.value)) return;
  updateRemainingMs();
  bossTimerInterval = setInterval(() => {
    updateRemainingMs();
    if (remainingMs.value <= 0 && !responded.value) {
      if (isAlainIntroPhase.value) {
        handleAlainIntroTimeout();
      } else {
        handleBossTimeout();
      }
    }
  }, 200);
}

function stopAutoHintTimer() {
  if (autoHintTimeout) clearTimeout(autoHintTimeout);
  autoHintTimeout = null;
}

function startAutoHintTimerIfNeeded() {
  stopAutoHintTimer();
  autoHintRevealed.value = false;
  if (!localQuestion.value || autoHintId.value === null) return;
  autoHintTimeout = setTimeout(() => {
    autoHintRevealed.value = true;
  }, BRAINRUN_SIXTH_SENSE_DELAY_MS);
}

// Snapshot local de la question affichée : protège l'affichage du feedback (couleurs,
// commentaire) du fait que useBrainrunSession().currentQuestion avance déjà vers la
// question suivante dès la réponse au serveur (submitAnswer renvoie l'état complet
// en un seul aller-retour). Le prop ne doit être appliqué qu'une fois "Continuer" cliqué.
const localQuestion = ref<QuestionDTO | null>(props.question);
// Même principe de gel que localQuestion, pour le malus "memory_recall" d'Alain : le libellé de
// la question suivante (affiché à la place de celui de localQuestion, cf. mainLibelle plus bas)
// ne doit pas changer sous les yeux du joueur pendant qu'il lit encore le feedback de la
// question qu'il vient de valider — sinon le texte affiché ne correspondrait plus aux boutons
// de réponse (ceux de localQuestion, gelés eux aussi) pendant cette fenêtre.
const localPreviewQuestion = ref<BrainrunQuestionPreviewDTO | null>(props.previewQuestion ?? null);

watch(
  () => props.question,
  (newQuestion) => {
    // Chaque round-trip serveur (y compris l'usage d'un consommable comme 50/50, qui ne
    // change pas de question) renvoie un nouvel objet currentQuestion — comparer par id
    // évite de réinitialiser localQuestion (et donc le setup du malus de boss, cf.
    // useBrainrunBossMalus) alors qu'il s'agit toujours de la même question.
    if (!responded.value && newQuestion?.id !== localQuestion.value?.id) {
      localQuestion.value = newQuestion;
      startAutoHintTimerIfNeeded();
    }
  },
);

watch(
  () => props.previewQuestion,
  (newPreview) => {
    if (!responded.value) {
      localPreviewQuestion.value = newPreview ?? null;
    }
  },
);

// Position de localQuestion dans currentRoom.questionIds (figé à la création de la salle pour
// Standard/Elite, cf. BrainrunService.chooseNode) plutôt que responses.length + 1 : ce dernier
// avance déjà côté serveur pendant qu'on affiche encore le feedback de la question précédente
// (même raison que le snapshot localQuestion ci-dessus), ce qui décalerait le compteur d'un cran.
const questionTotal = computed(() => brainrun.currentRoom.value?.questionIds.length ?? 0);
const questionIndex = computed(() => {
  const ids = brainrun.currentRoom.value?.questionIds ?? [];
  const idx = localQuestion.value ? ids.indexOf(localQuestion.value.id) : -1;
  return idx === -1 ? questionTotal.value : idx + 1;
});

// Malus du boss actif (shared/brainrunBosses.ts) : transforme uniquement l'affichage des
// propositions (texte/ordre/présence), jamais la logique de soumission de réponse. Antidote
// (consommable) l'annule pour la question en cours.
const activeBossMalus = computed(() =>
  malusCancelled.value ? undefined : getBrainrunBossById(brainrun.currentRoom.value?.bossId)?.malus,
);

// Malus "Alain" (memory_recall), hors décompte de mémorisation : l'énoncé affiché est celui de
// la question suivante (localPreviewQuestion, à mémoriser), les propositions cliquables restent
// celles de localQuestion (la question précédente, qu'on valide réellement) — cf. la légende
// "Répondez à la question précédente" dans le template. Dès que la réponse est validée (revealed),
// on réaffiche plutôt l'énoncé de localQuestion elle-même (celle qu'on vient de valider, feedback
// coloré à l'appui) : sinon le joueur aurait un temps illimité pour mémoriser l'énoncé suivant en
// lisant tranquillement le feedback avant de cliquer "Continuer", ce qui viderait le malus de son
// sens (cf. references/enemies-and-bosses.md).
const showsPreviewAsMainQuestion = computed(
  () => activeBossMalus.value === "memory_recall" && !isAlainIntroPhase.value && !revealed.value,
);
const mainLibelle = computed(() =>
  showsPreviewAsMainQuestion.value
    ? (localPreviewQuestion.value?.libelle ?? "")
    : (localQuestion.value?.data.libelle ?? ""),
);
const mainImg = computed(() =>
  showsPreviewAsMainQuestion.value
    ? (localPreviewQuestion.value?.img ?? "")
    : (localQuestion.value?.data.img ?? ""),
);
const mainThemes = computed(() =>
  showsPreviewAsMainQuestion.value
    ? (localPreviewQuestion.value?.themes ?? [])
    : (localQuestion.value?.themes ?? []),
);

// Nombre de tics restants (5 → 1) du décompte de mémorisation d'Alain, dérivé du même
// remainingMs que le chrono contre-la-montre normal (questionDeadline sert les deux usages selon
// la phase, cf. BrainrunService.toRoomDTO) — plancher à 1 pour ne jamais afficher "0" avant que
// le timer ne déclenche la transition (cf. handleAlainIntroTimeout).
const alainTicksRemaining = computed(() =>
  Math.max(1, Math.ceil(remainingMs.value / BRAINRUN_ALAIN_INTRO_TICK_MS)),
);

// Signale à la page parente (barre de PV du boss) qu'une résurrection du Phoenix est en cours,
// pour une courte animation avant que la question suivante ne s'affiche (cf. nextQuestion()).
const bossRevivedFlash = useState("brainrun-boss-revived-flash", () => false);

const actionBarHeight = ref(96);
let actionBarObserver: ResizeObserver | null = null;

const showComment = ref(true);

function toggleComment() {
  showComment.value = !showComment.value;
  localStorage.setItem("lazyculture-show-comment", String(showComment.value));
}

onMounted(() => {
  const saved = localStorage.getItem("lazyculture-show-comment");
  if (saved !== null) {
    showComment.value = saved === "true";
  }
  showBottomNav.value = false;
  if (actionBarRef.value) {
    actionBarObserver = new ResizeObserver(() => {
      actionBarHeight.value = actionBarRef.value?.offsetHeight ?? 96;
    });
    actionBarObserver.observe(actionBarRef.value);
  }
  startBossTimerIfNeeded();
  startAutoHintTimerIfNeeded();
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
  holdOnFeedback.value = false;
  actionBarObserver?.disconnect();
  stopBossTimer();
  stopAutoHintTimer();
});

async function scrollFeedbackIntoView() {
  await nextTick();
  if (actionBarRef.value) actionBarHeight.value = actionBarRef.value.offsetHeight;
  await nextTick();
  containerRef.value?.scrollIntoView({ block: "end", behavior: "smooth" });
}

const isCorrect = computed(() => {
  if (timedOutFlag.value) return false;
  return greenResponse.value === redResponse.value
    ? false
    : greenResponse.value !== null && redResponse.value === null;
});

// `responded` se lève avant l'appel réseau (cf. validateResponse) pour geler le
// timer/la sélection ; `revealed` ne se lève qu'une fois le résultat effectivement
// connu, pour éviter d'afficher le cadre rouge par défaut pendant l'attente serveur.
const revealed = computed(
  () => timedOutFlag.value || greenResponse.value !== null || redResponse.value !== null,
);

const questionPropositions = computed(() => localQuestion.value?.data.propositions ?? []);
const { displayPropositions, answerBlurPx, mirrorAnswers, pauseSwap, resumeSwap } =
  useBrainrunBossMalus({
    malus: activeBossMalus,
    propositions: questionPropositions,
    remainingMs,
    revealed,
  });

function selectOption(id: number) {
  if (responded.value) return;
  selectedResponse.value = id;
  if (userStore.autoValidateAnswer) validateResponse();
}

async function validateResponse() {
  const question = localQuestion.value;
  if (selectedResponse.value == null || !question) return;
  try {
    loading.value = true;

    // Fixé avant l'appel réseau : le watcher ci-dessus ignore alors le nouveau
    // currentQuestion que submitAnswer va déclencher pendant qu'on montre le feedback.
    responded.value = true;
    holdOnFeedback.value = true;
    stopBossTimer();

    const state = await brainrun.submitAnswer(question.id, selectedResponse.value);
    const lastResponse = state?.currentRoom?.responses?.find(
      (r: any) => r.questionId === question.id,
    );

    if (lastResponse) {
      commentaire.value = lastResponse.commentaire || "";
      const isAnswerCorrect = lastResponse.success;
      if (isAnswerCorrect) {
        greenResponse.value = selectedResponse.value;
        redResponse.value = null;
        const { playSound } = useAudio();
        playSound("response-success");
      } else {
        redResponse.value = selectedResponse.value;
        greenResponse.value = lastResponse.correctResponseId ?? null;
      }
    }

    scrollFeedbackIntoView();
  } catch (e) {
    console.error("Failed to submit brainrun answer:", e);
    responded.value = false;
    holdOnFeedback.value = false;
  } finally {
    loading.value = false;
  }
}

/** Contre-la-montre : le temps imparti à la question de boss en cours est écoulé. */
async function handleBossTimeout() {
  if (responded.value) return;
  const question = localQuestion.value;
  if (!question) return;
  stopBossTimer();
  timedOutFlag.value = true;
  responded.value = true;
  holdOnFeedback.value = true;
  try {
    // -1 : sentinelle "aucune réponse", le serveur force de toute façon l'échec au vu du délai écoulé.
    const state = await brainrun.submitAnswer(question.id, selectedResponse.value ?? -1);
    const lastResponse = state?.currentRoom?.responses?.find(
      (r: any) => r.questionId === question.id,
    );

    if (lastResponse) {
      commentaire.value = lastResponse.commentaire || "";
      redResponse.value = null;
      greenResponse.value = lastResponse.correctResponseId ?? null;
    }

    scrollFeedbackIntoView();
  } catch (e) {
    console.error("Failed to submit brainrun boss timeout:", e);
    responded.value = false;
    timedOutFlag.value = false;
    holdOnFeedback.value = false;
  }
}

// Malus "Alain" : décompte de mémorisation de la 1re question écoulé — tire la 2e question côté
// serveur (cf. BrainrunService.prepareNextBossQuestion) et démarre alors le vrai chrono
// contre-la-montre pour valider la 1re. Pas de submitAnswer ici : rien n'a été répondu.
let alainIntroAdvancing = false;
async function handleAlainIntroTimeout() {
  if (alainIntroAdvancing) return;
  alainIntroAdvancing = true;
  stopBossTimer();
  try {
    await brainrun.readyNextBossQuestion();
    localQuestion.value = brainrun.currentQuestion.value;
    localPreviewQuestion.value = brainrun.previewQuestion.value;
    startAutoHintTimerIfNeeded();
    startBossTimerIfNeeded();
  } catch (e) {
    console.error("Failed to advance Alain's memory intro:", e);
  } finally {
    alainIntroAdvancing = false;
  }
}

async function nextQuestion() {
  // Levé dès le clic : si une question suivante existe, currentQuestion reste de toute
  // façon truthy côté parent ; sinon (salle terminée), c'est ce flag qui autorisait
  // encore l'affichage — sa levée déclenche enfin la transition vers le récap/l'écran de fin.
  holdOnFeedback.value = false;
  responded.value = false;
  commentaire.value = "";
  selectedResponse.value = null;
  redResponse.value = null;
  greenResponse.value = null;
  timedOutFlag.value = false;
  questionDisplay.value?.resetReporting();

  // Démarre le chrono de la question de boss suivante seulement maintenant que le joueur
  // a fini de lire le feedback précédent (cf. commentaire côté serveur dans submitAnswer).
  // previewQuestion (sans currentQuestion) couvre le cas Alain où la réponse qu'on vient de
  // valider utilisait l'Antidote : le serveur est déjà en attente d'un décompte de mémorisation
  // pour la question suivante (isAlainMemoryIntro) plutôt que d'un chrono contre-la-montre normal.
  if (
    isBossRoom.value &&
    !brainrun.currentRoom.value?.questionDeadline &&
    (brainrun.currentQuestion.value || brainrun.previewQuestion.value)
  ) {
    // 0 PV juste avant cet appel puis > 0 juste après : c'est la résurrection différée du
    // Phoenix qui vient de se déclencher côté serveur (cf. BrainrunService.prepareNextBossQuestion).
    // Le joueur a déjà vu le feedback "boss à 0 PV" ; on marque une courte pause avec l'animation
    // de résurrection avant d'afficher la question suivante, pour ne pas ressembler à un bug.
    const hpBeforeReady = brainrun.currentRoom.value?.bossHealthPoint ?? null;
    await brainrun.readyNextBossQuestion();
    const hpAfterReady = brainrun.currentRoom.value?.bossHealthPoint ?? null;
    if (hpBeforeReady === 0 && (hpAfterReady ?? 0) > 0) {
      bossRevivedFlash.value = true;
      await new Promise((resolve) => setTimeout(resolve, 1400));
      bossRevivedFlash.value = false;
    }
    // brainrun.currentQuestion est la même ref partagée que le prop "question" du parent :
    // on la lit directement pour éviter de dépendre du timing de propagation du prop après cet await.
    localQuestion.value = brainrun.currentQuestion.value;
    localPreviewQuestion.value = brainrun.previewQuestion.value;
  } else {
    localQuestion.value = props.question;
    localPreviewQuestion.value = props.previewQuestion ?? null;
  }
  emit("advanced");

  await nextTick();
  containerRef.value?.scrollIntoView({ block: "start" });

  startBossTimerIfNeeded();
}
</script>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.animate-shake {
  animation: shake 0.2s ease-in-out 2;
}
</style>
