<template>
  <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
    <div class="space-y-4">
      <h3
        class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
      >
        <UIcon name="i-heroicons-chart-bar" class="mr-2 text-violet-500 text-base animate-pulse" />
        Statistiques Globales
      </h3>

      <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-slate-950/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 h-24"
        >
          <USkeleton class="h-6 w-6 rounded-full bg-slate-800 shrink-0" />
          <USkeleton class="h-3 w-16 bg-slate-800 shrink-0" />
          <USkeleton class="h-5 w-10 bg-slate-800 shrink-0" />
        </div>
      </div>

      <div v-else-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
        <!-- Carte 1: Précision -->
        <div
          class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
        >
          <UIcon name="i-heroicons-check-badge" class="text-emerald-400 text-2xl mb-1.5" />
          <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
            >Précision</span
          >
          <span class="text-xl font-black text-white font-display mt-0.5"
            >{{ stats.accuracy }}%</span
          >
        </div>

        <!-- Carte 2: Questions Répondues -->
        <div
          class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="text-violet-400 text-2xl mb-1.5"
          />
          <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
            >Questions</span
          >
          <span class="text-xl font-black text-white font-display mt-0.5">{{
            stats.totalQuestions
          }}</span>
        </div>

        <!-- Carte 3: Parties PvP -->
        <div
          class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
        >
          <UIcon name="i-heroicons-bolt" class="text-pink-400 text-2xl mb-1.5" />
          <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
            >Parties PvP</span
          >
          <span class="text-xl font-black text-white font-display mt-0.5">{{
            stats.totalPvPMatches
          }}</span>
          <span class="text-[9px] text-cyan-400 font-extrabold font-display mt-0.5"
            >{{ stats.pvpWinRate }}% Victoires</span
          >
        </div>

        <!-- Carte 4: Série Active (Streak) -->
        <div
          class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
        >
          <UIcon name="i-heroicons-fire" class="text-orange-500 text-2xl mb-1.5" />
          <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
            >Série Active</span
          >
          <span class="text-xl font-black text-white font-display mt-0.5"
            >{{ stats.currentStreak }} {{ stats.currentStreak > 1 ? "jours" : "jour" }}</span
          >
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    stats: any | null;
    loading?: boolean;
  }>(),
  { loading: false },
);
</script>
