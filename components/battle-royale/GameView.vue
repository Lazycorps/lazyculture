<template>
  <div class="w-full flex flex-col space-y-5 select-none" v-if="question">
    <!-- Header: Round Info, Lives, Timer -->
    <div
      class="flex flex-col space-y-3 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass"
    >
      <div class="flex justify-between items-center">
        <!-- Round Badge -->
        <div class="space-y-0.5">
          <p class="text-[10px] font-black uppercase text-violet-400 font-display tracking-widest">
            Survie Multijoueur
          </p>
          <h2 class="text-lg font-black font-display text-white tracking-wide">
            ROUND {{ round }}
          </h2>
        </div>

        <!-- Timer Circle -->
        <div class="relative w-12 h-12 flex items-center justify-center font-display">
          <svg class="absolute w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="rgba(255,255,255,0.05)"
              stroke-width="3"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              :stroke="timerColor"
              stroke-width="3"
              fill="transparent"
              :stroke-dasharray="2 * Math.PI * 20"
              :stroke-dashoffset="dashOffset"
              class="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span class="text-sm font-black" :class="timerTextColor">
            {{ timeLeft }}
          </span>
        </div>

        <!-- Vies (Hearts) -->
        <div
          class="flex items-center space-x-1 bg-slate-950/40 px-3 py-1.5 rounded-full border border-white/5"
        >
          <span class="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1.5"
            >Vies:</span
          >
          <UIcon
            v-for="h in 3"
            :key="h"
            name="i-heroicons-heart-solid"
            class="text-xl transition-all duration-300"
            :class="[
              h > myLives ? 'text-slate-800 scale-90' : 'text-rose-500',
              myLives === 1 && h === 1
                ? 'animate-pulse text-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                : '',
            ]"
          />
        </div>
      </div>

      <!-- Question Progress Bar (how many players answered) -->
      <div class="space-y-1">
        <div class="flex justify-between text-[10px] font-bold text-gray-400">
          <span>Réponses reçues : {{ answersCount }} / {{ aliveCount }}</span>
          <span
            v-if="answersCount === aliveCount"
            class="text-emerald-400 animate-pulse uppercase tracking-wider"
            >Résolution...</span
          >
        </div>
        <div
          class="w-full h-1.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden"
        >
          <div
            class="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-300"
            :style="{ width: `${aliveCount > 0 ? (answersCount / aliveCount) * 100 : 0}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Spectator / Eliminated Info Banner -->
    <div
      v-if="isSpectator"
      class="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-2.5 text-xs text-center font-bold flex items-center justify-center space-x-2"
    >
      <span>💀</span>
      <span>Vous êtes éliminé(e). Vous observez le match en tant que spectateur.</span>
    </div>

    <!-- Question Title -->
    <div class="space-y-4">
      <div class="flex items-center space-x-1.5">
        <span
          v-for="t in question.themes"
          :key="t"
          class="text-[9px] font-extrabold uppercase tracking-wider font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
        >
          {{ t }}
        </span>
      </div>

      <h3
        class="text-base md:text-lg font-black font-display text-white tracking-wide leading-relaxed"
      >
        {{ question.libelle }}
      </h3>
    </div>

    <!-- Propositions Grid -->
    <div class="flex flex-col gap-2 py-2">
      <button
        v-for="(prop, index) in question.propositions"
        :key="prop.id"
        :disabled="responded || isSpectator || timeLeft <= 0"
        class="w-full text-left px-4 py-3 rounded-xl font-bold text-xs md:text-sm tracking-wide font-display border transition-all duration-150 relative select-none"
        :class="getOptionClass(prop.id)"
        @click="selectOption(prop.id)"
      >
        <div class="flex items-center justify-between">
          <span>{{ prop.value }}</span>
          <!-- Checkmark if currently selected by active player -->
          <UIcon
            v-if="selectedOptionId === prop.id"
            name="i-heroicons-check-circle-20-solid"
            class="text-xl text-violet-400"
          />
        </div>
      </button>
    </div>

    <!-- Opponents Panel (Bottom/Footer drawer) -->
    <div class="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass">
      <h4 class="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">
        État des Combattants
      </h4>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          v-for="p in sortedPlayers"
          :key="p.userId"
          class="flex items-center space-x-2.5 p-2 rounded-xl border bg-slate-950/20"
          :class="[
            p.lives <= 0 ? 'border-red-950 opacity-40' : 'border-white/5',
            p.hasAnswered ? 'bg-emerald-950/10 border-emerald-500/20' : '',
          ]"
        >
          <!-- User Status (Lives vs Dead) -->
          <div class="relative flex-shrink-0">
            <UAvatar
              icon="i-heroicons-user"
              size="xs"
              class="bg-violet-600/10 text-violet-400 border border-violet-500/20"
              :class="p.lives <= 0 ? 'grayscale filter text-slate-600 bg-slate-800/10' : ''"
            />
            <span
              v-if="p.lives > 0"
              class="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900"
              :class="p.isOnline ? 'bg-emerald-500' : 'bg-slate-500'"
            ></span>
          </div>

          <div class="overflow-hidden flex-1 text-left">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs truncate text-white block max-w-[70px]">
                {{ p.name }}
              </span>
              <span
                v-if="p.hasAnswered"
                class="text-[9px] text-emerald-400 font-extrabold flex items-center ml-1"
              >
                <UIcon name="i-heroicons-check-circle" class="mr-0.5" />
              </span>
            </div>

            <div class="flex items-center mt-0.5">
              <!-- Hearts preview for opponents -->
              <span
                v-if="p.lives <= 0"
                class="text-[9px] font-black uppercase tracking-wider text-red-500 flex items-center"
              >
                💀 ÉLIMINÉ
              </span>
              <span v-else class="flex space-x-0.5">
                <UIcon
                  v-for="lh in p.lives"
                  :key="lh"
                  name="i-heroicons-heart-solid"
                  class="text-[9px] text-rose-500"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface QuestionData {
  id: number;
  libelle: string;
  propositions: { id: number; value: string; img: string }[];
  img: string;
  themes: string[];
}

