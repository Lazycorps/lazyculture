<template>
  <div class="flex-1 flex flex-col min-h-0 select-none pb-12">
    <!-- Map Header -->
    <div class="flex-shrink-0 flex items-center space-x-4 mb-4">
      <UButton
        to="/adventure"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="hover:bg-white/5 text-gray-400 hover:text-white rounded-xl"
      >
        Retour aux Aventures
      </UButton>
    </div>

    <!-- Adventure Premium Card Header -->
    <div
      v-if="pathDetails"
      class="flex-shrink-0 relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 md:p-8 shadow-glass mb-8 flex flex-col md:flex-row items-center md:justify-between gap-6"
    >
      <!-- Background glow or card illustration background -->
      <div class="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <img
          :src="getThemePicture(pathDetails.themeSlug)"
          alt=""
          class="w-full h-full object-cover filter blur-[2px] scale-105"
        />
        <div
          class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"
        ></div>
      </div>

      <div class="relative z-10 flex-1 space-y-4 w-full">
        <div>
          <span
            class="text-xs text-violet-400 font-extrabold font-display uppercase tracking-wider"
          >
            Aventure : {{ getThemeName(pathDetails.themeSlug) }}
          </span>
          <h2 class="text-2xl md:text-3xl font-black font-display text-white mt-1">
            {{ pathDetails.title }}
          </h2>
        </div>

        <!-- Progress Bar & Count -->
        <div class="space-y-2 max-w-md">
          <div class="flex justify-between text-xs font-bold font-display text-gray-300">
            <span
              >Progression :
              {{
                pathDetails.completed ? "Complété ! 🎉" : `Étape ${currentStage} / ${totalStages}`
              }}</span
            >
            <span>{{ percentProgress }}%</span>
          </div>
          <div
            class="w-full h-3 bg-slate-950/85 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
          >
            <div
              class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500 shadow-neon"
              :style="{ width: `${percentProgress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Stats / Performance Box -->
      <div
        class="relative z-10 bg-slate-950/70 border border-white/5 backdrop-blur-md rounded-2xl p-4 flex flex-row md:flex-col gap-4 text-center justify-around w-full md:w-auto md:min-w-[180px]"
      >
        <div class="flex flex-col items-center">
          <span class="text-2xl">🏆</span>
          <span
            class="text-[10px] text-gray-400 uppercase font-semibold font-display tracking-wider mt-1"
            >Score Perfect</span
          >
          <span class="text-sm font-black text-amber-400 font-display">
            {{ perfectStagesCount }} / {{ totalStages }}
          </span>
        </div>

        <div class="w-px md:w-full h-8 md:h-px bg-white/10"></div>

        <div class="flex flex-col items-center">
          <span class="text-2xl">✨</span>
          <span
            class="text-[10px] text-gray-400 uppercase font-semibold font-display tracking-wider mt-1"
            >Statut</span
          >
          <span
            class="text-xs font-black font-display uppercase mt-0.5"
            :class="pathDetails.completed ? 'text-emerald-400' : 'text-violet-400'"
          >
            {{ pathDetails.completed ? "Validé" : "En cours" }}
          </span>
        </div>
      </div>
    </div>

    <!-- Map Area -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-violet-400" />
    </div>

    <div
      v-else
      class="flex-1 flex flex-col items-center justify-start relative max-w-lg mx-auto w-full px-4 py-8"
    >
      <!-- Background glows -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div
          class="absolute top-1/4 left-[10%] w-72 h-72 rounded-full bg-violet-600/5 blur-[100px] animate-pulse-slow"
        ></div>
        <div
          class="absolute top-2/3 right-[10%] w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px] animate-pulse-slower"
        ></div>
      </div>

      <!-- Floating decoration icons -->
      <div
        class="absolute left-[-100px] top-[15%] text-3xl opacity-20 animate-float-slow select-none hidden lg:block pointer-events-none"
      >
        💡
      </div>
      <div
        class="absolute right-[-100px] top-[40%] text-4xl opacity-15 animate-float-normal select-none hidden lg:block pointer-events-none"
      >
        📚
      </div>
      <div
        class="absolute left-[-120px] top-[60%] text-3xl opacity-20 animate-float-slower select-none hidden lg:block pointer-events-none"
      >
        🧠
      </div>
      <div
        class="absolute right-[-80px] top-[80%] text-4xl opacity-15 animate-float-slow select-none hidden lg:block pointer-events-none"
      >
        🏆
      </div>

      <!-- Winding Path Column -->
      <div ref="containerRef" class="relative w-full flex flex-col items-center py-12 space-y-12">
        <!-- Connecting SVG Path for Candy Crush feel -->
        <svg
          class="absolute top-0 bottom-0 left-0 right-0 w-full h-full pointer-events-none"
          style="z-index: 0"
        >
          <defs>
            <linearGradient id="progress-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#6366f1" />
            </linearGradient>
          </defs>
          <!-- Locked/Future path -->
          <path
            :d="pathSvgD"
            fill="none"
            stroke-width="6"
            stroke-dasharray="8 8"
            class="stroke-slate-800"
          />
          <!-- Completed/Active path overlay -->
          <path
            v-if="progressSvgD"
            :d="progressSvgD"
            fill="none"
            stroke="url(#progress-gradient)"
            stroke-width="6"
            stroke-dasharray="6 6"
            class="stroke-violet-500 stroke-dash-animated"
            style="filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))"
          />
        </svg>

        <!-- Stage Nodes & Chapter Dividers -->
        <template v-for="(stage, index) in reversedStages" :key="stage.id">
          <!-- Dynamic Chapter Divider (Placed ABOVE the stage in DOM, representing chapter transition after the control) -->
          <div
            v-if="shouldShowDividerAbove(stage)"
            class="w-full flex items-center justify-center py-6 select-none"
            style="z-index: 5"
          >
            <div class="flex items-center space-x-4 w-full max-w-[280px]">
              <div class="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
              <div
                class="px-3 py-1 rounded-full bg-slate-950/80 border border-white/5 backdrop-blur-md text-[9px] font-black font-display uppercase tracking-widest text-violet-300"
              >
                Chapitre {{ getChapterNumber(stage) }}
              </div>
              <div class="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
            </div>
          </div>

          <!-- Stage Node Wrapper -->
          <div
            :id="'stage-node-' + stage.sequence"
            class="relative flex items-center justify-center transition-all duration-300"
            :style="{
              transform: `translateX(${getXOffset(reversedStages.length - 1 - index)}px)`,
              zIndex: 10,
            }"
          >
            <!-- Node Container -->
            <div class="flex flex-col items-center relative">
              <!-- Mascot Standing Above Active Stage -->
              <div
                v-if="isActive(stage.sequence)"
                class="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none select-none"
              >
                <!-- Avatar circle -->
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border-2 border-white shadow-neon flex items-center justify-center animate-bob"
                >
                  <span class="text-xs font-black text-white uppercase select-none">
                    {{ userStore.username ? userStore.username[0] : "🦥" }}
                  </span>
                </div>
              </div>

              <!-- Node Button -->
              <button
                :disabled="isLocked(stage.sequence)"
                class="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all"
                :class="getNodeClass(stage)"
                @click="selectStage(stage)"
              >
                <!-- Locked state icon -->
                <UIcon
                  v-if="isLocked(stage.sequence)"
                  name="i-heroicons-lock-closed"
                  class="text-lg text-slate-600"
                />

                <template v-else>
                  <!-- Completed Icon / Score -->
                  <template v-if="isCompleted(stage.sequence)">
                    <span
                      v-if="isCompletedButNotPerfect(stage)"
                      class="text-[10px] md:text-xs font-black font-display text-white"
                    >
                      {{ getStageScore(stage.sequence) }}/{{ getStageMaxQuestions(stage.type) }}
                    </span>
                    <UIcon v-else name="i-heroicons-check" class="text-2xl text-white font-bold" />
                  </template>

                  <!-- Active Node Icon based on type -->
                  <span v-else class="flex items-center justify-center">
                    <UIcon
                      v-if="stage.type === 'CONTROL'"
                      name="i-heroicons-academic-cap"
                      class="text-2xl text-white"
                    />
                    <UIcon
                      v-else-if="stage.type === 'EXAM'"
                      name="i-heroicons-trophy"
                      class="text-2xl text-white"
                    />
                    <span v-else class="text-sm font-extrabold font-display text-white">
                      {{ stage.sequence }}
                    </span>
                  </span>
                </template>

                <!-- Pulse rings for current active stage -->
                <span
                  v-if="isActive(stage.sequence)"
                  class="absolute -inset-1 rounded-full border border-violet-500/50 animate-ping opacity-60 pointer-events-none"
                ></span>
              </button>

              <!-- Node Label -->
              <span
                class="mt-2 text-[10px] md:text-xs font-black font-display tracking-wide uppercase px-2 py-0.5 rounded-full select-none"
                :class="getLabelClass(stage)"
              >
                {{
                  stage.type === "STEP"
                    ? `Étape ${stage.sequence}`
                    : stage.type === "CONTROL"
                      ? "Contrôle"
                      : "Examen"
                }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Duolingo-style bottom slide-up drawer for details -->
    <Transition name="slide-up">
      <div
        v-if="selectedStage"
        class="fixed bottom-0 left-0 right-0 z-50 bg-[#0c1020]/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl py-6 px-4 md:px-8"
      >
        <div class="max-w-md mx-auto space-y-4">
          <!-- Drawer Header -->
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-lg font-black font-display text-white">
                {{ selectedStage.title }}
              </h3>
              <p class="text-xs text-gray-400 font-semibold font-display">
                {{ getStageTypeDescription(selectedStage.type) }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="hover:bg-white/5 rounded-full"
              @click="selectedStage = null"
            />
          </div>

          <!-- Stage Info details -->
          <div
            class="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold font-display text-gray-300"
          >
            <div class="flex items-center space-x-2">
              <span class="text-lg">❓</span>
              <div>
                <p class="text-[10px] text-gray-400 uppercase">Questions</p>
                <p class="text-white">{{ getQuestionsCount(selectedStage.type) }} questions</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-lg">🎯</span>
              <div>
                <p class="text-[10px] text-gray-400 uppercase">Objectif</p>
                <p class="text-violet-400">>= 80% de bonnes réponses</p>
              </div>
            </div>
          </div>

          <!-- Status / Replay Info -->
          <p
            v-if="isCompleted(selectedStage.sequence)"
            class="text-xs text-center font-bold font-display"
            :class="isCompletedButNotPerfect(selectedStage) ? 'text-amber-500' : 'text-emerald-400'"
          >
            ✓ Étape validée avec un score de {{ getStageScore(selectedStage.sequence) }} /
            {{ getStageMaxQuestions(selectedStage.type) }} ! Vous pouvez y rejouer pour vous
            entraîner.
          </p>

          <!-- Play Button -->
          <UButton
            block
            color="primary"
            size="lg"
            class="font-black font-display uppercase tracking-widest py-3 justify-center rounded-xl shadow-lg shadow-violet-600/20"
            @click="playStage"
          >
            {{ isCompleted(selectedStage.sequence) ? "Rejouer" : "Jouer" }}
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useUserStore } from "~/stores/userStore";

const route = useRoute();
const router = useRouter();

const pathId = Number(route.params.id);

const pathDetails = ref<any>(null);
const themes = ref<any[]>([]);
const loading = ref(true);
const selectedStage = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const points = ref<{ x: number; y: number }[]>([]);

const userStore = useUserStore();
let resizeObserver: ResizeObserver | null = null;

function updatePoints() {
  const container = containerRef.value;
  if (!container || !pathDetails.value?.stages) return;

  const containerRect = container.getBoundingClientRect();
  const newPoints: { x: number; y: number }[] = [];

  for (const stage of reversedStages.value) {
    const el = document.getElementById(`stage-node-${stage.sequence}`);
    if (el) {
      const button = el.querySelector("button");
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - containerRect.left;
        const y = rect.top + rect.height / 2 - containerRect.top;
        newPoints.push({ x, y });
      }
    }
  }
  points.value = newPoints;
}

