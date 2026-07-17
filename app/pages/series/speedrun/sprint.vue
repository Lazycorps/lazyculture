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
        +5s
      </div>
    </div>

    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2 relative overflow-hidden"
    >
      <!-- Background subtle glow -->
      <div
        class="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none"
      ></div>

      <!-- Non-authenticated user view -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl text-indigo-400 mx-auto animate-pulse"
          >
            🔒
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Sprint 20</h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Relevez le défi de rapidité ultime de LazyCulture. Connectez-vous pour jouer et
              inscrire votre chrono au classement !
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
          <UIcon name="i-heroicons-arrow-path" class="text-4xl text-indigo-500 animate-spin" />
          <p
            class="text-xs text-gray-400 font-display font-bold uppercase tracking-wider animate-pulse"
          >
            Initialisation du Sprint...
          </p>
        </div>

        <template v-else>
          <!-- Game Header (Chrono & Score Tracker) -->
          <div class="flex flex-col space-y-4 mb-6" v-if="isGameActive">
            <div class="flex justify-between items-center">
              <!-- Title -->
              <div class="flex items-center space-x-2">
                <span class="text-2xl">🏁</span>
                <h2 class="text-lg font-black font-display text-white tracking-wide uppercase">
                  Sprint 20
                </h2>
              </div>

              <!-- Progress Score Badge -->
              <div
                class="flex items-center bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-400"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider font-display mr-1.5"
                  >Progrès</span
                >
                <span class="text-base font-black font-display">{{ currentScore }} / 20</span>
              </div>
            </div>

            <!-- Chrono display -->
            <div class="space-y-2">
              <div class="flex justify-between items-end">
                <span class="text-xs font-bold text-gray-400 font-display"
                  >Temps écoulé (avec pénalités)</span
                >
                <!-- Digital Timer -->
                <span class="text-2xl font-black font-display text-indigo-400 animate-pulse">
                  {{ formatTime(displayTimeMs) }}
                </span>
              </div>
              <!-- Custom Premium Glass Progress Bar (Target: 20 correct answers) -->
              <div
                class="w-full h-3 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full rounded-full transition-all duration-300 shadow-neon bg-gradient-to-r from-indigo-600 to-cyan-500"
                  :style="{ width: `${(currentScore / 20) * 100}%` }"
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

              <!-- Start/Resume Lobby Screen (Fallback) -->
              <div v-else class="text-center py-8 space-y-6 flex flex-col items-center">
                <div class="relative">
                  <div
                    class="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-125"
                  ></div>
                  <div
                    class="relative w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl text-indigo-400"
                  >
                    🏁
                  </div>
                </div>

                <div class="space-y-2">
                  <h3 class="text-2xl font-black font-display text-white tracking-wide uppercase">
                    Prêt pour le Sprint ?
                  </h3>
                  <p class="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Atteignez exactement 20 bonnes réponses le plus vite possible. Chaque mauvaise
                    réponse vous inflige +5 secondes de pénalité !
                  </p>
                </div>

                <div class="pt-4 w-full max-w-xs space-y-3">
                  <UButton
                    size="lg"
                    color="primary"
                    block
                    :loading="loading"
                    icon="i-heroicons-play-solid"
                    class="font-black font-display uppercase tracking-widest py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500"
                    @click="startNewRun"
                  >
                    Démarrer le Sprint
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
              <!-- Glowing Trophy icon -->
              <div class="relative">
                <div class="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-125"></div>
                <div
                  class="relative w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl text-amber-400"
                >
                  🏆
                </div>
              </div>

              <div class="space-y-1">
                <h3 class="text-2xl font-black font-display text-white tracking-wide uppercase">
                  Sprint Terminé !
                </h3>
                <p class="text-xs text-gray-400 max-w-sm">
                  Félicitations ! Vous avez validé vos 20 bonnes réponses.
                </p>
              </div>

              <!-- Stats Recap Grid -->
              <div class="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                <div
                  class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-center"
                >
                  <p class="text-2xl font-black font-display text-indigo-400">
                    {{ formatTime(displayTimeMs) }}
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1"
                  >
                    Chrono Final
                  </p>
                </div>
                <div
                  class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-center"
                >
                  <p class="text-2xl font-black font-display text-amber-400">+{{ xpEarned }} XP</p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1"
                  >
                    Expérience Gagnée
                  </p>
                </div>
              </div>

              <!-- Penalty Summary -->
              <div class="text-xs font-semibold text-rose-400/90 font-display">
                ⚠️ Pénalités accumulées : +{{ penaltiesSeconds }}s (+{{ penaltiesSeconds / 5 }}
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
                  class="font-black font-display uppercase tracking-widest py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500"
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
const seriesStarted = ref(false);
const showBottomNav = useState("showBottomNav", () => true);

const userSeries = ref<UserSpeedrunSprintDTO | null>(null);

// Chronometer tracking (in milliseconds)
const displayTimeMs = ref(0);
let timerInterval: any = null;
const showPenaltyFlash = ref(false);
const initializing = ref(true);

const currentScore = computed(() => {
  return userSeries.value?.userResponse?.data?.score ?? 0;
});

const xpEarned = computed(() => {
  return userSeries.value?.userResponse?.data?.xpEarned ?? 0;
});

const penaltiesSeconds = computed(() => {
  return userSeries.value?.userResponse?.data?.penalties ?? 0;
});

const isEnded = computed(() => {
  return !!userSeries.value?.userResponse?.data?.ended;
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
    const activeRun = await $fetch<UserSpeedrunSprintDTO>("/api/series/speedrun/sprint");
    if (activeRun && activeRun.userResponse && !activeRun.userResponse.data.ended) {
      userSeries.value = activeRun;
      // Sync initial elapsed time
      const elapsedMs = Date.now() - new Date(activeRun.userResponse.createDate).getTime();
      const penaltiesMs = activeRun.userResponse.data.penalties * 1000;
      displayTimeMs.value = elapsedMs + penaltiesMs;
      seriesStarted.value = true;
      await nextQuestion();
    } else {
      // Auto start new run
      await startNewRun();
    }
  } catch (e) {
    console.error("Failed to load active speedrun run:", e);
    await startNewRun();
  } finally {
    initializing.value = false;
  }
});

async function startNewRun() {
  try {
    loading.value = true;
    stopClientTimer();
    displayTimeMs.value = 0;

    const newRun = await $fetch<UserSpeedrunSprintDTO>("/api/series/speedrun/sprint/new", {
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

    const updatedResponse = await $fetch<any>("/api/series/speedrun/sprint/response", {
      method: "post",
      body: submitResponse,
    });

    userSeries.value = {
      ...userSeries.value,
      userResponse: updatedResponse,
    };

    // If penalties increased, show red flash +5s
    if (penaltiesSeconds.value > currentPenaltiesBefore) {
      triggerPenaltyFlash();
    }

    if (isEnded.value) {
      // Sync final time
      displayTimeMs.value = Number(updatedResponse.result);
      stopClientTimer();
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
    const penaltiesMs = penaltiesSeconds.value * 1000;
    displayTimeMs.value = elapsedMs + penaltiesMs;
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

function formatTime(ms: number) {
  if (!ms) return "0.0s";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toFixed(1)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}
</script>

<script lang="ts">
export default {
  definePageMeta: {
    fullscreen: false,
  },
};
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
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
