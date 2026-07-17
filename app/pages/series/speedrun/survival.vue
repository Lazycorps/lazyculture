<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none relative min-h-[80vh]">
    <!-- Visual Red Flash Penalty Overlay -->
    <div
      v-if="showPenaltyFlash"
      class="fixed inset-0 bg-red-600/30 backdrop-blur-[2px] z-50 pointer-events-none transition-opacity duration-300 flex items-center justify-center animate-fade-out"
    >
      <div
        class="text-white font-black font-display text-5xl md:text-7xl drop-shadow-lg tracking-wide scale-up"
      >
        -5s
      </div>
    </div>

    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2 relative overflow-hidden"
    >
      <!-- Background subtle glow -->
      <div
        class="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-violet-600/5 blur-3xl pointer-events-none"
      ></div>

      <!-- Non-authenticated user view -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto animate-pulse"
          >
            🔒
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Survie Flash</h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Relevez le défi de rapidité ultime de LazyCulture. Connectez-vous pour jouer et
              inscrire votre score au classement !
            </p>
          </div>
          <UButton
            to="/login"
            color="primary"
            size="lg"
            block
            icon="i-heroicons-key"
            class="font-extrabold uppercase font-display tracking-wider py-3"
          >
            Se connecter et jouer
          </UButton>
        </div>
      </template>

      <!-- Authenticated player view -->
      <template v-else>
        <!-- Initializing state spinner -->
        <div v-if="initializing" class="flex flex-col items-center justify-center py-20 space-y-4">
          <UIcon name="i-heroicons-arrow-path" class="text-4xl text-violet-500 animate-spin" />
          <p
            class="text-xs text-gray-400 font-display font-bold uppercase tracking-wider animate-pulse"
          >
            Initialisation de la Survie...
          </p>
        </div>

        <template v-else>
          <!-- Game Header (Chrono & Score Tracker) -->
          <div class="flex flex-col space-y-4 mb-6" v-if="isGameActive">
            <div class="flex justify-between items-center">
              <!-- Title -->
              <div class="flex items-center space-x-2">
                <span class="text-2xl">⚡</span>
                <h2 class="text-lg font-black font-display text-white tracking-wide uppercase">
                  Survie Flash
                </h2>
              </div>

              <!-- Score Badge -->
              <div
                class="flex items-center bg-violet-500/10 border border-violet-500/30 px-3 py-1 rounded-full text-violet-400"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider font-display mr-1.5"
                  >Score</span
                >
                <span class="text-base font-black font-display">{{ currentScore }}</span>
              </div>
            </div>

            <!-- Chrono bar and digital display -->
            <div class="space-y-2">
              <div class="flex justify-between items-end">
                <span class="text-xs font-bold text-gray-400 font-display">Temps restant</span>
                <!-- Digital Timer -->
                <span
                  class="text-2xl font-black font-display transition-colors duration-200"
                  :class="
                    timeLeft <= 10 ? 'text-red-500 animate-pulse scale-105' : 'text-violet-400'
                  "
                >
                  {{ timeLeft.toFixed(1) }}s
                </span>
              </div>
              <!-- Custom Premium Glass Progress Bar -->
              <div
                class="w-full h-3 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full rounded-full transition-all duration-100 shadow-neon"
                  :class="
                    timeLeft <= 10
                      ? 'bg-gradient-to-r from-red-600 to-rose-500'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'
                  "
                  :style="{ width: `${(timeLeft / 120) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <hr class="border-white/5 my-5" v-if="isGameActive" />

          <!-- Quiz Runner Section -->
          <template v-if="!isEnded">
            <div class="py-4">
              <QuestionSeries
                v-if="seriesStarted"
                :question="question"
                :parentLoading="loading"
                @validate-response="validateResponse"
                @next-question="nextQuestion"
              />

              <!-- Start/Resume Lobby Screen -->
              <div v-else class="text-center py-8 space-y-6 flex flex-col items-center">
                <div class="relative">
                  <div
                    class="absolute inset-0 bg-violet-500/10 blur-xl rounded-full scale-125"
                  ></div>
                  <div
                    class="relative w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-4xl text-violet-400"
                  >
                    ⚡
                  </div>
                </div>

                <div class="space-y-2">
                  <h3 class="text-2xl font-black font-display text-white tracking-wide uppercase">
                    Prêt pour la Survie ?
                  </h3>
                  <p class="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Vous disposez de 120 secondes (2 minutes). Répondez au maximum de questions
                    possibles. Attention, chaque erreur vous retire 5 secondes !
                  </p>
                </div>

                <div class="pt-4 w-full max-w-xs space-y-3">
                  <UButton
                    size="lg"
                    color="primary"
                    block
                    :loading="loading"
                    icon="i-heroicons-play-solid"
                    class="font-black font-display uppercase tracking-widest py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                    @click="startNewRun"
                  >
                    Démarrer la survie
                  </UButton>

                  <UButton
                    to="/series/speedrun"
                    variant="ghost"
                    color="neutral"
                    block
                    class="font-bold text-xs uppercase tracking-wider"
                  >
                    Retour au menu
                  </UButton>
                </div>
              </div>
            </div>
          </template>

          <!-- Completion End Screen -->
          <template v-else>
            <div class="text-center py-6 md:py-8 px-4 space-y-6 flex flex-col items-center">
              <!-- Glowing Trophy/Rank icon -->
              <div class="relative">
                <div class="absolute inset-0 bg-violet-500/20 blur-xl rounded-full scale-125"></div>
                <div
                  class="relative w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-4xl text-violet-400"
                >
                  🏁
                </div>
              </div>

              <div class="space-y-1">
                <h3 class="text-2xl font-black font-display text-white tracking-wide uppercase">
                  Temps Écoulé !
                </h3>
                <p class="text-xs text-gray-400 max-w-sm">
                  Votre survie est terminée. Voyons votre score final !
                </p>
              </div>

              <!-- Stats Recap Grid -->
              <div class="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                <div
                  class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-center"
                >
                  <p class="text-3xl font-black font-display text-violet-400">
                    {{ finalScore }}
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1"
                  >
                    Réponses Correctes
                  </p>
                </div>
                <div
                  class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-center"
                >
                  <p class="text-3xl font-black font-display text-amber-400">+{{ xpEarned }} XP</p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1"
                  >
                    Expérience Gagnée
                  </p>
                </div>
              </div>

              <!-- Penalty Summary -->
              <div class="text-xs font-semibold text-rose-400/90 font-display">
                ⚠️ Total de pénalités : {{ penaltiesSeconds }} secondes (-{{ penaltiesSeconds / 5 }}
                erreurs)
              </div>

              <!-- Action buttons -->
              <div class="pt-4 w-full max-w-sm space-y-3">
                <UButton
                  size="lg"
                  color="primary"
                  block
                  :loading="loading"
                  icon="i-heroicons-arrow-path"
                  class="font-black font-display uppercase tracking-widest py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                  @click="startNewRun"
                >
                  Recommencer
                </UButton>
                <UButton
                  to="/series/speedrun"
                  color="neutral"
                  variant="ghost"
                  block
                  class="font-bold text-xs uppercase tracking-wider"
                >
                  Retour aux classements
                </UButton>
              </div>
            </div>
          </template>
        </template>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ResponseDTO } from "#shared/DTO/responseDTO";
