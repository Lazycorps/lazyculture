<template>
  <div class="w-full max-w-4xl mx-auto py-8 px-4 space-y-8 select-none">
    <!-- Header Page -->
    <div class="text-center space-y-3">
      <div
        class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-black uppercase text-violet-400 font-display tracking-widest"
      >
        <span>🎯 Solo</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-black font-display text-white tracking-wide uppercase">
        Modes Solo
      </h1>
      <p class="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
        Progressez à votre rythme et testez vos connaissances en solo dans nos modes dédiés !
      </p>
    </div>

    <!-- Modes Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <!-- Mode 1: Aventure -->
      <div
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-6 md:p-8 flex flex-col justify-between space-y-6 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
        @click="navigateTo('/adventure')"
      >
        <!-- Background radial glow -->
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-emerald-600/10 blur-3xl group-hover:bg-emerald-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div
            class="w-14 h-14 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            🗺️
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Aventure</h2>
            <p class="text-xs font-bold text-emerald-400 uppercase tracking-wider font-display">
              Parcours Thématiques
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Embarquez dans des parcours d'apprentissage thématiques et validez chaque étape pour
            progresser sur la carte à votre propre rythme.
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-heroicons-map"
            class="font-black uppercase font-display tracking-wider py-3 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 shadow-md group-hover:shadow-emerald-600/20"
          >
            Explorer une aventure
          </UButton>
        </div>
      </div>

      <!-- Mode 2: Brainrun -->
      <div
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-6 md:p-8 flex flex-col justify-between space-y-6 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
        @click="navigateTo('/brainrun')"
      >
        <!-- Background radial glow -->
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-orange-600/10 blur-3xl group-hover:bg-orange-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div
            class="w-14 h-14 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            🧠
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Brainrun</h2>
            <p class="text-xs font-bold text-orange-400 uppercase tracking-wider font-display">
              Roguelite en 3 Actes
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Grimpez les 3 actes, affrontez les Elites et les Boss, gérez vos reliques et
            consommables, et survivez le plus loin possible !
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-heroicons-bolt"
            class="font-black uppercase font-display tracking-wider py-3 bg-gradient-to-r from-orange-600 to-amber-600 group-hover:from-orange-500 group-hover:to-amber-500 shadow-md group-hover:shadow-orange-600/20"
          >
            Lancer une run
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Modes de Jeu Solo",
  ogTitle: "Modes de Jeu Solo - LazyCulture",
  description:
    "Progressez à votre rythme en solo : parcours thématiques du mode Aventure ou run roguelite en 3 actes du mode Brainrun.",
  ogDescription:
    "Progressez à votre rythme en solo : parcours thématiques du mode Aventure ou run roguelite en 3 actes du mode Brainrun.",
});
</script>

<style scoped>
/* Custom styles if any */
</style>
