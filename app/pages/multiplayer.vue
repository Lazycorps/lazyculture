<template>
  <div class="w-full max-w-4xl mx-auto py-8 px-4 space-y-8 select-none">
    <!-- Header Page -->
    <div class="text-center space-y-3">
      <div
        class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-black uppercase text-violet-400 font-display tracking-widest"
      >
        <span>🎮 Arena</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-black font-display text-white tracking-wide uppercase">
        Modes Multijoueur
      </h1>
      <p class="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
        Mesurez-vous aux autres joueurs de la communauté en temps réel dans nos arènes compétitives
        !
      </p>
    </div>

    <!-- Modes Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <!-- Mode 1: Battle Royale -->
      <div
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-6 md:p-8 flex flex-col justify-between space-y-6 hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
        @click="navigateTo('/series/battle-royale')"
      >
        <!-- Background radial glow -->
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl group-hover:bg-violet-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div
            class="w-14 h-14 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            🔥
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Battle Royale</h2>
            <p class="text-xs font-bold text-violet-400 uppercase tracking-wider font-display">
              Survie à 20 Joueurs
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Défiez jusqu'à 19 autres combattants de la culture en temps réel. Répondez juste et vite
            pour conserver vos 3 points de vie et être le dernier survivant !
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-heroicons-fire"
            class="font-black uppercase font-display tracking-wider py-3 bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-500 group-hover:to-indigo-500 shadow-md group-hover:shadow-violet-600/20"
          >
            Rejoindre l'arène
          </UButton>
        </div>
      </div>

      <!-- Mode 2: Showdown -->
      <div
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-6 md:p-8 flex flex-col justify-between space-y-6 hover:border-pink-500/40 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
        @click="navigateTo('/series/showdown')"
      >
        <!-- Background radial glow -->
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-pink-600/10 blur-3xl group-hover:bg-pink-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div
            class="w-14 h-14 rounded-xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            ⚔️
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Showdown</h2>
            <p class="text-xs font-bold text-pink-400 uppercase tracking-wider font-display">
              Duel Compétitif 1v1
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Affrontez un adversaire à votre niveau en duel de points de vie. Choisissez vos thèmes
            stratégiquement, multipliez vos dégâts avec des combos et dominez le ladder !
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-heroicons-bolt"
            class="font-black uppercase font-display tracking-wider py-3 bg-gradient-to-r from-pink-600 to-rose-600 group-hover:from-pink-500 group-hover:to-rose-500 shadow-md group-hover:shadow-pink-600/20"
          >
            Lancer un duel
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Modes Multijoueur",
  meta: [
    {
      name: "description",
      content:
        "Affrontez d'autres joueurs en temps réel dans les modes Battle Royale et Showdown compétitif sur Lazyculture.",
    },
  ],
});
</script>

<style scoped>
/* Custom styles if any */
</style>
