<template>
  <div class="space-y-4 text-left">
    <!-- What is the Daily? -->
    <div class="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-4 space-y-2">
      <h3
        class="text-xs font-black font-display uppercase tracking-wider text-violet-300 flex items-center gap-1.5"
      >
        <UIcon name="i-heroicons-light-bulb" class="text-base" />
        Le Daily, c'est quoi ?
      </h3>
      <p class="text-xs text-gray-400 leading-relaxed">
        Chaque jour, une nouvelle série de 10 questions de culture générale, identique pour tous les
        joueurs. Une seule tentative par jour : répondez juste et vite pour gagner de l'XP et
        grimper dans le classement quotidien !
      </p>
    </div>

    <!-- Feature mini-cards -->
    <div class="grid grid-cols-3 gap-2">
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1">
        <p class="text-lg">❓</p>
        <p class="text-[10px] font-bold text-gray-300 font-display uppercase tracking-wide">
          10 questions
        </p>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1">
        <p class="text-lg">📅</p>
        <p class="text-[10px] font-bold text-gray-300 font-display uppercase tracking-wide">
          1 fois par jour
        </p>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1">
        <p class="text-lg">🏆</p>
        <p class="text-[10px] font-bold text-gray-300 font-display uppercase tracking-wide">
          XP & classement
        </p>
      </div>
    </div>

    <!-- Today's participation -->
    <div
      class="flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl px-4 py-2.5"
    >
      <UIcon name="i-heroicons-fire-solid" class="text-emerald-400 text-base shrink-0" />
      <p class="text-xs font-semibold text-emerald-300 font-display">
        <template v-if="stats && stats.finishers > 0">
          {{ stats.finishers }} {{ stats.finishers > 1 ? "joueurs ont" : "joueur a" }} déjà relevé
          le défi aujourd'hui
        </template>
        <template v-else>Soyez le premier à relever le défi du jour !</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyStatsDTO } from "#shared/DTO/dailyStatsDTO";

defineProps<{
  stats: DailyStatsDTO | null;
}>();
</script>
