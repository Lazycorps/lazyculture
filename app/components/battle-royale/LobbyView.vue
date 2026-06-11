<template>
  <div class="text-center py-6 px-4 space-y-6 flex flex-col items-center">
    <!-- Holographic Radar Scan Animation -->
    <div class="relative w-36 h-36 flex items-center justify-center">
      <!-- Outer glowing circle -->
      <div class="absolute inset-0 rounded-full border border-violet-500/30 animate-pulse"></div>

      <!-- Middle rotating sweep -->
      <div
        class="absolute w-28 h-28 rounded-full border border-dashed border-cyan-500/20 animate-spin-slow"
      ></div>

      <!-- Core Radar Pulse -->
      <div class="absolute w-20 h-20 rounded-full bg-violet-600/5 flex items-center justify-center">
        <div
          class="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl animate-bounce"
        >
          👑
        </div>
      </div>

      <!-- Scanning Radar Lines -->
      <div
        class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-violet-500/10 to-transparent animate-spin"
      ></div>
    </div>

    <!-- Title and Status Message -->
    <div class="space-y-2">
      <h2
        class="text-2xl font-black font-display text-white tracking-wider uppercase bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
      >
        Arène Battle Royale
      </h2>

      <!-- Count Down or Waiting state -->
      <div v-if="isCountdownRunning" class="py-1">
        <p
          class="text-lg font-black font-display text-cyan-400 tracking-widest uppercase animate-pulse"
        >
          Lancement dans {{ countdown }}s
        </p>
        <div
          class="w-48 h-1.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden mx-auto mt-2"
        >
          <div
            class="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-1000"
            :style="{ width: `${(countdown / (countdown > 5 ? 60 : 5)) * 100}%` }"
          ></div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center space-y-3">
        <p class="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
          En attente que les joueurs se marquent prêts...
        </p>
        <div
          class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-violet-600/10 border border-violet-500/30 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse"
        >
          <span
            class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping absolute inline-flex"
          ></span>
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400"></span>
          <span>{{ missingReadyMessage }}</span>
        </div>
      </div>
    </div>

    <!-- Ready Action Button -->
    <div class="w-full max-w-md">
      <UButton
        size="lg"
        :color="isMeReady ? 'error' : 'primary'"
        block
        class="font-black font-display uppercase tracking-widest py-3 justify-center shadow-lg hover:scale-[1.01] active:scale-98 transition-all"
        :icon="isMeReady ? 'i-heroicons-x-circle' : 'i-heroicons-check-circle'"
        @click="emit('toggleReady', !isMeReady)"
      >
        {{ isMeReady ? "Annuler prêt" : "Je suis prêt !" }}
      </UButton>
    </div>

    <!-- Players Grid -->
    <div
      class="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass space-y-3"
    >
      <div
        class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-white/5"
      >
        <span>Survivants connectés</span>
        <span class="text-violet-400">{{ players.length }} Joueur(s)</span>
      </div>

      <div class="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        <TransitionGroup name="list">
          <NuxtLink
            v-for="p in players"
            :key="p.userId"
            :to="'/user/' + p.userId"
            class="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all cursor-pointer block group"
          >
            <div class="flex items-center space-x-3">
              <div class="relative">
                <UAvatar
                  icon="i-heroicons-user"
                  size="sm"
                  class="bg-violet-600/20 text-violet-300 border border-violet-500/30"
                />
                <!-- Online Status Dot -->
                <span
                  class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 transition-colors"
                  :class="p.isOnline ? 'bg-emerald-500' : 'bg-slate-500'"
                ></span>
              </div>
              <div class="text-left">
                <p
                  class="font-bold text-sm text-white truncate max-w-[150px] group-hover:text-violet-300 transition-colors"
                >
                  {{ p.name }}
                  <span v-if="p.userId === myUserId" class="text-violet-400 text-xs ml-1"
                    >(Vous)</span
                  >
                </p>
                <div class="flex items-center space-x-1.5">
                  <span class="text-[10px] text-violet-400 font-semibold font-display">
                    Niveau {{ p.level }}
                  </span>
                  <span class="text-[10px] text-gray-500">•</span>
                  <span
                    class="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gradient-to-r border border-white/5"
                    :class="getRankBadgeClass(p.rankPoints)"
                  >
                    <UIcon :name="getRankIcon(p.rankPoints)" class="text-[9px]" />
                    <span>{{ getRankLabel(p.rankPoints) }}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-1.5">
              <span
                class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all duration-350"
                :class="
                  p.isReady
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-neon-green font-extrabold'
                    : 'bg-slate-800 border border-white/5 text-slate-500'
                "
              >
                {{ p.isReady ? "Prêt" : "Attente" }}
              </span>
            </div>
          </NuxtLink>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Player {
  userId: string;
  name: string;
  avatar: string;
  level: number;
  isOnline: boolean;
  isReady: boolean;
  rankPoints?: number;
}

const props = defineProps<{
  players: Player[];
  countdown: number;
  isCountdownRunning: boolean;
  myUserId: string;
}>();

const emit = defineEmits<{
  toggleReady: [isReady: boolean];
}>();

const isMeReady = computed(() => {
  const me = props.players.find((p) => p.userId === props.myUserId);
  return me ? me.isReady : false;
});

const missingReadyCount = computed(() => {
  const onlinePlayers = props.players.filter((p) => p.isOnline);
  const onlineCount = onlinePlayers.length;
  const readyCount = onlinePlayers.filter((p) => p.isReady).length;

  if (onlineCount < 2) {
    return Math.max(0, 2 - readyCount);
  }
  const target = Math.ceil(onlineCount * 0.75);
  return Math.max(0, target - readyCount);
});

const missingReadyMessage = computed(() => {
  const count = missingReadyCount.value;
  if (count <= 0) {
    return "Prêt à lancer !";
  }
  return `${count} joueur${count > 1 ? "s" : ""} prêt${count > 1 ? "s" : ""} manquant${count > 1 ? "s" : ""} pour lancer`;
});

// Helpers de classement
import { getRankFromPoints } from "~/composables/useRank";

function getRankBadgeClass(points?: number) {
  return getRankFromPoints(points || 0).color;
}

function getRankIcon(points?: number) {
  return getRankFromPoints(points || 0).icon;
}

function getRankLabel(points?: number) {
  return getRankFromPoints(points || 0).label;
}

watch(
  () => props.countdown,
  (newVal) => {
    if (props.isCountdownRunning && newVal === 5) {
      const { playSound } = useAudio();
      playSound("timer");
    }
  },
);

watch(
  () => props.isCountdownRunning,
  (isRunning) => {
    if (!isRunning) {
      const { stopSound } = useAudio();
      stopSound("timer");
    }
  },
);

onBeforeUnmount(() => {
  const { stopSound } = useAudio();
  stopSound("timer");
});
</script>

<style scoped>
.animate-spin-slow {
  animation: spin 8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Transitions de liste */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
