<template>
  <div
    class="relative w-full flex flex-col justify-center select-none min-h-[calc(100dvh-240px)] md:min-h-0 transition-all duration-300"
    :class="responded ? 'pb-60 md:pb-28' : 'pb-36 md:pb-20'"
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

    <div class="flex flex-col space-y-2.5 md:space-y-3.5">
      <!-- Header Row (Theme badges + Flag) -->
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="t in question.themes"
            :key="t"
            class="text-[9px] font-extrabold uppercase tracking-wider font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
          >
            {{ t }}
          </span>
        </div>
        <QuestionReporting ref="questionReporting" :questionId="question.id" />
      </div>

      <!-- Question Title -->
      <h3
        class="text-base md:text-lg font-black font-display text-white tracking-wide leading-relaxed"
      >
        {{ question.data.libelle }}
      </h3>

      <!-- Image + Options Layout (Vertical vs Horizontal layout) -->
      <div
        :class="
          isVerticalImage
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-center'
            : 'flex flex-col space-y-2.5 md:space-y-3.5'
        "
      >
        <!-- Question Image (if exists) -->
        <div
          v-if="question.data.img"
          class="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-inner"
          :class="isVerticalImage ? 'h-44 md:h-56' : 'h-36 md:h-48'"
        >
          <img :src="question.data.img" alt="Question image" class="w-full h-full object-contain" />
        </div>

        <!-- Options List -->
        <div class="flex flex-col gap-1.5 py-0.5 w-full">
          <button
            v-for="(proposition, index) in question.data.propositions"
            :key="proposition.id"
            :disabled="responded"
            class="w-full text-left px-4 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm tracking-wide font-display border transition-all duration-150 relative select-none"
            :class="getOptionClass(index, proposition.id)"
            @click="selectOption(index)"
          >
            <div class="flex items-center justify-between">
              <span>{{ proposition.value }}</span>

              <span v-if="responded && (greenResponse === index + 1 || redResponse === index + 1)">
                <UIcon
                  v-if="greenResponse === index + 1"
                  name="i-heroicons-check-circle-20-solid"
                  class="text-xl text-emerald-400"
                />
                <UIcon
                  v-else-if="redResponse === index + 1"
                  name="i-heroicons-x-circle-20-solid"
                  class="text-xl text-rose-500 animate-shake"
                />
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

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
                {{ isCorrect ? "Bravo !" : "Incorrect" }}
              </h4>
              <div class="max-h-16 md:max-h-20 overflow-y-auto pr-2 custom-scrollbar select-text">
                <p class="text-[11px] text-gray-300 font-medium leading-relaxed">
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
        <div class="w-full md:w-auto flex-shrink-0 flex justify-center">
          <!-- Validate Button -->
          <UButton
            v-if="!responded"
            size="lg"
            class="w-full md:w-56 font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="selectedResponse != null ? 'primary' : 'gray'"
            :disabled="selectedResponse == null || loading || parentLoading"
            :loading="loading || parentLoading"
            @click="validateResponse"
          >
            Valider
          </UButton>
          <!-- Continue Button -->
          <UButton
            v-else
            size="lg"
            class="w-full md:w-56 font-black font-display uppercase tracking-widest py-2.5 md:py-3.5 justify-center shadow-lg"
            :color="isCorrect ? 'emerald' : 'rose'"
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
import { ReportingDTO } from "~/models/DTO/reportingDTO";
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDTO } from "~/models/question";
import QuestionReporting from "./QuestionReporting.vue";

const props = defineProps<{
  question?: QuestionDTO | null;
  parentLoading: boolean;
}>();

const achievementStore = useAchievementStore();
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
const questionReporting = ref<InstanceType<typeof QuestionReporting> | null>(null);
const isVerticalImage = ref(false);

watch(
  () => props.question?.data?.img,
  (newImgUrl) => {
    isVerticalImage.value = false;
    if (!newImgUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > img.naturalWidth) {
        isVerticalImage.value = true;
      }
    };
    img.src = newImgUrl;
  },
  { immediate: true },
);

const emit = defineEmits<{
  validateResponse: [response: ResponseDTO];
  nextQuestion: [];
}>();

const isCorrect = computed(() => {
  return greenResponse.value === redResponse.value
    ? false
    : greenResponse.value !== null && redResponse.value === null;
});

function selectOption(index: number) {
  if (responded.value) return;
  selectedResponse.value = index;
}

function getOptionClass(index: number, id: any) {
  const normalizedIndexVal = index + 1;

  if (responded.value) {
    if (greenResponse.value === normalizedIndexVal) {
      return "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-neon-green font-extrabold cursor-default";
    }
    if (redResponse.value === normalizedIndexVal) {
      return "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-neon-red font-extrabold cursor-default";
    }
    return "bg-slate-900/20 border-white/5 text-gray-500 cursor-default opacity-40";
  }

  if (selectedResponse.value === index) {
    return "bg-violet-600/15 border-violet-500 shadow-neon text-violet-300 font-extrabold scale-[1.01] btn-pressable";
  }
  return "bg-white/5 hover:bg-white/10 hover:border-white/20 border-white/10 text-gray-300 font-semibold btn-pressable";
}

async function validateResponse() {
  if (selectedResponse.value == null || !props.question) return;
  try {
    loading.value = true;
    commentaire.value = props.question.data.commentaire;

    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = props.question.id;
    reponseDTO.userResponseId = selectedResponse.value + 1;

    const selectedProp = props.question.data.propositions[selectedResponse.value];
    const isAnswerCorrect = selectedProp.id === props.question.data.response;

    if (isAnswerCorrect) {
      greenResponse.value = selectedResponse.value + 1;
      redResponse.value = null;
    } else {
      redResponse.value = selectedResponse.value + 1;
      greenResponse.value = props.question.data.response;
    }

    const responseResult = await $fetch<any>("/api/response/validate", {
      method: "post",
      body: { ...reponseDTO },
    });

    responded.value = true;
    achievementStore.answerQuestion();
    gainXP(responseResult?.xpEarned ?? 0);
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
    isVerticalImage.value = false;

    if (questionReporting.value) {
      questionReporting.value.reported = false;
    }

    emit("nextQuestion");
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
