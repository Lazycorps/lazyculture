<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none space-y-6 animate-fade-in">
    <!-- Main Info & Settings Card -->
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <!-- Profile Header (Avatar, Level & Username) -->
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
              {{ username || "Joueur" }}
            </h2>
            <span
              class="inline-flex items-center justify-center self-center bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-extrabold px-3 py-1 rounded-full font-display"
            >
              Niveau {{ level }}
            </span>
          </div>

          <!-- Experience Progression Jauge -->
          <div class="space-y-1 pt-1.5">
            <!-- Custom Premium Glass Progress Bar -->
            <div
              class="w-full h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
            >
              <div
                class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                :style="{ width: `${xpProgress}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-xs font-bold text-gray-500 font-display">
              <span>{{ xp - xpThreshold }} / {{ xpMax - xpThreshold }} XP</span>
              <span>Progression Niveau</span>
            </div>
          </div>
        </div>
      </div>

      <hr class="border-white/5 my-6" />

      <!-- Form Inputs Section -->
      <div class="space-y-5">
        <!-- Email Input -->
        <UFormGroup
          label="Adresse Email"
          name="email"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <UInput
            v-model="email"
            disabled
            icon="i-heroicons-envelope"
            :ui="{ base: 'bg-white/5 border border-white/10 text-gray-400' }"
          />
        </UFormGroup>

        <!-- Username Input with trailing save action -->
        <UFormGroup
          label="Nom d'utilisateur"
          name="username"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <UInput
            v-model="username"
            placeholder="Entrez votre pseudonyme..."
            icon="i-heroicons-user"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            @update:model-value="userNameChanged = true"
          >
            <template #trailing>
              <UButton
                v-if="userNameChanged"
                icon="i-heroicons-arrow-down-tray"
                color="primary"
                variant="ghost"
                :loading="loadingUpdateUser"
                class="hover:bg-white/5 text-violet-400"
                @click="updateUsername"
              />
            </template>
          </UInput>
        </UFormGroup>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-arrow-left-on-rectangle"
            :loading="loading"
            class="font-bold uppercase tracking-wider font-display px-5 py-2.5"
            @click="signOut"
          >
            Déconnexion
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Achievements Section -->
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <div class="space-y-4">
        <h3
          class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
        >
          <UIcon name="i-heroicons-trophy" class="mr-2 text-amber-500 text-base animate-pulse" />
          Trophées & Exploits
        </h3>

        <div class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
          <AchievementComponent :achievements="achievements" :userAchievements="userAchievements" />
        </div>
      </div>
    </UCard>

    <!-- Competitive Battle Royale Section -->
    <UCard
      v-if="brRank"
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden animate-fade-in"
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
            :class="brRank.rankInfo.color"
          ></div>

          <!-- Badge Display -->
          <div
            class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg border border-white/10 shrink-0 relative"
            :class="brRank.rankInfo.color"
          >
            <UIcon :name="brRank.rankInfo.icon" />
          </div>

          <!-- Stats Info -->
          <div class="flex-1 w-full text-center sm:text-left space-y-3">
            <div>
              <h4 class="text-xl font-black font-display text-white uppercase tracking-wider">
                {{ brRank.rankInfo.label }}
              </h4>
              <p class="text-xs text-gray-400 font-medium">{{ brRank.points }} LP cumulés</p>
            </div>

            <!-- LP Division Progress Bar -->
            <div v-if="brRank.rankInfo.tier !== 'Master'" class="space-y-1">
              <div
                class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full bg-gradient-to-r rounded-full transition-all duration-300"
                  :class="brRank.rankInfo.color"
                  :style="{ width: `${brRank.rankInfo.pointsInDivision}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] font-bold text-gray-500 font-display">
                <span>{{ brRank.rankInfo.pointsInDivision }} / 100 LP</span>
                <span>Palier suivant</span>
              </div>
            </div>

            <!-- Competitive Stats Grid -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                <span
                  class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                  >Parties</span
                >
                <span class="text-sm font-black text-white font-display">{{
                  brRank.gamesPlayed
                }}</span>
              </div>
              <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                <span
                  class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                  >Victoires</span
                >
                <span class="text-sm font-black text-amber-400 font-display"
                  >🏆 {{ brRank.wins }}</span
                >
              </div>
              <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                <span
                  class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                  >Ratio Top 1</span
                >
                <span class="text-sm font-black text-cyan-400 font-display">
                  {{
                    brRank.gamesPlayed > 0
                      ? Math.round((brRank.wins / brRank.gamesPlayed) * 100)
                      : 0
                  }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Battle Royale History Section -->
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <div class="space-y-4">
        <h3
          class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
        >
          <UIcon name="i-heroicons-fire" class="mr-2 text-orange-500 text-base animate-pulse" />
          Historique Battle Royale (20 dernières)
        </h3>

        <div v-if="loadingHistory" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-16 w-full bg-slate-800 rounded-xl" />
        </div>

        <div
          v-else-if="battleRoyaleHistory.length === 0"
          class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
        >
          <p class="text-sm text-gray-500">Vous n'avez pas encore joué en mode Battle Royale.</p>
        </div>

        <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          <div
            v-for="match in battleRoyaleHistory"
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
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <div class="space-y-4">
        <h3
          class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
        >
          <UIcon name="i-heroicons-calendar-days" class="mr-2 text-violet-400 text-base" />
          Historique Défis Quotidiens (20 derniers)
        </h3>

        <div v-if="loadingHistory" class="space-y-3">
          <USkeleton v-for="i in 3" :key="i" class="h-20 w-full bg-slate-800 rounded-xl" />
        </div>

        <div
          v-else-if="dailyHistory.length === 0"
          class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
        >
          <p class="text-sm text-gray-500">Vous n'avez pas encore résolu de défi quotidien.</p>
        </div>

        <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          <div
            v-for="daily in dailyHistory"
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

            <!-- Custom premium progress bar -->
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
</template>

<script setup lang="ts">
import AchievementComponent from "@/components/achievements/Achievement.vue";

const supabase = useSupabaseClient();
const router = useRouter();

const loading = ref(true);
const loadingHistory = ref(true);
const username = ref("");
const email = ref("");
const level = ref(0);
const xp = ref(0);
const xpThreshold = ref(0);
const xpMax = ref(0);
const userNameChanged = ref(false);
const loadingUpdateUser = ref(false);

const achievements = ref<any[]>([]);
const userAchievements = ref<any[]>([]);
const battleRoyaleHistory = ref<any[]>([]);
const dailyHistory = ref<any[]>([]);
const brRank = ref<any>(null);

const xpProgress = computed(() => {
  const current = xp.value - xpThreshold.value;
  const max = xpMax.value - xpThreshold.value;
  if (max <= 0) return 0;
  return (current / max) * 100;
});

onMounted(async () => {
  await fetchUser();
});

async function fetchUser() {
  try {
    loading.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const userConnected = await $fetch<any>("/api/user/current", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    username.value = userConnected?.name ?? "";
    email.value = userConnected?.email ?? "";
    level.value = userConnected?.UserProgress?.levelId ?? 1;
    xp.value = userConnected?.UserProgress?.xp ?? 0;
    xpThreshold.value = userConnected?.UserProgress?.level?.xp_threshold ?? 0;
    xpMax.value = userConnected?.nextLevelTreshold ?? 100;
    brRank.value = userConnected?.brRank ?? null;

    if (userConnected?.id) {
      await fetchHistory(userConnected.id);
    }
  } catch (e) {
    console.error("Failed to load current user profil:", e);
  } finally {
    loading.value = false;
  }
}

async function fetchHistory(userId: string) {
  try {
    loadingHistory.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const data = await $fetch<any>(`/api/user/profile/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    achievements.value = data?.achievements ?? [];
    userAchievements.value = data?.userAchievements ?? [];
    battleRoyaleHistory.value = data?.battleRoyaleHistory ?? [];
    dailyHistory.value = data?.dailyHistory ?? [];
    brRank.value = data?.user?.brRank ?? null;
  } catch (e) {
    console.error("Failed to load user history:", e);
  } finally {
    loadingHistory.value = false;
  }
}

async function updateUsername() {
  if (!username.value || username.value.length < 4 || username.value.length > 16) {
    return;
  }
  try {
    loadingUpdateUser.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const userUpdated = await $fetch<any>("/api/user/username", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        username: username.value,
      },
    });
    username.value = userUpdated?.name ?? "";
    userNameChanged.value = false;
  } catch (e) {
    console.error("Failed to update username:", e);
  } finally {
    loadingUpdateUser.value = false;
  }
}

async function signOut() {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
  } catch (e) {
    console.error("Sign out error:", e);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
