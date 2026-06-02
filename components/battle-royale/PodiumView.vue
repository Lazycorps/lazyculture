<template>
  <div class="text-center py-6 px-4 space-y-6 flex flex-col items-center select-none">
    <!-- Victory Royale / Game Over Banner -->
    <div class="relative w-full max-w-sm flex flex-col items-center">
      <!-- Glow behind -->
      <div
        class="absolute inset-0 blur-2xl rounded-full opacity-35 scale-125"
        :class="isWinner ? 'bg-amber-500' : 'bg-violet-500'"
      ></div>

      <!-- Icon display -->
      <div
        class="relative w-18 h-18 rounded-full border flex items-center justify-center text-4xl mb-4"
        :class="
          isWinner
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
        "
      >
        <span>{{ isWinner ? "👑" : "🏁" }}</span>
      </div>

      <div class="space-y-1">
        <h2
          class="text-2xl font-black font-display tracking-widest uppercase"
          :class="
            isWinner
              ? 'text-amber-400 animate-pulse font-extrabold filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'text-white'
          "
        >
          {{ isWinner ? "Victoire Royale" : "Partie Terminée" }}
        </h2>
        <p class="text-xs text-gray-400">
          {{
            isWinner
              ? "Vous êtes l'unique survivant de l'arène !"
              : `Félicitations pour votre combat.`
          }}
        </p>
      </div>
    </div>

    <!-- Personal Stats Card -->
    <div class="grid grid-cols-2 gap-3 w-full max-w-md">
      <!-- Rank -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p
          class="text-2xl font-black font-display"
          :class="isWinner ? 'text-amber-400' : 'text-cyan-400'"
        >
          #{{ myRank }}
        </p>
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1">
          Votre Rang
        </p>
      </div>

      <!-- XP Gained -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p class="text-2xl font-black font-display text-emerald-400">+{{ myXPEarned }} XP</p>
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1">
          Expérience Gagnée
        </p>
      </div>
    </div>

    <!-- Leaderboard / Standings List -->
    <div
      class="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass space-y-3"
    >
      <div
        class="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest pb-2 border-b border-white/5"
      >
        <span>Classement Final</span>
        <span>Score</span>
      </div>

      <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        <div
          v-for="(st, idx) in standings"
          :key="st.userId"
          class="flex items-center justify-between p-2.5 rounded-xl border transition-all"
          :class="[
            st.userId === myUserId
              ? 'bg-violet-600/10 border-violet-500/40'
              : 'bg-slate-950/20 border-white/5',
            idx === 0 ? 'border-amber-500/20 shadow-neon-gold bg-amber-500/5' : '',
          ]"
        >
          <div class="flex items-center space-x-3">
            <!-- Rank Badge -->
            <div
              class="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center"
              :class="[
                idx === 0
                  ? 'bg-amber-500 text-slate-950'
                  : idx === 1
                    ? 'bg-slate-300 text-slate-950'
                    : idx === 2
                      ? 'bg-amber-700 text-slate-100'
                      : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ idx + 1 }}
            </div>

            <div class="text-left">
              <span class="font-bold text-sm text-white block max-w-[120px] truncate">
                {{ st.name }}
              </span>
              <span class="text-[9px] text-slate-400">
                {{ st.lives > 0 ? "Survécu" : `Éliminé au Round ${st.eliminatedAtRound}` }}
              </span>
            </div>
          </div>

          <div class="text-right">
            <span class="text-xs font-black font-display text-emerald-400">
              +{{ st.xpEarned }} XP
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Exit / Replay button -->
    <div class="w-full max-w-md pt-2">
      <UButton
        size="lg"
        color="primary"
        block
        icon="i-heroicons-arrow-left-on-rectangle"
        class="font-black font-display uppercase tracking-widest py-3.5"
        to="/themes"
      >
        Retour aux Thèmes
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Standing {
  userId: string;
  name: string;
  lives: number;
  xpEarned: number;
  eliminatedAtRound: number | null;
}

const props = defineProps<{
  winnerId: string | null;
  winnerName: string | null;
  standings: Standing[];
  myUserId: string;
}>();

const isWinner = computed(() => {
  return props.winnerId === props.myUserId;
});

const myRank = computed(() => {
  const index = props.standings.findIndex((s) => s.userId === props.myUserId);
  return index !== -1 ? index + 1 : props.standings.length;
});

const myXPEarned = computed(() => {
  const player = props.standings.find((s) => s.userId === props.myUserId);
  return player ? player.xpEarned : 0;
});
</script>

<style scoped>
/* Glowing gold effect for podium 1st place */
.shadow-neon-gold {
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
}
</style>
