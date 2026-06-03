<template>
  <div
    class="relative w-full max-w-lg mx-auto flex flex-col justify-center min-h-[calc(100dvh-240px)] md:min-h-0 transition-all duration-300"
    :class="responded ? 'pb-60 md:pb-28' : 'pb-36 md:pb-20'"
  >
    <!-- Floating XP Indicator -->
    <div
      v-if="showXP"
      class="xp-float-anim absolute top-10 right-4 z-50 text-2xl font-black font-display text-amber-400 flex items-center bg-slate-900/90 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-neon"
    >
      <UIcon name="i-heroicons-bolt-solid" class="mr-1 text-amber-500" />
      +{{ xpWin }} XP
    </div>

    <!-- Skeleton Loader -->
    <div
      v-if="firstLoading"
      class="animate-pulse space-y-3 p-4 bg-slate-900/40 rounded-2xl border border-white/5"
    >
      <div class="flex justify-between items-center">
        <div class="h-4 bg-white/10 rounded w-1/3"></div>
        <div class="h-8 w-8 bg-white/10 rounded-full"></div>
      </div>
      <div class="h-5 bg-white/10 rounded w-3/4"></div>
      <div class="h-20 bg-white/5 rounded-xl w-full"></div>
      <div class="space-y-2 pt-2">
        <div class="h-9 bg-white/10 rounded-xl w-full"></div>
        <div class="h-9 bg-white/10 rounded-xl w-full"></div>
        <div class="h-9 bg-white/10 rounded-xl w-full"></div>
      </div>
      <div class="h-9 bg-white/15 rounded-xl w-1/2 mx-auto pt-1"></div>
    </div>

    <!-- Question View -->
    <QuestionDisplay
      v-else
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
      class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl shadow-2xl flex flex-col p-4 md:p-6 transition-all duration-300"
      :class="
        responded
          ? isCorrect
            ? 'bg-emerald-950/95 border-emerald-500/30 shadow-emerald-500/10 animate-slide-up'
            : 'bg-rose-950/95 border-rose-500/30 shadow-rose-500/10 animate-slide-up'
          : 'bg-slate-950/80 border-white/10'
      "
    >
      <div
        class="max-w-xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4"
      >
        <!-- Left Side: Status / Instructions -->
        <div class="flex-1 w-full md:w-auto">
          <!-- Active Mode Instruction (Before response) -->
          <div v-if="!responded" class="hidden md:flex items-center space-x-2 text-gray-400">
            <UIcon name="i-heroicons-information-circle" class="text-lg text-violet-400" />
            <span class="text-xs font-semibold font-display tracking-wide"
              >Choisissez une proposition ci-dessus</span
            >
          </div>

          <!-- Answer Evaluation Banner (After response) -->
          <div v-else class="flex items-start space-x-3 md:space-x-4">
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
                class="font-black font-display text-base tracking-wide"
                :class="isCorrect ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ isCorrect ? "Excellent travail !" : "Oups, mauvaise réponse" }}
              </h4>
              <div class="max-h-16 md:max-h-20 overflow-y-auto pr-2 custom-scrollbar select-text">
                <p class="text-[11px] text-gray-300 font-medium leading-relaxed">
                  {{
                    commentaire ||
                    (isCorrect ? "C'est exact !" : "Dommage, mais continuez d'apprendre.")
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Exact same centered button spot -->
        <div class="w-full md:w-auto flex-shrink-0 flex justify-center">
          <!-- Validate Button -->
          <UButton
            v-if="!responded"
            size="lg"
            class="w-full md:w-56 font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="selectedResponse != null ? 'primary' : 'neutral'"
            :disabled="selectedResponse == null || loading"
            :loading="loading"
            @click="validateResponse"
          >
            Valider
          </UButton>
          <!-- Continue Button -->
          <UButton
            v-else
            size="lg"
            class="w-full md:w-56 font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="isCorrect ? 'success' : 'error'"
            :loading="loading"
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
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDTO } from "~/models/question";
import QuestionReporting from "./QuestionReporting.vue";

const props = defineProps<{ theme?: string }>();
const achievementStore = useAchievementStore();
const showBottomNav = useState("showBottomNav", () => true);

const firstLoading = ref(true);
const loading = ref(true);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref<any>(null);
const redResponse = ref<any>(null);
const greenResponse = ref<any>(null);
const xpWin = ref(0);
const showXP = ref(false);
const question = ref(new QuestionDTO());
const questionDisplay = ref<any>(null);

const isCorrect = computed(() => {
  return greenResponse.value === redResponse.value
    ? false
    : greenResponse.value !== null && redResponse.value === null;
});

onMounted(() => {
  try {
    NextQuestion();
  } catch (err) {}
  showBottomNav.value = false;
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
});

function selectOption(id: any) {
  if (responded.value) return;
  selectedResponse.value = id;
}

async function validateResponse() {
  if (selectedResponse.value == null) return;
  try {
    loading.value = true;
    commentaire.value = question.value.data.commentaire;
    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = question.value.id;
    reponseDTO.userResponseId = selectedResponse.value;

    // Evaluate answer matching local schema
    const isAnswerCorrect = selectedResponse.value === question.value.data.response;

    if (isAnswerCorrect) {
      greenResponse.value = selectedResponse.value;
      redResponse.value = null;
    } else {
      redResponse.value = selectedResponse.value;
      greenResponse.value = question.value.data.response;
    }

    const responseResult = await $fetch<any>("/api/response/validate", {
      method: "post",
      body: { ...reponseDTO },
    });

    responded.value = true;
    achievementStore.answerQuestion();
    gainXP(responseResult?.xpEarned ?? 0);
  } catch (e) {
    console.error("Failed to validate response:", e);
  } finally {
    loading.value = false;
  }
}

async function NextQuestion() {
  try {
    loading.value = true;
    const newQuestion = await getNewQuestion();

    questionDisplay.value?.resetReporting();

    responded.value = false;
    question.value = newQuestion;
    commentaire.value = "";
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
  } catch (e) {
    console.error("Failed to load next question:", e);
  } finally {
    loading.value = false;
    firstLoading.value = false;
  }
}

function gainXP(amount: number) {
  if (amount === 0) return;

  xpWin.value = amount;
  showXP.value = true;

  // Fade out float text
  setTimeout(() => {
    showXP.value = false;
  }, 1200);
}

async function getNewQuestion() {
  if (props.theme) return $fetch<QuestionDTO>("/api/question/random?theme=" + props.theme);
  else return $fetch<QuestionDTO>("/api/question/random");
}
</script>

<style scoped>
/* Shake animation keyframes */
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