interface Player {
  userId: string;
  name: string;
  avatar: string;
  level: number;
  lives: number;
  isOnline: boolean;
  hasAnswered: boolean;
}

const props = defineProps<{
  question: QuestionData;
  duration: number;
  endTime: number;
  myLives: number;
  players: Player[];
  responded: boolean;
  selectedOptionId: number | null;
  isSpectator: boolean;
  round: number;
  answersCount: number;
  aliveCount: number;
}>();

const emit = defineEmits<{
  submitAnswer: [propositionId: number];
}>();

const timeLeft = ref(props.duration);
let timerInterval: any = null;

const updateTimer = () => {
  if (!props.endTime) return;
  const remaining = Math.max(0, Math.ceil((props.endTime - Date.now()) / 1000));
  timeLeft.value = remaining;
  if (remaining <= 0 && timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

watch(
  () => props.endTime,
  (newVal) => {
    if (timerInterval) clearInterval(timerInterval);
    updateTimer();
    if (newVal > Date.now()) {
      timerInterval = setInterval(updateTimer, 50); // Mettre à jour plus fréquemment pour éliminer les décalages
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval);
});

// Tri des joueurs : En vie d'abord, puis par nombre de vies, puis par ordre alphabétique
const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    if (a.lives <= 0 && b.lives > 0) return 1;
    if (a.lives > 0 && b.lives <= 0) return -1;
    return b.lives - a.lives || a.name.localeCompare(b.name);
  });
});

// Chrono dash calculations
const dashOffset = computed(() => {
  const circum = 2 * Math.PI * 20;
  const pct = timeLeft.value / props.duration;
  return circum * (1 - pct);
});

const timerColor = computed(() => {
  if (timeLeft.value <= 3) return "#EF4444"; // Red
  if (timeLeft.value <= 8) return "#F59E0B"; // Orange/Yellow
  return "#8B5CF6"; // Violet
});

const timerTextColor = computed(() => {
  if (timeLeft.value <= 3) return "text-red-500 animate-pulse scale-110";
  if (timeLeft.value <= 8) return "text-amber-500";
  return "text-violet-400";
});

function selectOption(id: number) {
  if (props.responded || props.isSpectator || timeLeft.value <= 0) return;
  emit("submitAnswer", id);
}

function getOptionClass(id: number) {
  if (props.responded || props.isSpectator) {
    if (props.selectedOptionId === id) {
      return "bg-violet-600/15 border-violet-500/50 text-violet-400 shadow-neon scale-[1.01] cursor-default";
    }
    return "bg-slate-900/20 border-white/5 text-gray-500 cursor-default opacity-40";
  }
  if (props.selectedOptionId === id) {
    return "bg-violet-600/15 border-violet-500 shadow-neon text-violet-300 font-extrabold scale-[1.01]";
  }
  return "bg-white/5 hover:bg-white/10 hover:border-white/20 border-white/10 text-gray-300 font-semibold cursor-pointer active:scale-98";
}
</script>

<style scoped>
/* Option animation details if any */
</style>
