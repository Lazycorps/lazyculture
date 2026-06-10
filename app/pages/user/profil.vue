<template>
  <div class="w-full max-w-6xl mx-auto py-4 select-none animate-fade-in">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Column Left -->
      <div class="space-y-6">
        <!-- Main Info & Settings Card -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <!-- Profile Header (Avatar, Level, Username & Social) -->
          <ProfileHeader
            :name="username"
            :level="level"
            :xp="xp"
            :xp-threshold="xpThreshold"
            :xp-max="xpMax"
            :followers-count="social ? followersCount : null"
            :following-count="social ? social.followingCount : null"
            @open-follow-modal="openFollowModal"
          />

          <hr class="border-white/5 my-6" />

          <!-- Form Inputs Section -->
          <div class="space-y-5">
            <!-- Email Input -->
            <UFormField
              label="Adresse Email"
              name="email"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="email"
                disabled
                icon="i-heroicons-envelope"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-gray-400 cursor-not-allowed' }"
              />
            </UFormField>

            <!-- Username Input -->
            <UFormField
              label="Nom d'utilisateur"
              name="username"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <div class="flex flex-col sm:flex-row gap-3">
                <UInput
                  v-model="username"
                  placeholder="Entrez votre pseudonyme..."
                  icon="i-heroicons-user"
                  class="flex-grow w-full"
                  :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
                />
                <UButton
                  color="primary"
                  :disabled="!isUsernameSaveable"
                  :loading="loadingUpdateUser"
                  icon="i-heroicons-check-circle"
                  class="font-black font-display uppercase tracking-widest px-6 shrink-0 h-10 flex items-center justify-center"
                  @click="updateUsername"
                >
                  Enregistrer
                </UButton>
              </div>
            </UFormField>

            <!-- Notifications Push Section -->
            <div class="pt-5 border-t border-white/5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4
                    class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display flex items-center"
                  >
                    <UIcon name="i-heroicons-bell" class="mr-1.5 text-violet-400 text-sm" />
                    Notifications Push
                  </h4>
                  <p class="text-[11px] text-gray-500 mt-1 max-w-md leading-relaxed">
                    Recevez des rappels pour ne pas rater votre défi quotidien ou perdre votre série
                    de connexion.
                  </p>
                </div>
                <div class="flex items-center shrink-0">
                  <UButton
                    v-if="isSubscribed"
                    color="error"
                    variant="soft"
                    size="sm"
                    icon="i-heroicons-bell-slash"
                    :loading="loadingPush"
                    class="font-bold font-display uppercase tracking-wide text-xs"
                    @click="unsubscribeFromPush"
                  >
                    Désactiver
                  </UButton>
                  <UButton
                    v-else
                    color="primary"
                    size="sm"
                    icon="i-heroicons-bell"
                    :loading="loadingPush"
                    :disabled="!isPushSupported"
                    class="font-bold font-display uppercase tracking-wide text-xs"
                    @click="subscribeToPush"
                  >
                    {{ pushButtonText }}
                  </UButton>
                </div>
              </div>

              <!-- Message d'état ou d'erreur -->
              <div
                v-if="pushStatusMessage"
                class="flex items-start bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 text-xs text-violet-300"
              >
                <UIcon
                  name="i-heroicons-information-circle"
                  class="mr-2 text-base text-violet-400 shrink-0"
                />
                <span class="font-medium leading-relaxed">{{ pushStatusMessage }}</span>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between items-center gap-2 flex-wrap">
              <UButton
                color="primary"
                icon="i-heroicons-user-plus"
                to="/user/friends"
                class="font-bold uppercase tracking-wider font-display"
              >
                Ajouter des amis
              </UButton>
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

        <SocialFollowListModal
          v-if="userStore.userId"
          v-model:open="followModalOpen"
          :user-id="userStore.userId"
          :initial-tab="followModalTab"
        />

        <!-- Statistiques Globales Section -->
        <ProfileGlobalStats :stats="globalStats" :loading="loadingHistory" />

        <!-- Progression par Thème Section -->
        <ProfileThemeProgress :items="themeProgress" :loading="loadingHistory" />

        <!-- Achievements Section -->
        <ProfileAchievementsCard
          :achievements="achievements"
          :user-achievements="userAchievements"
        />
      </div>

      <!-- Column Right -->
      <div class="space-y-6">
        <!-- Competitive Battle Royale Section -->
        <ProfileCompetitiveLeague
          mode="battle-royale"
          :rank="brRank"
          :history="battleRoyaleHistory"
          :loading="loadingHistory"
        />

        <!-- Competitive Showdown Section -->
        <ProfileCompetitiveLeague
          mode="showdown"
          :rank="showdownRank"
          :history="showdownHistory"
          :loading="loadingHistory"
        />

        <!-- Daily Challenges Section -->
        <ProfileDailyHistory :items="dailyHistory" :loading="loadingHistory" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();
