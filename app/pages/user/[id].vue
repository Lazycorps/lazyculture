<template>
  <div class="w-full max-w-6xl mx-auto py-4 select-none animate-fade-in">
    <!-- Loading skeleton state -->
    <div v-if="loading" class="space-y-6 max-w-xl mx-auto">
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
    <div v-else-if="!profileData" class="text-center py-12 max-w-xl mx-auto">
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
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Column Left -->
      <div class="space-y-6">
        <!-- Main Profile Card -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <!-- Profile Header -->
          <ProfileHeader
            :name="profileData.user.name"
            :level="profileData.user.level"
            :xp="profileData.user.xp"
            :xp-threshold="profileData.user.xpThreshold"
            :xp-max="profileData.user.nextLevelTreshold"
            :followers-count="profileData.social ? followersCount : null"
            :following-count="profileData.social ? profileData.social.followingCount : null"
            :is-followed-by="profileData.social?.isFollowedBy"
            :avatar-url="profileData.user.avatarUrl"
            :frame-style-key="profileData.user.frameStyleKey"
            @open-follow-modal="openFollowModal"
          />

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
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-left"
                class="font-bold uppercase tracking-wider font-display hover:bg-white/5 text-gray-400"
                to="/ranking"
              >
                Classement
              </UButton>

              <SocialFollowButton
                v-if="profileData.social"
                v-model="isFollowingProfile"
                :user-id="profileData.user.id"
                @change="onFollowChange"
              />
            </div>
          </template>
        </UCard>

        <SocialFollowListModal
          v-if="profileData"
          v-model:open="followModalOpen"
          :user-id="profileData.user.id"
          :initial-tab="followModalTab"
        />

        <!-- Statistiques Globales Section -->
        <ProfileGlobalStats v-if="profileData.globalStats" :stats="profileData.globalStats" />

        <!-- Progression par Thème Section -->
        <ProfileThemeProgress :items="profileData.themeProgress ?? []" />

        <!-- Achievements Section -->
        <ProfileAchievementsCard
          :achievements="profileData.achievements"
          :user-achievements="profileData.userAchievements"
        />
      </div>

      <!-- Column Right -->
      <div class="space-y-6">
        <!-- Competitive Battle Royale Section -->
        <ProfileCompetitiveLeague
          mode="battle-royale"
          :rank="profileData.user.brRank"
          :history="profileData.battleRoyaleHistory"
        />

        <!-- Competitive Showdown Section -->
        <ProfileCompetitiveLeague
          mode="showdown"
          :rank="profileData.user.showdownRank"
          :history="profileData.showdownHistory"
        />

        <!-- Daily Challenges Section -->
        <ProfileDailyHistory :items="profileData.dailyHistory" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const userStore = useUserStore();
const { authFetch } = useAuthFetch();
const userId = route.params.id as string;

const loading = ref(true);
const profileData = ref<any>(null);

// État social (suivi, compteurs, modal abonnés/abonnements)
const isFollowingProfile = ref(false);
const followersCount = ref(0);
const followModalOpen = ref(false);
const followModalTab = ref<"followers" | "following">("followers");

watch(profileData, (data) => {
  isFollowingProfile.value = data?.social?.isFollowing ?? false;
  followersCount.value = data?.social?.followersCount ?? 0;
});

function openFollowModal(tab: "followers" | "following") {
  followModalTab.value = tab;
  followModalOpen.value = true;
}

function onFollowChange(count: number) {
  followersCount.value = count;
}

onMounted(async () => {
  await userStore.fetchUser();

  // Son propre profil se consulte via la page dédiée (édition, amis, etc.)
  if (userStore.isLoggedIn && (userStore.userId === userId || userStore.user?.slug === userId)) {
    await navigateTo("/user/profil", { replace: true });
    return;
  }

  await fetchProfile();
});

async function fetchProfile() {
  try {
    loading.value = true;
    profileData.value = await authFetch<any>(`/api/user/profile/${userId}`);
  } catch (e) {
    console.error("Failed to load user profile:", e);
  } finally {
    loading.value = false;
  }
}
</script>
