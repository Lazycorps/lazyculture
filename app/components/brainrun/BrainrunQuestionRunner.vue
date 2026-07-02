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
      @selectOption="selectOption"
    />

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

const props = defineProps<{
  question: QuestionDTO | null;
}>();

const emit = defineEmits<{
  advanced: [];
}>();

const brainrun = useBrainrunSession();
const showBottomNav = useState("showBottomNav", () => true);

const loading = ref(false);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref<number | null>(null);
const redResponse = ref<number | null>(null);
const greenResponse = ref<number | null>(null);
const questionDisplay = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const actionBarRef = ref<HTMLElement | null>(null);

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
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
  actionBarObserver?.disconnect();
});

async function scrollFeedbackIntoView() {
  await nextTick();
  if (actionBarRef.value) actionBarHeight.value = actionBarRef.value.offsetHeight;
  await nextTick();
  containerRef.value?.scrollIntoView({ block: "end", behavior: "smooth" });
}

const isCorrect = computed(() => {
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
    commentaire.value = question.data.commentaire;

    const isAnswerCorrect = selectedResponse.value === question.data.response;
    if (isAnswerCorrect) {
      greenResponse.value = selectedResponse.value;
      redResponse.value = null;
      const { playSound } = useAudio();
      playSound("response-success");
    } else {
      redResponse.value = selectedResponse.value;
      greenResponse.value = question.data.response;
    }

    // Fixé avant l'appel réseau : le watcher ci-dessus ignore alors le nouveau
    // currentQuestion que submitAnswer va déclencher pendant qu'on montre le feedback.
    responded.value = true;
    await brainrun.submitAnswer(question.id, selectedResponse.value);
    scrollFeedbackIntoView();
  } catch (e) {
    console.error("Failed to submit brainrun answer:", e);
    responded.value = false;
  } finally {
    loading.value = false;
  }
}

async function nextQuestion() {
  responded.value = false;
  commentaire.value = "";
  selectedResponse.value = null;
  redResponse.value = null;
  greenResponse.value = null;
  questionDisplay.value?.resetReporting();

  localQuestion.value = props.question;
  emit("advanced");

  await nextTick();
  containerRef.value?.scrollIntoView({ block: "start" });
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
