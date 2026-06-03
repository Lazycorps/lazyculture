<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none space-y-6 animate-fade-in">
    <!-- Loading skeleton state -->
    <div v-if="loading" class="space-y-6">
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="flex items-center space-x-4 mb-6">
          <USkeleton class="h-20 w-20 rounded-full bg-slate-800" />
          <div class="space-y-2 flex-1">
            <USkeleton class="h-6 w-1/3 bg-slate-800" />
            <USkeleton class="h-4 w-1/2 bg-slate-800" />
          </div>
        </div>
        <hr class="border-white/5 my-6" />
        <div class="space-y-3">
          <USkeleton class="h-24 w-full bg-slate-800 rounded-2xl" />
          <USkeleton class="h-24 w-full bg-slate-800 rounded-2xl" />
        </div>
      </UCard>
    </div>

    <!-- Error/No Profile Found State -->
    <div v-else-if="!profileData" class="text-center py-12">
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-bold text-white mb-2 font-display">Joueur introuvable</h3>
        <p class="text-gray-400 text-sm mb-6">Ce profil n'existe pas ou a été supprimé.</p>
        <UButton
          to="/themes"
          color="primary"
          class="font-bold uppercase tracking-wider font-display"
        >
          Retour à l'accueil
        </UButton>
      </UCard>
    </div>

    <!-- Main Profile Card -->
    <div v-else class="space-y-6">
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <!-- Profile Header -->
        <div
          class="flex flex-col items-center sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6"
        >
          <UAvatar
            icon="i-heroicons-user"
            size="xl"
            class="bg-violet-600/20 text-violet-300 border-2 border-violet-500/30 w-20 h-20 shadow-neon"
          />
          <div class="flex-1 text-center sm:text-left space-y-1.5 w-full">
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1">
              <h2 class="text-2xl font-black font-display text-white tracking-wide truncate">
                {{ profileData.user.name || "Joueur" }}
              </h2>
              <span
                class="inline-flex items-center justify-center self-center bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-extrabold px-3 py-1 rounded-full font-display"
              >
                Niveau {{ profileData.user.level }}
              </span>
            </div>

            <!-- Experience Progress -->
            <div class="space-y-1 pt-1.5">
              <div
                class="w-full h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                  :style="{ width: `${xpProgress}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] font-bold text-gray-500 font-display">
                <span
                  >{{ profileData.user.xp - profileData.user.xpThreshold }} /
                  {{ profileData.user.nextLevelTreshold - profileData.user.xpThreshold }} XP</span
                >
                <span>Progression Niveau</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Info Banner -->
        <div class="grid grid-cols-2 gap-3 bg-slate-950/30 border border-white/5 rounded-2xl p-4">
          <div class="text-center">
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider font-display">
              Membre depuis
            </p>
            <p class="text-sm font-bold text-gray-300 mt-1">
              {{ formatDate(profileData.user.createDate) }}
            </p>
          </div>
          <div class="text-center border-l border-white/5">
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider font-display">
              Exploits débloqués
            </p>
            <p class="text-sm font-bold text-amber-400 mt-1">
              🏆 {{ profileData.userAchievements.length }} /
              {{ profileData.achievements.filter((a: any) => !a.hidden).length }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              class="font-bold uppercase tracking-wider font-display hover:bg-white/5 text-gray-400"
              to="/ranking"
            >
              Classement
            </UButton>

            <UButton
              v-if="isMe"
              color="primary"
              variant="soft"
              icon="i-heroicons-pencil-square"
              to="/user/profil"
              class="font-bold uppercase tracking-wider font-display"
            >
              Modifier mon profil
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Competitive Battle Royale Section -->
      <UCard
        v-if="profileData.user.brRank"
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div class="space-y-4">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="mr-2 text-violet-500 text-base animate-pulse"
            />
            Ligue Compétitive Battle Royale
          </h3>

          <div
            class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 relative overflow-hidden"
          >
            <!-- Glow background -->
            <div
              class="absolute inset-0 bg-gradient-to-r opacity-5 blur-xl pointer-events-none"
              :class="profileData.user.brRank.rankInfo.color"
            ></div>

            <!-- Badge Display -->
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg border border-white/10 shrink-0 relative"
              :class="profileData.user.brRank.rankInfo.color"
            >
              <UIcon :name="profileData.user.brRank.rankInfo.icon" />
            </div>

            <!-- Stats Info -->
            <div class="flex-1 w-full text-center sm:text-left space-y-3">
              <div>
                <h4 class="text-xl font-black font-display text-white uppercase tracking-wider">
                  {{ profileData.user.brRank.rankInfo.label }}
                </h4>
                <p class="text-xs text-gray-400 font-medium">
                  {{ profileData.user.brRank.points }} LP cumulés
                </p>
              </div>

              <!-- LP Division Progress Bar -->
              <div v-if="profileData.user.brRank.rankInfo.tier !== 'Master'" class="space-y-1">
                <div
                  class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
                >
                  <div
                    class="h-full bg-gradient-to-r rounded-full transition-all duration-300"
                    :class="profileData.user.brRank.rankInfo.color"
                    :style="{ width: `${profileData.user.brRank.rankInfo.pointsInDivision}%` }"
                  ></div>
                </div>
                <div class="flex justify-between text-[10px] font-bold text-gray-500 font-display">
                  <span>{{ profileData.user.brRank.rankInfo.pointsInDivision }} / 100 LP</span>
                  <span>Palier suivant</span>
                </div>
              </div>

              <!-- Competitive Stats Grid -->
              <div class="grid grid-cols-3 gap-2 pt-1">
                <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                  <span
                    class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider font-display"
                    >Parties</span
                  >
                  <span class="text-sm font-black text-white font-display">{{
                    profileData.user.brRank.gamesPlayed
                  }}</span>
                </div>
                <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                  <span
                    class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider font-display"
                    >Victoires</span
                  >
                  <span class="text-sm font-black text-amber-400 font-display"
                    >🏆 {{ profileData.user.brRank.wins }}</span
                  >
                </div>
                <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                  <span
                    class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider font-display"
                    >Ratio Top 1</span
                  >
                  <span class="text-sm font-black text-cyan-400 font-display">
                    {{
                      profileData.user.brRank.gamesPlayed > 0
                        ? Math.round(
                            (profileData.user.brRank.wins / profileData.user.brRank.gamesPlayed) *
                              100,
                          )
                        : 0
                    }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Achievements Section -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="space-y-4">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon name="i-heroicons-trophy" class="mr-2 text-amber-500 text-base" />
            Trophées & Exploits
          </h3>
          <div class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
            <AchievementComponent
              :achievements="profileData.achievements"
              :userAchievements="profileData.userAchievements"
            />
          </div>
        </div>
      </UCard>

      <!-- Battle Royale History Section -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="space-y-4">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon name="i-heroicons-fire" class="mr-2 text-orange-500 text-base animate-pulse" />
            Parties Battle Royale (20 dernières)
          </h3>

          <div
            v-if="profileData.battleRoyaleHistory.length === 0"
            class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
          >
            <p class="text-sm text-gray-500">
              Aucune partie Battle Royale enregistrée pour ce joueur.
            </p>
          </div>

          <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            <div
              v-for="match in profileData.battleRoyaleHistory"
              :key="match.matchId"
              class="flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300"
              :class="[
                match.rank === 1
                  ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                  : 'bg-slate-950/20 border-white/5 hover:border-white/10',
              ]"
            >
              <div class="flex items-center space-x-3.5">
                <!-- Rank Badge -->
                <div
                  class="w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shadow-md font-display"
                  :class="[
                    match.rank === 1
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'
                      : match.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : match.rank === 3
                          ? 'bg-amber-700 text-slate-100'
                          : 'bg-slate-800/80 text-slate-400 border border-white/5',
                  ]"
                >
                  #{{ match.rank }}
                </div>

                <div class="text-left space-y-0.5">
                  <div class="flex items-center space-x-2">
                    <span class="font-extrabold text-sm text-white font-display">
                      {{ match.rank === 1 ? "Victoire Royale 👑" : `Top ${match.rank}` }}
                    </span>
                    <span
                      v-if="match.status !== 'FINISHED'"
                      class="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                    >
                      En Cours
                    </span>
                  </div>
                  <span class="text-[10px] text-gray-500 block font-medium">
                    {{ formatDate(match.createdAt) }} • {{ match.totalPlayers }} joueurs
                  </span>
                </div>
              </div>

              <div class="text-right space-y-0.5">
                <span class="text-sm font-black font-display text-emerald-400 block">
                  +{{ match.xpEarned }} XP
                </span>
                <span class="text-[10px] text-gray-500 block font-medium">
                  {{
                    match.eliminatedAtRound
                      ? `Éliminé au Round ${match.eliminatedAtRound}`
                      : "Survivant"
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Daily Challenges Section -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="space-y-4">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon name="i-heroicons-calendar-days" class="mr-2 text-violet-400 text-base" />
            Défis Quotidiens (20 derniers)
          </h3>

          <div
            v-if="profileData.dailyHistory.length === 0"
            class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
          >
            <p class="text-sm text-gray-500">Aucun défi quotidien relevé pour ce joueur.</p>
          </div>

          <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            <div
              v-for="daily in profileData.dailyHistory"
              :key="daily.responseId"
              class="bg-slate-950/20 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-300 space-y-3"
            >
              <div class="flex items-center justify-between">
                <div class="text-left space-y-0.5">
                  <span class="font-extrabold text-sm text-white font-display block">
                    {{ daily.title }}
                  </span>
                  <span class="text-[10px] text-gray-500 block font-medium">
                    Résolu le {{ formatDate(daily.createDate) }} • Temps :
                    {{ formatTime(daily.elapsedTime) }}
                  </span>
                </div>

                <div class="text-right space-y-0.5">
                  <span
                    class="text-base font-black font-display block"
                    :class="[
                      daily.correctCount >= 8
                        ? 'text-emerald-400'
                        : daily.correctCount >= 5
                          ? 'text-amber-400'
                          : 'text-rose-400',
                    ]"
                  >
                    {{ daily.correctCount }} / {{ daily.totalQuestions }}
                  </span>
                  <span class="text-[10px] text-emerald-400 font-bold font-display block">
                    +{{ daily.xpEarned }} XP
                  </span>
                </div>
              </div>

              <!-- Small custom premium progress bar -->
              <div
                class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5"
              >
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="[
                    daily.correctCount >= 8
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : daily.correctCount >= 5
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                        : 'bg-gradient-to-r from-rose-500 to-rose-400',
                  ]"
                  :style="{ width: `${(daily.correctCount / daily.totalQuestions) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import AchievementComponent from "@/components/achievements/Achievement.vue";

const route = useRoute();
const supabase = useSupabaseClient();
const userId = route.params.id as string;

const loading = ref(true);
const profileData = ref<any>(null);
const currentUserId = ref<string | null>(null);

const xpProgress = computed(() => {
  if (!profileData.value?.user) return 0;
  const { xp, xpThreshold, nextLevelTreshold } = profileData.value.user;
  const current = xp - xpThreshold;
  const max = nextLevelTreshold - xpThreshold;
  if (max <= 0) return 0;
  return (current / max) * 100;
});

const isMe = computed(() => {
  return currentUserId.value && profileData.value?.user?.id === currentUserId.value;
});

onMounted(async () => {
  await fetchSession();
  await fetchProfile();
});

async function fetchSession() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    currentUserId.value = session?.user?.id ?? null;
  } catch (e) {
    console.error("Failed to fetch session:", e);
  }
}

async function fetchProfile() {
  try {
    loading.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const data = await $fetch<any>(`/api/user/profile/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    profileData.value = data;
  } catch (e) {
    console.error("Failed to load user profile:", e);
  } finally {
    loading.value = false;
  }
}

// Helper pour formater la date
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Helper pour formater le temps en minutes et secondes
function formatTime(ms: number) {
  if (!ms || ms < 0) return "0s";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
