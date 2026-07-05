<template>
  <div class="w-full max-w-xl py-2 space-y-6 select-none pb-18">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h1
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Classements
      </h1>
      <p class="text-sm text-gray-400 font-medium">
        Découvrez les meilleurs joueurs de Lazyculture et grimpez au sommet de la gloire.
      </p>
    </div>

    <!-- Tabs Switcher -->
    <div class="flex justify-center pt-2">
      <div
        class="bg-slate-950/60 p-1 rounded-2xl border border-white/5 flex space-x-1 w-full max-w-lg"
      >
        <button
          class="flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-1"
          :class="
            currentTab === 'daily'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          "
          @click="currentTab = 'daily'"
        >
          <UIcon name="i-heroicons-calendar" class="text-xs" />
          <span>Quotidien</span>
        </button>
        <button
          class="flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-1"
          :class="
            currentTab === 'br'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          "
          @click="currentTab = 'br'"
        >
          <UIcon name="i-heroicons-shield-check" class="text-xs" />
          <span>BR</span>
        </button>
        <button
          class="flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-1"
          :class="
            currentTab === 'showdown'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          "
          @click="currentTab = 'showdown'"
        >
          <UIcon name="i-heroicons-bolt" class="text-xs" />
          <span>Showdown</span>
        </button>
        <button
          class="flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-1"
          :class="
            currentTab === 'general'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          "
          @click="currentTab = 'general'"
        >
          <UIcon name="i-heroicons-sparkles" class="text-xs" />
          <span>XP</span>
        </button>
        <button
          v-if="userStore.isLoggedIn"
          class="flex-1 py-2 px-2.5 rounded-xl text-[10px] font-black font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-1"
          :class="
            currentTab === 'friends'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          "
          @click="currentTab = 'friends'"
        >
          <UIcon name="i-heroicons-user-group" class="text-xs" />
          <span>Amis</span>
        </button>
      </div>
    </div>

    <!-- Daily Sub-Tabs Switcher -->
    <div v-if="currentTab === 'daily'" class="flex justify-center -mt-2">
      <div
        class="bg-slate-950/40 p-0.5 rounded-xl border border-white/5 flex space-x-1 w-full max-w-[240px]"
      >
        <button
          class="flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200"
          :class="
            dailyPeriod === 'monthly' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
          "
          @click="dailyPeriod = 'monthly'"
        >
          Mensuel
        </button>
        <button
          class="flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200"
          :class="
            dailyPeriod === 'alltime' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
          "
          @click="dailyPeriod = 'alltime'"
        >
          Tout le temps
        </button>
      </div>
    </div>

    <!-- 3D Podium for Top 3 Players -->
    <div
      class="grid grid-cols-3 gap-3 items-end pt-6 max-w-md mx-auto"
      v-if="activeUsers && activeUsers.length > 0"
    >
      <!-- 2nd Place (Left) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="secondPlace">
          <NuxtLink
            :to="'/user/' + secondPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <UserAvatar
                :src="secondPlace.avatarUrl"
                :frame="secondPlace.frameStyleKey"
                size="lg"
                avatar-class="bg-slate-300/10 text-slate-300 border-2 shadow-lg group-hover:scale-105 transition-transform border-slate-400"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && secondPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-xs shadow-md"
                :class="secondPlace.rankInfo.color"
              >
                <UIcon :name="secondPlace.rankInfo.icon" class="text-[10px]" />
              </span>
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
                {{ secondPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-[10px] font-extrabold text-slate-400/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ secondPlace.xp }} XP
              </p>
              <p
                class="text-[10px] font-extrabold text-cyan-400 font-display"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ secondPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5"
                  >{{ secondPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <span
                  >🥇{{ secondPlace.firstPlaces }} 🥈{{ secondPlace.secondPlaces }} 🥉{{
                    secondPlace.thirdPlaces
                  }}</span
                >
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ secondPlace.score }} PTS</span
                >
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
              <!-- Golden Crown float effect -->
              <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce"
                >👑</span
              >
              <UserAvatar
                :src="firstPlace.avatarUrl"
                :frame="firstPlace.frameStyleKey"
                size="xl"
                avatar-class="bg-amber-500/10 text-amber-400 border-2 shadow-neon group-hover:scale-105 transition-transform border-amber-400"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && firstPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-sm shadow-md"
                :class="firstPlace.rankInfo.color"
              >
                <UIcon :name="firstPlace.rankInfo.icon" class="text-xs" />
              </span>
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
                {{ firstPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-xs font-black text-amber-300/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ firstPlace.xp }} XP
              </p>
              <p
                class="text-xs font-black text-cyan-400 font-display animate-pulse"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ firstPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5"
                  >{{ firstPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-xs font-black text-gray-300 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <span
                  >🥇{{ firstPlace.firstPlaces }} 🥈{{ firstPlace.secondPlaces }} 🥉{{
                    firstPlace.thirdPlaces
                  }}</span
                >
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ firstPlace.score }} PTS</span
                >
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
              <UserAvatar
                :src="thirdPlace.avatarUrl"
                :frame="thirdPlace.frameStyleKey"
                size="lg"
                avatar-class="bg-amber-700/10 text-amber-600 border-2 shadow-lg group-hover:scale-105 transition-transform border-amber-700/60"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && thirdPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-xs shadow-md"
                :class="thirdPlace.rankInfo.color"
              >
                <UIcon :name="thirdPlace.rankInfo.icon" class="text-[10px]" />
              </span>
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
                {{ thirdPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-[10px] font-extrabold text-amber-700/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ thirdPlace.xp }} XP
              </p>
              <p
                class="text-[10px] font-extrabold text-cyan-400 font-display"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ thirdPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5"
                  >{{ thirdPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <span
                  >🥇{{ thirdPlace.firstPlaces }} 🥈{{ thirdPlace.secondPlaces }} 🥉{{
                    thirdPlace.thirdPlaces
                  }}</span
                >
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ thirdPlace.score }} PTS</span
                >
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

    <!-- Remaining Ranks List -->
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
          :class="userItem.isMe ? 'bg-violet-600/10 border-l-2 border-violet-500' : ''"
        >
          <!-- Rank & Avatar -->
          <div class="flex items-center space-x-4">
            <span
              class="w-6 text-center font-black font-display text-sm text-gray-500 group-hover:text-violet-400 transition-colors"
            >
              {{ index + 4 }}
            </span>
            <UserAvatar
              :src="userItem.avatarUrl"
              :frame="userItem.frameStyleKey"
              size="sm"
              avatar-class="bg-white/5 text-gray-400 border border-white/10"
            />
            <div class="text-left flex flex-col space-y-0.5">
              <span
                class="font-bold text-sm text-gray-200 group-hover:text-white transition-colors"
              >
                {{ userItem.name || "Joueur Anonyme" }}
                <span v-if="userItem.isMe" class="text-violet-400 text-xs font-display"
                  >(vous)</span
                >
              </span>
              <!-- League badge and winrate detail for BR/Showdown tab -->
              <div
                v-if="(currentTab === 'br' || currentTab === 'showdown') && userItem.rankInfo"
                class="flex flex-wrap items-center gap-1.5"
              >
                <span
                  class="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-white/5"
                  :class="userItem.rankInfo.color"
                >
                  <UIcon :name="userItem.rankInfo.icon" class="text-[9px]" />
                  <span>{{ userItem.rankInfo.label }}</span>
                </span>
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                >
                  • Victoires :
                  {{
                    userItem.gamesPlayed > 0
                      ? Math.round((userItem.wins / userItem.gamesPlayed) * 100)
                      : 0
                  }}% ({{ userItem.wins }} / {{ userItem.gamesPlayed }}
                  {{ currentTab === "br" ? "BR" : "SD" }})
                </span>
              </div>
            </div>
          </div>

          <!-- XP / LP Score -->
          <div class="flex items-center space-x-6 text-sm">
            <div class="text-right" v-if="currentTab === 'general' || currentTab === 'friends'">
              <span class="font-extrabold text-white font-display">{{ userItem.xp }}</span>
              <span
                class="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-display ml-1"
                >XP</span
              >
            </div>
            <div class="text-right" v-else-if="currentTab === 'br' || currentTab === 'showdown'">
              <span class="font-extrabold text-cyan-400 font-display">{{ userItem.points }}</span>
              <span
                class="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-display ml-1"
                >LP</span
              >
            </div>
            <div class="text-right flex flex-col items-end" v-else-if="currentTab === 'daily'">
              <div class="flex items-center space-x-1 text-xs text-gray-400 font-display">
                <span>🥇{{ userItem.firstPlaces }}</span>
                <span>🥈{{ userItem.secondPlaces }}</span>
                <span>🥉{{ userItem.thirdPlaces }}</span>
              </div>
              <div class="text-[10px] font-black text-violet-400 font-display mt-0.5">
                {{ userItem.score }} PTS
              </div>
            </div>

            <div
              class="w-12 text-right text-xs font-semibold text-gray-400"
              v-if="currentTab === 'general' && userItem.bestAscent"
            >
              ⛰️ {{ userItem.bestAscent }}
            </div>
          </div>
        </NuxtLink>
      </div>
      <div
        v-else-if="!activeUsers || activeUsers.length === 0"
        class="text-center py-10 text-gray-500 font-medium space-y-4"
      >
        <p>
          {{
            currentTab === "friends"
              ? "Suivez des joueurs pour les voir apparaître ici !"
              : "Aucun joueur dans ce classement pour le moment."
          }}
        </p>
        <UButton
          v-if="currentTab === 'friends'"
          to="/user/friends"
          color="primary"
          variant="soft"
          icon="i-heroicons-user-plus"
          class="font-bold uppercase tracking-wider font-display"
        >
          Ajouter des amis
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FriendRankingDTO } from "#shared/DTO/followDTO";

