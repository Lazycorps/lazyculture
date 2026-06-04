<template>
  <div
    v-if="user"
    class="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none w-80"
  >
    <!-- 1. Recoverable Active Game Alert -->
    <div
      v-if="brSession.recoverableMatchId.value && route.path !== '/series/battle-royale'"
      class="pointer-events-auto bg-[#1e1b4b]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] space-y-3 transform transition-all duration-300 animate-slide-in"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <span class="text-2xl animate-pulse">⚡</span>
          <div>
            <h4 class="text-xs font-black font-display text-white uppercase tracking-wider">
              Partie en cours !
            </h4>
            <p class="text-[10px] text-gray-300">Vous avez un match de Battle Royale actif.</p>
          </div>
        </div>
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          color="neutral"
          variant="ghost"
          class="rounded-full hover:text-white"
          @click="brSession.recoverableMatchId.value = null"
        />
      </div>
      <UButton
        color="warning"
        size="sm"
        block
        icon="i-heroicons-arrow-right-circle"
        class="font-black font-display uppercase tracking-widest py-2"
        @click="resumeActiveBRMatch"
      >
        Rejoindre la partie
      </UButton>
    </div>

    <!-- 2. Active Lobby Status tracking (when navigated away) -->
    <div
      v-if="
        brSession.matchId.value &&
        brSession.status.value === 'WAITING' &&
        route.path !== '/series/battle-royale'
      "
      class="pointer-events-auto bg-[#0f172a]/95 backdrop-blur-md border border-violet-500/35 rounded-2xl p-4 shadow-[0_0_20px_rgba(139,92,246,0.25)] space-y-3 transform transition-all duration-300 animate-slide-in"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <span class="text-2xl animate-spin-slow">🐢</span>
          <div>
            <h4 class="text-xs font-black font-display text-white uppercase tracking-wider">
              Salon d'attente
            </h4>
            <p class="text-[10px] text-violet-300 font-semibold font-display">
              {{ brSession.players.value.length }} joueur(s) connectés
            </p>
          </div>
        </div>
      </div>

      <div
        class="text-[10px] text-gray-400 bg-white/5 border border-white/5 rounded px-2 py-1 flex items-center justify-between"
      >
        <span>Statut :</span>
        <span
          v-if="brSession.isCountdownRunning.value"
          class="text-cyan-400 font-extrabold animate-pulse"
        >
          ⏳ Lancement ({{ brSession.countdown.value }}s)
        </span>
        <span v-else class="text-violet-400 font-bold"> En attente de joueurs... </span>
      </div>

      <div class="flex space-x-2">
        <UButton
          color="error"
          size="xs"
          variant="ghost"
          class="font-bold uppercase tracking-wider"
          @click="brSession.disconnect"
        >
          Quitter
        </UButton>
        <UButton
          color="primary"
          size="xs"
          class="flex-1 font-black font-display uppercase tracking-wider py-1.5 justify-center"
          icon="i-heroicons-arrow-right"
          to="/series/battle-royale"
        >
          Retourner au Salon
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBattleRoyaleSession } from "~/composables/useBattleRoyaleSession";

const brSession = useBattleRoyaleSession();
const user = useSupabaseUser();
const route = useRoute();
const router = useRouter();

function resumeActiveBRMatch() {
  if (brSession.recoverableMatchId.value && user.value) {
    brSession.connect(brSession.recoverableMatchId.value, user.value.id);
    router.push("/series/battle-royale");
  }
}

onMounted(() => {
  if (user.value) {
    void brSession.checkActiveSession();
  }
});

watch(user, (newUser) => {
  if (newUser) {
    void brSession.checkActiveSession();
  } else {
    brSession.disconnect();
  }
});
</script>