onMounted(async () => {
  try {
    const [pathData, themesData] = await Promise.all([
      $fetch<any>(`/api/adventures/${pathId}`),
      $fetch<any[]>("/api/theme/all"),
    ]);
    pathDetails.value = pathData;
    themes.value = themesData;

    loading.value = false;
    await nextTick();
    scrollToActiveStage();

    if (containerRef.value) {
      updatePoints();
      resizeObserver = new ResizeObserver(() => {
        updatePoints();
      });
      resizeObserver.observe(containerRef.value);
    }
  } catch (e) {
    console.error("Error loading path map:", e);
    router.push("/adventure");
    loading.value = false;
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

function scrollToActiveStage() {
  const current = pathDetails.value?.currentStage ?? 1;
  const completed = pathDetails.value?.completed ?? false;
  const targetSeq = completed ? 1 : current;

  const el = document.getElementById(`stage-node-${targetSeq}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Reverse stages list to draw Stage 1 at the bottom (Candy Crush style)
const reversedStages = computed(() => {
  if (!pathDetails.value?.stages) return [];
  return [...pathDetails.value.stages].reverse();
});

const totalStages = computed(() => pathDetails.value?.stages?.length ?? 0);
const currentStage = computed(() => {
  if (pathDetails.value?.completed) return totalStages.value;
  return pathDetails.value?.currentStage ?? 1;
});

const percentProgress = computed(() => {
  if (totalStages.value === 0) return 0;
  if (pathDetails.value?.completed) return 100;
  return Math.min(Math.round(((currentStage.value - 1) / totalStages.value) * 100), 99);
});

const perfectStagesCount = computed(() => {
  if (!pathDetails.value?.stages) return 0;
  let count = 0;
  for (const stage of pathDetails.value.stages) {
    const score = getStageScore(stage.sequence);
    if (score !== null) {
      const max = getStageMaxQuestions(stage.type);
      if (score === max) {
        count++;
      }
    }
  }
  return count;
});

function getThemeName(slug: string) {
  const theme = themes.value?.find((t) => t.slug === slug);
  return theme?.name || slug;
}

function getThemePicture(slug: string) {
  const theme = themes.value?.find((t) => t.slug === slug);
  return (
    theme?.picture ||
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg"
  );
}

// Winding Sine-wave offsets
const getXOffset = (index: number) => {
  return Math.sin(index * 0.9) * 60;
};

watch(reversedStages, async () => {
  await nextTick();
  updatePoints();
});

// Generate SVG curve D path connecting nodes
const pathSvgD = computed(() => {
  if (points.value.length === 0) return "";
  let d = "";

  // Generate smooth cubic bezier curves or straight lines
  if (points.value[0]) {
    d = `M ${points.value[0].x} ${points.value[0].y}`;
    for (let i = 1; i < points.value.length; i++) {
      const p0 = points.value[i - 1]!;
      const p1 = points.value[i]!;
      // Control points for smooth winding
      const cy = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${cy}, ${p1.x} ${cy}, ${p1.x} ${p1.y}`;
    }
  }

  return d;
});

// Calculate slice of coordinates representing user progression
const progressPoints = computed(() => {
  if (points.value.length === 0 || !pathDetails.value) return [];
  const current = pathDetails.value.currentStage ?? 1;
  const completed = pathDetails.value.completed ?? false;

  if (completed) {
    return [...points.value].reverse();
  }

  const startIndex = points.value.length - 1;
  const endIndex = points.value.length - current;

  if (endIndex < 0 || endIndex >= points.value.length) return [];

  const slice = points.value.slice(endIndex, startIndex + 1);
  return slice.reverse();
});

// Generate SVG curve for completed stage nodes
const progressSvgD = computed(() => {
  if (progressPoints.value.length === 0) return "";
  let d = "";
  const pts = progressPoints.value;
  if (pts[0]) {
    d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]!;
      const p1 = pts[i]!;
      const cy = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${cy}, ${p1.x} ${cy}, ${p1.x} ${p1.y}`;
    }
  }
  return d;
});

// Helper functions for stage states
const isLocked = (seq: number) => {
  const current = pathDetails.value?.currentStage ?? 1;
  const completed = pathDetails.value?.completed ?? false;
  return seq > current && !completed;
};

const isCompleted = (seq: number) => {
  const current = pathDetails.value?.currentStage ?? 1;
  const completed = pathDetails.value?.completed ?? false;
  return seq < current || completed;
};

const isActive = (seq: number) => {
  const current = pathDetails.value?.currentStage ?? 1;
  const completed = pathDetails.value?.completed ?? false;
  return seq === current && !completed;
};

function getStageScore(seq: number) {
  return pathDetails.value?.stageScores?.[seq.toString()] ?? null;
}

function getStageMaxQuestions(type: string) {
  if (type === "STEP") return 5;
  if (type === "CONTROL") return 10;
  return 20;
}

function isCompletedButNotPerfect(stage: any) {
  if (!isCompleted(stage.sequence)) return false;
  const score = getStageScore(stage.sequence);
  if (score === null) return false;
  const max = getStageMaxQuestions(stage.type);
  return score < max;
}

// Return classes for visual node styling
function getNodeClass(stage: any) {
  const seq = stage.sequence;
  if (isLocked(seq)) {
    return "bg-slate-900 border-t border-x border-b-4 border-slate-950 text-slate-700 cursor-not-allowed";
  }
  if (isCompleted(seq)) {
    if (isCompletedButNotPerfect(stage)) {
      return "bg-amber-500 border-t-2 border-x-2 border-b-6 border-amber-400 border-b-amber-700 text-white shadow-lg shadow-amber-500/20 hover:brightness-110 active:translate-y-[4px] active:border-b-2 transition-all duration-75";
    }
    return "bg-emerald-500 border-t-2 border-x-2 border-b-6 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:translate-y-[4px] active:border-b-2 transition-all duration-75";
  }
  // Active
  return "bg-violet-600 border-t-2 border-x-2 border-b-6 border-violet-400 border-b-violet-800 text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:translate-y-[4px] active:border-b-2 transition-all duration-75 relative";
}

function getLabelClass(stage: any) {
  const seq = stage.sequence;
  if (isLocked(seq)) return "text-gray-600 bg-white/5";
  if (isCompleted(seq)) {
    if (isCompletedButNotPerfect(stage)) {
      return "text-amber-500 bg-amber-500/10";
    }
    return "text-emerald-400 bg-emerald-500/10";
  }
  return "text-violet-400 bg-violet-500/10";
}

function selectStage(stage: any) {
  if (isLocked(stage.sequence)) return;
  selectedStage.value = stage;
}

function getStageTypeDescription(type: string) {
  if (type === "STEP") return "Étape classique";
  if (type === "CONTROL") return "Contrôle thématique (aléatoire)";
  return "Grand Examen cumulatif (aléatoire)";
}

function getQuestionsCount(type: string) {
  if (type === "STEP") return 5;
  if (type === "CONTROL") return 10;
  return 20;
}

function playStage() {
  if (!selectedStage.value) return;
  router.push(`/adventure/${pathId}/play/${selectedStage.value.sequence}`);
}

function shouldShowDividerAbove(stage: any) {
  return stage.type === "CONTROL" && stage.sequence < totalStages.value;
}

function getChapterNumber(stage: any) {
  if (!pathDetails.value?.stages) return 1;
  const controlsCount = pathDetails.value.stages.filter(
    (s: any) => s.type === "CONTROL" && s.sequence <= stage.sequence,
  ).length;
  return controlsCount + 1;
}
</script>

<style scoped>
/* slide-up transition for the drawer */
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s linear;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@keyframes float-slow {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-15px) rotate(5deg);
  }
}
@keyframes float-normal {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-12px) rotate(-8deg);
  }
}
@keyframes float-slower {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(3deg);
  }
}
.animate-float-slow {
  animation: float-slow 8s ease-in-out infinite;
}
.animate-float-normal {
  animation: float-normal 6s ease-in-out infinite;
}
.animate-float-slower {
  animation: float-slower 10s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}
@keyframes pulse-slower {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}
.animate-pulse-slower {
  animation: pulse-slower 12s ease-in-out infinite;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
.animate-bob {
  animation: bob 2s ease-in-out infinite;
}

@keyframes bounce-gentle {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
.animate-bounce-gentle {
  animation: bounce-gentle 1.5s ease-in-out infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -24;
  }
}
.stroke-dash-animated {
  animation: dash 1.5s linear infinite;
}
</style>
