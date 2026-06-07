<template>
  <div class="flex-1 flex flex-col min-h-0 select-none pb-12">
    <!-- Map Header -->
    <div class="flex items-center space-x-4 mb-8">
      <UButton
        to="/adventure"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="hover:bg-white/5 text-gray-400 hover:text-white rounded-xl"
      >
        Retour
      </UButton>
      <div class="overflow-hidden">
        <h2 class="text-xl md:text-2xl font-black font-display text-white truncate">
          {{ pathDetails?.title || "Chargement..." }}
        </h2>
        <p class="text-xs text-violet-400 font-semibold font-display uppercase tracking-wider">
          Carte de l'Aventure
        </p>
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
      <!-- Winding Path Column -->
      <div ref="containerRef" class="relative w-full flex flex-col items-center py-12 space-y-12">
        <!-- Connecting SVG Path for Candy Crush feel -->
        <svg
          class="absolute top-0 bottom-0 left-0 right-0 w-full h-full pointer-events-none stroke-slate-800"
          style="z-index: 0"
        >
          <path
            :d="pathSvgD"
            fill="none"
            stroke-width="6"
            stroke-dasharray="8 8"
            class="stroke-violet-500/20"
          />
        </svg>

        <!-- Stage Nodes -->
        <div
          v-for="(stage, index) in reversedStages"
          :key="stage.id"
          :id="'stage-node-' + stage.sequence"
          class="relative flex items-center justify-center transition-all duration-300"
          :style="{
            transform: `translateX(${getXOffset(reversedStages.length - 1 - index)}px)`,
            zIndex: 10,
          }"
        >
          <!-- Node Container -->
          <div class="flex flex-col items-center">
            <!-- Node Button -->
            <button
              :disabled="isLocked(stage.sequence)"
              class="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all duration-200"
              :class="getNodeClass(stage)"
              @click="selectStage(stage)"
            >
              <!-- Completed Icon / Score -->
              <template v-if="isCompleted(stage.sequence)">
                <span
                  v-if="isCompletedButNotPerfect(stage)"
                  class="text-[10px] md:text-xs font-black font-display text-amber-500"
                >
                  {{ getStageScore(stage.sequence) }}/{{ getStageMaxQuestions(stage.type) }}
                </span>
                <UIcon
                  v-else
                  name="i-heroicons-check-circle-20-solid"
                  class="text-2xl text-emerald-400"
                />
              </template>
              <!-- Active Node Icon based on type -->
              <span v-else class="flex items-center justify-center">
                <UIcon
                  v-if="stage.type === 'CONTROL'"
                  name="i-heroicons-academic-cap"
                  class="text-2xl"
                  :class="isLocked(stage.sequence) ? 'text-gray-500' : 'text-violet-200'"
                />
                <UIcon
                  v-else-if="stage.type === 'EXAM'"
                  name="i-heroicons-trophy"
                  class="text-2xl"
                  :class="isLocked(stage.sequence) ? 'text-gray-500' : 'text-amber-300'"
                />
                <span v-else class="text-sm font-extrabold font-display">
                  {{ stage.sequence }}
                </span>
              </span>

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

const route = useRoute();
const router = useRouter();

const pathId = Number(route.params.id);

const pathDetails = ref<any>(null);
const loading = ref(true);
const selectedStage = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const points = ref<{ x: number; y: number }[]>([]);

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
    pathDetails.value = await $fetch(`/api/adventures/${pathId}`);
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
    return "bg-slate-900 border-white/5 text-gray-500 cursor-not-allowed";
  }
  if (isCompleted(seq)) {
    if (isCompletedButNotPerfect(stage)) {
      return "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-500/20";
    }
    return "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-500/20";
  }
  // Active
  return "bg-violet-600 border-violet-400 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95";
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
</style>