useSeoMeta({
  title: "Classements Généraux",
  ogTitle: "Classements des Joueurs - LazyCulture",
  description:
    "Découvrez les meilleurs compétiteurs de LazyCulture. Consultez les classements d'expérience (XP), Battle Royale, Showdown et défis quotidiens.",
  ogDescription:
    "Découvrez les meilleurs compétiteurs de LazyCulture. Consultez les classements d'expérience (XP), Battle Royale, Showdown et défis quotidiens.",
});

const currentTab = ref<"general" | "br" | "showdown" | "daily" | "friends">("daily");
const dailyPeriod = ref<"alltime" | "monthly">("monthly");

const userStore = useUserStore();
const { authFetch } = useAuthFetch();

// Classement amis : chargé à la demande car il nécessite l'authentification
const friendsUsers = ref<FriendRankingDTO[]>([]);
const friendsLoaded = ref(false);

watch(currentTab, (tab) => {
  if (tab === "friends" && !friendsLoaded.value) {
    fetchFriendsRanking();
  }
});

async function fetchFriendsRanking() {
  try {
    friendsUsers.value = await authFetch<FriendRankingDTO[]>("/api/ranking/friends");
    friendsLoaded.value = true;
  } catch (e) {
    console.error("Failed to fetch friends ranking:", e);
  }
}