import type { SeriesResponseDTO } from "#shared/DTO/seriesResponseDTO";
import { QuestionDTO } from "#shared/question";
import { useUserStore } from "~/stores/userStore";
import { useAchievementStore } from "~/stores/achievementsStore";

const userStore = useUserStore();
const achievementStore = useAchievementStore();
await userStore.fetchUser();
const user = computed(() => userStore.user);

const question = ref<QuestionDTO | null>(null);
const loading = ref(false);
const initializing = ref(true);
const seriesStarted = ref(false);
const showBottomNav = useState("showBottomNav", () => true);

const userSeries = ref<UserSpeedrunSurvivalDTO | null>(null);

// Chronometer tracking
const timeLeft = ref(120);
let timerInterval: any = null;
const showPenaltyFlash = ref(false);

const currentScore = computed(() => {
  return userSeries.value?.userResponse?.data?.score ?? 0;
});

const finalScore = computed(() => {
  return userSeries.value?.userResponse?.data?.score ?? 0;
});

const xpEarned = computed(() => {
  return userSeries.value?.userResponse?.data?.xpEarned ?? 0;
});

const penaltiesSeconds = computed(() => {
  return userSeries.value?.userResponse?.data?.penalties ?? 0;
});

const isEnded = computed(() => {
  return !!userSeries.value?.userResponse?.data?.ended || timeLeft.value <= 0;
});

const isGameActive = computed(() => {
  return seriesStarted.value && !isEnded.value;
});