const userStore = useUserStore();
const { authFetch } = useAuthFetch();

const loading = ref(true);
const loadingHistory = ref(true);
const username = ref("");
const initialUsername = ref("");
const email = ref("");
const level = ref(0);
const xp = ref(0);
const xpThreshold = ref(0);
const xpMax = ref(0);
const loadingUpdateUser = ref(false);

const {
  isSupported: isPushSupported,
  isSubscribed,
  loading: loadingPush,
  statusMessage: pushStatusMessage,
  permission: pushPermission,
  checkSupport: checkPushSupport,
  subscribe: subscribePush,
  unsubscribe: unsubscribeFromPush,
} = usePushSubscription();

async function subscribeToPush() {
  await subscribePush();
}

const pushButtonText = computed(() => {
  return pushPermission.value === "denied" ? "Bloqué" : "Activer";
});

const isUsernameSaveable = computed(() => {
  return (
    username.value !== initialUsername.value &&
    username.value.length >= 4 &&
    username.value.length <= 16
  );
});

const achievements = ref<any[]>([]);
const userAchievements = ref<any[]>([]);
const battleRoyaleHistory = ref<any[]>([]);
const showdownHistory = ref<any[]>([]);
const dailyHistory = ref<any[]>([]);
const themeProgress = ref<any[]>([]);
const brRank = ref<any>(null);
const showdownRank = ref<any>(null);
const globalStats = ref<any>(null);

// État social (compteurs et modal abonnés/abonnements)
const social = ref<any>(null);
const followersCount = ref(0);
const followModalOpen = ref(false);
const followModalTab = ref<"followers" | "following">("followers");

function openFollowModal(tab: "followers" | "following") {
  followModalTab.value = tab;
  followModalOpen.value = true;
}

onMounted(async () => {
  await fetchUser();
  checkPushSupport();
});

async function fetchUser() {
  try {
    loading.value = true;
    await userStore.fetchUser(true);
    const userConnected = userStore.user as any;
    username.value = userConnected?.name ?? "";
    initialUsername.value = userConnected?.name ?? "";
    email.value = userConnected?.email ?? "";
    level.value = userConnected?.UserProgress?.levelId ?? 1;
    xp.value = userConnected?.UserProgress?.xp ?? 0;
    xpThreshold.value = userConnected?.UserProgress?.level?.xp_threshold ?? 0;
    xpMax.value = userConnected?.nextLevelTreshold ?? 100;
    brRank.value = userConnected?.brRank ?? null;
    showdownRank.value = userConnected?.showdownRank ?? null;

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
    const data = await authFetch<any>(`/api/user/profile/${userId}`);

    achievements.value = data?.achievements ?? [];
    userAchievements.value = data?.userAchievements ?? [];
    battleRoyaleHistory.value = data?.battleRoyaleHistory ?? [];
    showdownHistory.value = data?.showdownHistory ?? [];
    dailyHistory.value = data?.dailyHistory ?? [];
    themeProgress.value = data?.themeProgress ?? [];
    brRank.value = data?.user?.brRank ?? null;
    showdownRank.value = data?.user?.showdownRank ?? null;
    globalStats.value = data?.globalStats ?? null;
    social.value = data?.social ?? null;
    followersCount.value = data?.social?.followersCount ?? 0;
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
    const userUpdated = await authFetch<any>("/api/user/username", {
      method: "POST",
      body: {
        username: username.value,
      },
    });
    username.value = userUpdated?.name ?? "";
    initialUsername.value = userUpdated?.name ?? "";
    if (userStore.user) {
      userStore.user.name = username.value;
    }
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
    userStore.clearUser();
    router.push("/login");
  } catch (e) {
    console.error("Sign out error:", e);
  } finally {
    loading.value = false;
  }
}
</script>
