<template>
  <div class="w-full max-w-4xl mx-auto py-6 px-4 space-y-8 select-none">
    <!-- Header Page -->
    <div class="flex items-center justify-between border-b border-white/5 pb-4">
      <div class="space-y-1.5">
        <div
          class="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-black uppercase text-violet-400 font-display tracking-widest"
        >
          <span>⏱️ Speedrun</span>
        </div>
        <h1 class="text-3xl font-black font-display text-white tracking-wide uppercase">
          Contre-la-montre
        </h1>
        <p class="text-xs text-gray-400 max-w-md">
          Choisissez votre catégorie, répondez le plus vite possible et hissez-vous au sommet du
          classement.
        </p>
      </div>
      <UButton
        to="/solo"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="font-bold text-xs"
      >
        Retour au Solo
      </UButton>
    </div>

    <!-- Category Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Active Category 1: Survie Flash -->
      <div
        class="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between space-y-6 shadow-[0_0_30px_rgba(139,92,246,0.05)] hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300 group cursor-pointer"
        @click="navigateTo('/series/speedrun/survival')"
      >
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl group-hover:bg-violet-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div class="flex justify-between items-start">
            <div
              class="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
            >
              ⚡
            </div>
            <span
              class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider"
            >
              Disponible
            </span>
          </div>
          <div class="space-y-1">
            <h2 class="text-xl font-black font-display text-white tracking-wide">Survie Flash</h2>
            <p class="text-[10px] font-bold text-violet-400 uppercase tracking-wider font-display">
              120s de départ • Zéro vie • Mauvaise réponse = -5s
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Un sprint mental extrême. Répondez correctement au maximum de questions avant l'échéance
            du chrono. Chaque erreur vous coûte de précieuses secondes !
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="md"
            block
            icon="i-heroicons-play"
            class="font-black uppercase font-display tracking-widest py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 group-hover:from-violet-500 group-hover:to-fuchsia-500 shadow-md group-hover:shadow-violet-600/20"
          >
            Lancer la Survie
          </UButton>
        </div>
      </div>

      <!-- Active Category 2: Sprint 20 -->
      <div
        class="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between space-y-6 shadow-[0_0_30px_rgba(99,102,241,0.05)] hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 group cursor-pointer"
        @click="navigateTo('/series/speedrun/sprint')"
      >
        <div
          class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-indigo-600/10 blur-3xl group-hover:bg-indigo-600/20 transition-colors"
        ></div>

        <div class="space-y-4 relative z-10">
          <div class="flex justify-between items-start">
            <div
              class="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
            >
              🏁
            </div>
            <span
              class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider"
            >
              Disponible
            </span>
          </div>
          <div class="space-y-1">
            <h2 class="text-xl font-black font-display text-white tracking-wide">Sprint 20</h2>
            <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-display">
              20 bonnes réponses • Temps montant • Mauvaise réponse = +5s
            </p>
          </div>
          <p class="text-xs text-gray-400 leading-relaxed">
            Atteignez 20 bonnes réponses le plus vite possible. La précision est récompensée, car
            chaque mauvaise réponse ajoute une pénalité de 5 secondes sur votre chronomètre final !
          </p>
        </div>

        <div class="pt-2 relative z-10">
          <UButton
            color="primary"
            size="md"
            block
            icon="i-heroicons-play"
            class="font-black uppercase font-display tracking-widest py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 group-hover:from-indigo-500 group-hover:to-cyan-500 shadow-md group-hover:shadow-indigo-600/20"
          >
            Lancer le Sprint
          </UButton>
        </div>
      </div>
    </div>

    <!-- Leaderboard Section -->
    <div class="space-y-6 pt-4">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="text-center md:text-left space-y-1">
          <h2
            class="text-2xl font-black font-display text-white tracking-wide uppercase flex items-center justify-center md:justify-start"
          >
            <UIcon name="i-heroicons-trophy" class="mr-2 text-violet-400 animate-bounce" />
            Classements Speedrun
          </h2>
          <p class="text-xs text-gray-400 font-medium">
            Les 50 meilleures performances des survivants les plus rapides de LazyCulture.
          </p>
        </div>

        <!-- Custom Tabs Selector -->
        <div
          class="flex justify-center space-x-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md"
        >
          <UButton
            :variant="activeTab === 'survival' ? 'solid' : 'ghost'"
            :color="activeTab === 'survival' ? 'primary' : 'neutral'"
            size="sm"
            class="font-black uppercase font-display tracking-widest px-4 py-2 rounded-xl text-xs"
            @click="switchTab('survival')"
          >
            ⚡ Survie Flash
          </UButton>
          <UButton
            :variant="activeTab === 'sprint' ? 'solid' : 'ghost'"
            :color="activeTab === 'sprint' ? 'primary' : 'neutral'"
            size="sm"
            class="font-black uppercase font-display tracking-widest px-4 py-2 rounded-xl text-xs"
            @click="switchTab('sprint')"
          >
            🏁 Sprint 20
          </UButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl text-violet-500 animate-spin" />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!ranking || ranking.length === 0"
        class="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5"
      >
        <span class="text-4xl">🏆</span>
        <p class="text-sm font-bold text-gray-300 mt-2 font-display">
          Aucun record enregistré pour l'instant !
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Soyez le tout premier à inscrire votre nom sur le classement !
        </p>
      </div>

      <!-- Podium & Rankings Grid -->
      <div v-else class="space-y-8">
        <!-- Podium Top 3 -->
        <div
          class="grid grid-cols-3 gap-3 items-end pt-8 max-w-lg mx-auto bg-slate-900/30 border border-white/5 p-4 rounded-2xl backdrop-blur-md"
        >
          <!-- 2nd Place -->
          <div class="flex flex-col items-center space-y-3">
            <template v-if="secondPlace">
              <NuxtLink
                :to="'/user/' + secondPlace.userId"
                class="flex flex-col items-center space-y-2 group cursor-pointer w-full"
              >
                <div class="relative">
                  <UserAvatar
                    :src="secondPlace.avatarUrl"
                    :frame="secondPlace.frameStyleKey"
                    size="lg"
                    avatar-class="bg-slate-300/10 text-slate-300 border-2 border-slate-400 shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <span
                    class="absolute -top-2.5 -right-1 bg-slate-400 text-slate-950 font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white/20 font-display"
                  >
                    2
                  </span>
                </div>
                <div class="text-center w-full overflow-hidden px-1">
                  <p
                    class="font-bold text-xs truncate text-slate-300 group-hover:text-white transition-colors"
                  >
                    {{ secondPlace.userName }}
                  </p>
                  <p class="text-[10px] font-black text-slate-400 font-display">
                    {{
                      activeTab === "survival"
                        ? `${secondPlace.score} pts`
                        : formatTime(secondPlace.elapsedTimeMs)
                    }}
                  </p>
                </div>
              </NuxtLink>
            </template>
            <div
              class="w-full h-16 rounded-t-xl border-t border-x border-slate-400/20 bg-slate-950/40 flex items-center justify-center font-black font-display text-lg text-slate-400"
            >
              Ⅱ
            </div>
          </div>

          <!-- 1st Place -->
          <div class="flex flex-col items-center space-y-3">
            <template v-if="firstPlace">
              <NuxtLink
                :to="'/user/' + firstPlace.userId"
                class="flex flex-col items-center space-y-2 group cursor-pointer w-full"
              >
                <div class="relative">
                  <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-xl animate-bounce"
                    >👑</span
                  >
                  <UserAvatar
                    :src="firstPlace.avatarUrl"
                    :frame="firstPlace.frameStyleKey"
                    size="xl"
                    avatar-class="bg-amber-500/10 text-amber-400 border-2 border-amber-400 shadow-neon group-hover:scale-105 transition-transform"
                  />
                  <span
                    class="absolute -top-2 -right-1 bg-amber-400 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 font-display"
                  >
                    1
                  </span>
                </div>
                <div class="text-center w-full overflow-hidden px-1">
                  <p
                    class="font-extrabold text-sm truncate text-amber-400 font-display group-hover:text-amber-300 transition-colors"
                  >
                    {{ firstPlace.userName }}
                  </p>
                  <p class="text-xs font-black text-amber-300 font-display">
                    {{
                      activeTab === "survival"
                        ? `${firstPlace.score} pts`
                        : formatTime(firstPlace.elapsedTimeMs)
                    }}
                  </p>
                </div>
              </NuxtLink>
            </template>
            <div
              class="w-full h-22 rounded-t-xl border-t border-x border-amber-500/30 bg-amber-500/5 flex items-center justify-center font-black font-display text-2xl text-amber-500/70 shadow-lg"
            >
              Ⅰ
            </div>
          </div>

          <!-- 3rd Place -->
          <div class="flex flex-col items-center space-y-3">
            <template v-if="thirdPlace">
              <NuxtLink
                :to="'/user/' + thirdPlace.userId"
                class="flex flex-col items-center space-y-2 group cursor-pointer w-full"
              >
                <div class="relative">
                  <UserAvatar
                    :src="thirdPlace.avatarUrl"
                    :frame="thirdPlace.frameStyleKey"
                    size="lg"
                    avatar-class="bg-amber-700/10 text-amber-600 border-2 border-amber-700 shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <span
                    class="absolute -top-2.5 -right-1 bg-amber-700 text-slate-100 font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white/20 font-display"
                  >
                    3
                  </span>
                </div>
                <div class="text-center w-full overflow-hidden px-1">
                  <p
                    class="font-bold text-xs truncate text-amber-600 group-hover:text-amber-500 transition-colors"
                  >
                    {{ thirdPlace.userName }}
                  </p>
                  <p class="text-[10px] font-black text-amber-600/90 font-display">
                    {{
                      activeTab === "survival"
                        ? `${thirdPlace.score} pts`
                        : formatTime(thirdPlace.elapsedTimeMs)
                    }}
                  </p>
                </div>
              </NuxtLink>
            </template>
            <div
              class="w-full h-12 rounded-t-xl border-t border-x border-amber-700/20 bg-slate-950/40 flex items-center justify-center font-black font-display text-lg text-amber-700"
            >
              Ⅲ
            </div>
          </div>
        </div>

        <!-- Leaderboard Table/List for Rank 4+ -->
        <div
          v-if="ranking.length > 3"
          class="max-w-xl mx-auto border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-xl"
        >
          <div class="divide-y divide-white/5">
            <div
              v-for="item in ranking.slice(3)"
              :key="item.userId"
              class="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors"
            >
              <div class="flex items-center space-x-3.5 min-w-0">
                <!-- Rank -->
                <span class="w-6 text-center font-black font-display text-gray-500 text-sm">
                  {{ item.rank }}
                </span>
                <!-- Avatar -->
                <NuxtLink :to="'/user/' + item.userId" class="flex-shrink-0">
                  <UserAvatar :src="item.avatarUrl" :frame="item.frameStyleKey" size="sm" />
                </NuxtLink>
                <!-- Name -->
                <NuxtLink
                  :to="'/user/' + item.userId"
                  class="font-bold text-sm text-gray-300 hover:text-white truncate font-display"
                >
                  {{ item.userName }}
                </NuxtLink>
              </div>

              <!-- Score/Time -->
              <div class="text-right">
                <span class="font-black font-display text-violet-400 text-sm">
                  {{ activeTab === "survival" ? item.score : formatTime(item.elapsedTimeMs) }}
                </span>
                <span class="text-[10px] text-gray-500 font-bold ml-1 uppercase">
                  {{ activeTab === "survival" ? "réponses" : "chrono" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  SpeedrunSurvivalRankingDTO,
  SpeedrunSprintRankingDTO,
} from "#shared/series/seriesSpeedrun";

useSeoMeta({
  title: "Speedrun Solo - LazyCulture",
  description:
    "Défiez le chrono et affrontez les autres joueurs dans les modes Speedrun de LazyCulture.",
});

const activeTab = ref<"survival" | "sprint">("survival");
const loading = ref(true);
const survivalRanking = ref<SpeedrunSurvivalRankingDTO[]>([]);
const sprintRanking = ref<SpeedrunSprintRankingDTO[]>([]);

const ranking = computed(() => {
  return activeTab.value === "survival" ? survivalRanking.value : (sprintRanking.value as any[]);
});

const firstPlace = computed(() => ranking.value.find((r) => r.rank === 1));
const secondPlace = computed(() => ranking.value.find((r) => r.rank === 2));
const thirdPlace = computed(() => ranking.value.find((r) => r.rank === 3));

async function fetchRankings() {
  loading.value = true;
  try {
    if (activeTab.value === "survival") {
      survivalRanking.value = await $fetch<SpeedrunSurvivalRankingDTO[]>(
        "/api/series/speedrun/survival/ranking",
      );
    } else {
      sprintRanking.value = await $fetch<SpeedrunSprintRankingDTO[]>(
        "/api/series/speedrun/sprint/ranking",
      );
    }
  } catch (e) {
    console.error("Failed to load rankings:", e);
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: "survival" | "sprint") {
  activeTab.value = tab;
  fetchRankings();
}

function formatTime(ms: number) {
  if (!ms || ms === 9999999) return "--:--";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toFixed(1)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

onMounted(() => {
  fetchRankings();
});
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
}
</style>