// Watch game active status to hide/show navigation bar
watch(
  isGameActive,
  (active) => {
    showBottomNav.value = !active;
    if (active) {
      startClientTimer();
    } else {
      stopClientTimer();
    }
  },
  { immediate: true },
);

watch(isEnded, (ended) => {
  if (ended) {
    achievementStore.checkSpeedrun();
  }
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
  stopClientTimer();
});

// Fetch active run if any
onMounted(async () => {
  try {
    const activeRun = await $fetch<UserSpeedrunSurvivalDTO>("/api/series/speedrun/survival");
    if (activeRun && activeRun.userResponse && !activeRun.userResponse.data.ended) {
      userSeries.value = activeRun;
      // Sync remaining time
      const elapsedMs = Date.now() - new Date(activeRun.userResponse.createDate).getTime();
      const limit = 120 - activeRun.userResponse.data.penalties;
      const remain = limit - elapsedMs / 1000;
      if (remain > 0) {
        timeLeft.value = remain;
        seriesStarted.value = true;
        await nextQuestion();
      } else {
        // Already expired, start new run directly
        await startNewRun();
      }
    } else {
      // No active run, start new run directly
      await startNewRun();
    }
  } catch (e) {
    console.error("Failed to load active speedrun run:", e);
    // If it failed, attempt to start a new run
    await startNewRun();
  } finally {
    initializing.value = false;
  }
});

async function startNewRun() {
  try {
    loading.value = true;
    stopClientTimer();
    timeLeft.value = 120;

    const newRun = await $fetch<UserSpeedrunSurvivalDTO>("/api/series/speedrun/survival/new", {
      method: "post",
    });
    userSeries.value = newRun;
    seriesStarted.value = true;
    await nextQuestion();
  } catch (e) {
    console.error("Failed to start new speedrun run:", e);
  } finally {
    loading.value = false;
  }
}

async function nextQuestion() {
  if (isEnded.value) return;
  try {
    loading.value = true;
    const nextQId = userSeries.value?.userResponse?.data?.nextQuestion;
    if (!nextQId) return;

    question.value = await $fetch<QuestionDTO>("/api/question", {
      query: { id: nextQId },
    });
  } catch (e) {
    console.error("Failed to load next question:", e);
  } finally {
    loading.value = false;
  }
}

async function validateResponse(response: ResponseDTO) {
  try {
    loading.value = true;
    if (!userSeries.value || isEnded.value) return;

    const currentPenaltiesBefore = penaltiesSeconds.value;

    const submitResponse = {
      seriesId: userSeries.value.series.id,
      questionId: response.questionId,
      userResponseId: response.userResponseId,
    } as SeriesResponseDTO;

    const updatedResponse = await $fetch<any>("/api/series/speedrun/survival/response", {
      method: "post",
      body: submitResponse,
    });

    userSeries.value = {
      ...userSeries.value,
      userResponse: updatedResponse,
    };

    // If penalties increased, show red flash
    if (penaltiesSeconds.value > currentPenaltiesBefore) {
      triggerPenaltyFlash();
    }
  } catch (e) {
    console.error("Failed to validate response:", e);
  } finally {
    loading.value = false;
  }
}

// Timer management
function startClientTimer() {
  stopClientTimer();
  if (!userSeries.value?.userResponse) return;

  const createTime = new Date(userSeries.value.userResponse.createDate).getTime();

  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - createTime;
    const limit = 120 - penaltiesSeconds.value;
    const remain = limit - elapsedMs / 1000;

    if (remain <= 0) {
      timeLeft.value = 0;
      stopClientTimer();
      // Notify server of termination or refresh state
      if (userSeries.value?.userResponse) {
        userSeries.value.userResponse.data.ended = true;
      }
    } else {
      timeLeft.value = remain;
    }
  }, 100);
}

function stopClientTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function triggerPenaltyFlash() {
  showPenaltyFlash.value = true;
  const { playSound } = useAudio();
  try {
    playSound("response-error");
  } catch (e) {
    // Audio might not be available or blocked
  }

  setTimeout(() => {
    showPenaltyFlash.value = false;
  }, 800);
}
</script>

<script lang="ts">
// Make sure full-screen metadata is set to hide top headers if desired (same as multiplayer)
export default {
  definePageMeta: {
    fullscreen: false,
  },
};
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

@keyframes fade-out-anim {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.animate-fade-out {
  animation: fade-out-anim 0.8s forwards;
}

@keyframes scale-up-anim {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.scale-up {
  animation: scale-up-anim 0.4s ease-out forwards;
}
</style>
