<template>
  <div class="w-full max-w-xl mx-auto py-2 space-y-8 select-none pb-18">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h1
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Classement du Jour
      </h1>
      <p class="text-sm text-gray-400 font-medium">
        Découvrez les performances des joueurs d'aujourd'hui sur la série quotidienne.
      </p>
    </div>

    <!-- 3D Podium for Top 3 Daily Players -->
    <div
      class="grid grid-cols-3 gap-3 items-end pt-8 max-w-md mx-auto"
      v-if="users && users.length > 0"
    >
      <!-- 2nd Place (Left) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="secondPlace">
          <NuxtLink
            :to="'/user/' + secondPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <UAvatar
                icon="i-heroicons-user"
                size="lg"
                class="bg-slate-300/10 text-slate-300 border-2 border-slate-400 shadow-lg group-hover:scale-105 transition-transform"
              />
              <span
                class="absolute -top-3 -right-2 bg-slate-400 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white/20 font-display"
              >
                2
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-bold text-xs truncate text-slate-300 group-hover:text-white transition-colors"
              >
                {{ secondPlace.userName || "Anonyme" }}
              </p>
              <p class="text-[10px] font-extrabold text-slate-400/80 font-display">
                {{ secondPlace.score }}/10 ({{ secondPlace.elapsedTime }}m)
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-24 rounded-t-2xl border-t border-x border-slate-400/20 bg-slate-900/30 flex items-center justify-center font-black font-display text-2xl text-slate-500 shadow-inner"
        >
          Ⅱ
        </div>
      </div>

      <!-- 1st Place (Center - Tallest) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="firstPlace">
          <NuxtLink
            :to="'/user/' + firstPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce"
                >👑</span
              >
              <UAvatar
                icon="i-heroicons-user"
                size="xl"
                class="bg-amber-500/10 text-amber-400 border-2 border-amber-400 shadow-neon group-hover:scale-105 transition-transform"
              />
              <span
                class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 font-display"
              >
                1
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-extrabold text-sm truncate text-amber-400 font-display group-hover:text-amber-300 transition-colors"
              >
                {{ firstPlace.userName || "Anonyme" }}
              </p>
              <p class="text-xs font-black text-amber-300/80 font-display">
                {{ firstPlace.score }}/10 ({{ firstPlace.elapsedTime }}m)
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-32 rounded-t-2xl border-t border-x border-amber-500/30 bg-amber-500/5 flex items-center justify-center font-black font-display text-4xl text-amber-500/70 shadow-lg shadow-amber-500/5"
        >
          Ⅰ
        </div>
      </div>

      <!-- 3rd Place (Right) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="thirdPlace">
          <NuxtLink
            :to="'/user/' + thirdPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <UAvatar
                icon="i-heroicons-user"
                size="lg"
                class="bg-amber-700/10 text-amber-600 border-2 border-amber-700/60 shadow-lg group-hover:scale-105 transition-transform"
              />
              <span
                class="absolute -top-3 -right-2 bg-amber-700 text-white font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white/20 font-display"
              >
                3
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-bold text-xs truncate text-amber-700 group-hover:text-amber-500 transition-colors"
              >
                {{ thirdPlace.userName || "Anonyme" }}
              </p>
              <p class="text-[10px] font-extrabold text-amber-700/80 font-display">
                {{ thirdPlace.score }}/10 ({{ thirdPlace.elapsedTime }}m)
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-20 rounded-t-2xl border-t border-x border-amber-700/20 bg-slate-900/30 flex items-center justify-center font-black font-display text-2xl text-amber-700/50 shadow-inner"
        >
          Ⅲ
        </div>
      </div>
    </div>

    <!-- Remaining Daily Ranks List -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      :ui="{ body: 'p-0' }"
    >
      <div class="divide-y divide-white/5" v-if="remainingUsers.length > 0">
        <NuxtLink
          v-for="(userItem, index) in remainingUsers"
          :key="userItem.userId"
          :to="'/user/' + userItem.userId"
          class="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group cursor-pointer block"
        >
          <!-- Rank & Name -->
          <div class="flex items-center space-x-4">
            <span
              class="w-6 text-center font-black font-display text-sm text-gray-500 group-hover:text-violet-400 transition-colors"
            >
              {{ index + 4 }}
            </span>
            <UAvatar
              icon="i-heroicons-user"
              size="sm"
              class="bg-white/5 text-gray-400 border border-white/10"
            />
            <span class="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">
              {{ userItem.userName || "Joueur Anonyme" }}
            </span>
          </div>

          <!-- Stats (Score & Time) -->
          <div class="flex items-center space-x-6 text-sm">
            <div class="text-right">
              <span class="font-extrabold text-emerald-400 font-display"
                >{{ userItem.score }} / 10</span
              >
            </div>

            <div class="w-16 text-right text-xs font-semibold text-gray-400 font-display">
              ⏱️ {{ userItem.elapsedTime }} min
            </div>
          </div>
        </NuxtLink>
      </div>
      <div
        v-else-if="!users || users.length === 0"
        class="text-center py-10 text-gray-500 font-medium"
      >
        Aucun joueur dans le classement aujourd'hui. Soyez le premier !
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Classement du Jour - Défi Quotidien",
  ogTitle: "Classement du Jour - Défi Quotidien - LazyCulture",
  description:
    "Découvrez les scores et temps de réponse des joueurs sur le Défi Quotidien d'aujourd'hui. Comparez vos résultats et grimpez sur le podium !",
  ogDescription:
    "Découvrez les scores et temps de réponse des joueurs sur le Défi Quotidien d'aujourd'hui. Comparez vos résultats et grimpez sur le podium !",
});

const { data: users } = await useFetch<any[]>("/api/series/dailyRanking");

const firstPlace = computed(() => users.value?.[0] || null);
const secondPlace = computed(() => users.value?.[1] || null);
const thirdPlace = computed(() => users.value?.[2] || null);
const remainingUsers = computed(() => users.value?.slice(3) || []);
</script>
