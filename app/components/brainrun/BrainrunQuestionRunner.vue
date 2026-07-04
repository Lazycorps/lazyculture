<template>
  <div
    ref="containerRef"
    class="relative w-full flex flex-col justify-center select-none min-h-0 transition-all duration-300"
    :style="{ paddingBottom: `${actionBarHeight + 12}px` }"
    v-if="localQuestion"
  >
    <QuestionDisplay
      v-if="localQuestion"
      ref="questionDisplay"
      :libelle="localQuestion.data.libelle"
      :img="localQuestion.data.img"
      :themes="localQuestion.themes"
      :propositions="localQuestion.data.propositions"
      :disabled="responded"
      :selectedOptionId="selectedResponse"
      :correctOptionId="greenResponse"
      :incorrectOptionId="redResponse"
      :showCorrectIncorrectColors="responded"
      :showReporting="true"
      :questionId="localQuestion.id"
      :eliminatedIds="eliminatedIds"
      :hintId="hintId"
      @selectOption="selectOption"
    />

    <!-- Consommables : 50/50, Appel à un ami, Bouclier — usage unique pendant la question. -->
    <div
      v-if="!responded && availableConsumables.length > 0"
      class="flex justify-center flex-wrap gap-2 mt-3"
    >
      <button
        v-for="consumable in availableConsumables"
        :key="consumable.id"
        type="button"
        :disabled="consumableLoading"
        class="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold font-display text-gray-300 disabled:opacity-40 transition-colors"
        @click="handleUseConsumable(consumable.id)"
      >
        <UIcon :name="consumable.icon" class="text-sm text-amber-400" />
        {{ consumable.name }}
        <span class="text-gray-500">×{{ consumable.count }}</span>
      </button>
    </div>

    <!-- Sticky Bottom Bar (Duolingo Style - Unified Validate & Continue Action) -->
    <div
      ref="actionBarRef"
      class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl shadow-2xl flex flex-col p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-all duration-300"
      :class="
        responded
          ? isCorrect
            ? 'bg-emerald-950/95 border-emerald-500/30 shadow-emerald-500/10 animate-slide-up'
            : 'bg-rose-950/95 border-rose-500/30 shadow-rose-500/10 animate-slide-up'
          : 'bg-slate-950/80 border-white/10'
      "
    >
      <div class="max-w-xl mx-auto w-full flex flex-col">
        <div class="w-full">
          <div v-if="responded" class="flex items-start space-x-3 md:space-x-4">
            <div
              class="w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-lg md:text-xl flex-shrink-0"
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
                class="font-black font-display text-base tracking-wide flex items-center justify-between"
                :class="isCorrect ? 'text-emerald-400' : 'text-rose-400'"
              >
                <span>{{ isCorrect ? "Bravo !" : "Incorrect" }}</span>
              </h4>
              <div
                class="max-h-[20dvh] md:max-h-28 overflow-y-auto pr-2 custom-scrollbar select-text mb-3"
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
            v-if="!responded"
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
            size="lg"
            class="w-full font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="isCorrect ? 'success' : 'error'"
            @click="nextQuestion"
          >
            Continuer
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuestionDTO } from "#shared/question";
import { BRAINRUN_BOSS_QUESTION_TIME_MS } from "#shared/brainrun";
import { BRAINRUN_CONSUMABLES, type BrainrunConsumableId } from "#shared/brainrunItems";

const props = defineProps<{
  question: QuestionDTO | null;
}>();

const emit = defineEmits<{
  advanced: [];
}>();

const brainrun = useBrainrunSession();
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

// 50/50 / Appel à un ami : effet calculé et persisté côté serveur pour la question en cours
// (le client a déjà data.response/propositions, mais l'inventaire et le tirage aléatoire sont
// gérés par le serveur, cf. BrainrunService.useConsumable).
const eliminatedIds = computed(
  () => brainrun.currentRoom.value?.consumableReveal?.eliminatedIds ?? [],
);
const hintId = computed(() => brainrun.currentRoom.value?.consumableReveal?.hintId ?? null);
const consumableLoading = ref(false);
const availableConsumables = computed(() => {
  const consumables = brainrun.run.value?.consumables ?? {};
  const shieldArmed = brainrun.run.value?.shieldArmed ?? false;
  return (Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[])
    .filter((id) => {
      if ((consumables[id] ?? 0) <= 0) return false;
      if (id === "SHIELD") return !shieldArmed;
      if (id === "FIFTY_FIFTY") return eliminatedIds.value.length === 0;
      if (id === "PHONE_A_FRIEND") return hintId.value === null;
      return true;
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
  if (!isBossRoom.value || !localQuestion.value) return;
  updateRemainingMs();
  bossTimerInterval = setInterval(() => {
    updateRemainingMs();
    if (remainingMs.value <= 0 && !responded.value) {
      handleBossTimeout();
    }
  }, 200);
}

// Snapshot local de la question affichée : protège l'affichage du feedback (couleurs,
// commentaire) du fait que useBrainrunSession().currentQuestion avance déjà vers la
// question suivante dès la réponse au serveur (submitAnswer renvoie l'état complet
// en un seul aller-retour). Le prop ne doit être appliqué qu'une fois "Continuer" cliqué.
const localQuestion = ref<QuestionDTO | null>(props.question);

watch(
  () => props.question,
  (newQuestion) => {
    if (!responded.value) {
      localQuestion.value = newQuestion;
    }
  },
);

const actionBarHeight = ref(96);
let actionBarObserver: ResizeObserver | null = null;

onMounted(() => {
  showBottomNav.value = false;
  if (actionBarRef.value) {
    actionBarObserver = new ResizeObserver(() => {
      actionBarHeight.value = actionBarRef.value?.offsetHeight ?? 96;
    });
    actionBarObserver.observe(actionBarRef.value);
  }
  startBossTimerIfNeeded();
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
  holdOnFeedback.value = false;
  actionBarObserver?.disconnect();
  stopBossTimer();
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

function selectOption(id: number) {
  if (responded.value) return;
  selectedResponse.value = id;
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
  if (
    isBossRoom.value &&
    !brainrun.currentRoom.value?.questionDeadline &&
    brainrun.currentQuestion.value
  ) {
    await brainrun.readyNextBossQuestion();
    // brainrun.currentQuestion est la même ref partagée que le prop "question" du parent :
    // on la lit directement pour éviter de dépendre du timing de propagation du prop après cet await.
    localQuestion.value = brainrun.currentQuestion.value;
  } else {
    localQuestion.value = props.question;
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
