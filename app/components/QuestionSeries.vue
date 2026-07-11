<template>
  <div
    ref="containerRef"
    class="relative w-full flex flex-col justify-center select-none min-h-0 transition-all duration-300"
    :style="{ paddingBottom: `${actionBarHeight + 12}px` }"
    v-if="question"
  >
    <!-- Floating XP Indicator -->
    <div
      v-if="showXP"
      class="xp-float-anim absolute top-0 right-0 z-50 text-xl font-black font-display text-amber-400 flex items-center bg-slate-900/90 border border-amber-500/30 px-3 py-1 rounded-full shadow-neon"
    >
      <UIcon name="i-heroicons-bolt-solid" class="mr-0.5 text-amber-500 animate-bounce" />
      +{{ xpWin }} XP
    </div>

    <QuestionDisplay
      v-if="question"
      ref="questionDisplay"
      :libelle="question.data.libelle"
      :img="question.data.img"
      :themes="question.themes"
      :propositions="question.data.propositions"
      :disabled="responded"
      :selectedOptionId="selectedResponse"
      :correctOptionId="greenResponse"
      :incorrectOptionId="redResponse"
      :showCorrectIncorrectColors="responded"
      :showReporting="true"
      :questionId="question.id"
      @selectOption="selectOption"
    />

    <!-- Sticky Bottom Bar (Duolingo Style - Unified Validate & Continue Action) -->
    <div
      ref="actionBarRef"
      class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl shadow-2xl flex flex-col transition-all duration-300"
      :class="[
        responded
          ? showComment
            ? 'p-3 md:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]'
            : 'p-2.5 md:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
          : 'p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
        responded
          ? isCorrect
            ? 'bg-emerald-950/95 border-emerald-500/30 shadow-emerald-500/10 animate-slide-up'
            : 'bg-rose-950/95 border-rose-500/30 shadow-rose-500/10 animate-slide-up'
          : 'bg-slate-950/80 border-white/10',
      ]"
    >
      <div class="max-w-xl mx-auto w-full flex flex-col">
        <!-- Left Side: Status / Instructions -->
        <div class="w-full">
          <!-- Answer Evaluation Banner (After response) -->
          <div v-if="responded" class="flex items-start space-x-2.5 md:space-x-3 mb-2 md:mb-3">
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

        <!-- Right Side: Exact same centered button spot -->
        <div class="w-full flex justify-center">
          <!-- Validate Button -->
          <UButton
            v-if="!responded && !userStore.autoValidateAnswer"
            size="lg"
            class="w-full font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="selectedResponse != null ? 'primary' : 'neutral'"
            :disabled="selectedResponse == null || loading || parentLoading"
            :loading="loading || parentLoading"
            @click="validateResponse"
          >
            Valider
          </UButton>
          <!-- Continue Button -->
          <UButton
            v-if="responded"
            :size="showComment ? 'lg' : 'md'"
            class="w-full font-black font-display uppercase tracking-widest justify-center shadow-lg transition-all duration-300"
            :class="showComment ? 'py-2.5 md:py-3.5' : 'py-2 md:py-2.5 text-xs md:text-sm'"
            :color="isCorrect ? 'success' : 'error'"
            :loading="loading || parentLoading"
            @click="NextQuestion"
          >
            Continuer
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ReportingDTO } from "#shared/DTO/reportingDTO";
import { ResponseDTO } from "#shared/DTO/responseDTO";
import { QuestionDTO } from "#shared/question";
import QuestionReporting from "./QuestionReporting.vue";

const props = defineProps<{
  question?: QuestionDTO | null;
  parentLoading: boolean;
}>();

const achievementStore = useAchievementStore();
const userStore = useUserStore();
const showBottomNav = useState("showBottomNav", () => true);
const loading = ref(false);
const loadingReporting = ref(false);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref<any>(null);
const redResponse = ref<any>(null);
const greenResponse = ref<any>(null);
const xpWin = ref(0);
const showXP = ref(false);
const reported = ref(false);
const questionDisplay = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const actionBarRef = ref<HTMLElement | null>(null);

// The container reserves exactly the height of the fixed action bar, so no
// content hides behind it and no oversized gap appears above it
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
  if (actionBarRef.value) {
    actionBarObserver = new ResizeObserver(() => {
      actionBarHeight.value = actionBarRef.value?.offsetHeight ?? 96;
    });
    actionBarObserver.observe(actionBarRef.value);
  }
});

onBeforeUnmount(() => {
  actionBarObserver?.disconnect();
});

// Brings the answer feedback into view above the fixed bottom bar on small screens
async function scrollFeedbackIntoView() {
  await nextTick();
  if (actionBarRef.value) actionBarHeight.value = actionBarRef.value.offsetHeight;
  await nextTick();
  containerRef.value?.scrollIntoView({ block: "end", behavior: "smooth" });
}

const emit = defineEmits<{
  validateResponse: [response: ResponseDTO];
  nextQuestion: [];
}>();

const isCorrect = computed(() => {
  return greenResponse.value === redResponse.value
    ? false
    : greenResponse.value !== null && redResponse.value === null;
});

onMounted(() => {
  showBottomNav.value = false;
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
});

function selectOption(id: number) {
  if (responded.value || loading.value) return;
  selectedResponse.value = id;
  if (userStore.autoValidateAnswer) validateResponse();
}

async function validateResponse() {
  const question = props.question;
  if (selectedResponse.value == null || !question) return;
  try {
    loading.value = true;

    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = question.id;
    reponseDTO.userResponseId = selectedResponse.value;

    const responseResult = await $fetch<any>("/api/response/validate", {
      method: "post",
      body: { ...reponseDTO },
    });

    commentaire.value = responseResult.commentaire || "";
    const isAnswerCorrect = responseResult.success;

    if (isAnswerCorrect) {
      greenResponse.value = selectedResponse.value;
      redResponse.value = null;
      const { playSound } = useAudio();
      playSound("response-success");
    } else {
      redResponse.value = selectedResponse.value;
      greenResponse.value = responseResult.correctResponseId;
    }

    responded.value = true;
    achievementStore.answerQuestion();
    gainXP(responseResult?.xpEarned ?? 0);
    scrollFeedbackIntoView();
    emit("validateResponse", reponseDTO);
  } catch (e) {
    console.error("Failed to validate response in series:", e);
  } finally {
    loading.value = false;
  }
}

async function NextQuestion() {
  try {
    loading.value = true;
    responded.value = false;
    commentaire.value = "";
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
    reported.value = false;
    loadingReporting.value = false;

    questionDisplay.value?.resetReporting();

    emit("nextQuestion");

    await nextTick();
    containerRef.value?.scrollIntoView({ block: "start" });
  } finally {
    loading.value = false;
  }
}

function gainXP(amount: number) {
  if (amount === 0) return;

  xpWin.value = amount;
  showXP.value = true;

  setTimeout(() => {
    showXP.value = false;
  }, 1200);
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