// Récupération des différents types de classements en parallèle
const { data: users } = await useFetch<any[]>("/api/ranking/top");
const { data: brUsers } = await useFetch<any[]>("/api/ranking/br");
const { data: showdownUsers } = await useFetch<any[]>("/api/ranking/showdown");
const { data: dailyAlltimeUsers } = await useFetch<any[]>(
  "/api/ranking/daily-podium?period=alltime",
);
const { data: dailyMonthlyUsers } = await useFetch<any[]>(
  "/api/ranking/daily-podium?period=monthly",
);

const activeUsers = computed(() => {
  if (currentTab.value === "general") return users.value || [];
  if (currentTab.value === "br") return brUsers.value || [];
  if (currentTab.value === "showdown") return showdownUsers.value || [];
  if (currentTab.value === "daily") {
    return dailyPeriod.value === "alltime"
      ? dailyAlltimeUsers.value || []
      : dailyMonthlyUsers.value || [];
  }
  if (currentTab.value === "friends") return friendsUsers.value || [];
  return [];
});

const firstPlace = computed(() => activeUsers.value?.[0] || null);
const secondPlace = computed(() => activeUsers.value?.[1] || null);
const thirdPlace = computed(() => activeUsers.value?.[2] || null);
const remainingUsers = computed(() => activeUsers.value?.slice(3) || []);
</script>
