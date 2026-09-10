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
            :avatar-url="userStore.avatarUrl"
            :frame-style-key="userStore.frameStyleKey"
            is-own-profile
            @open-follow-modal="openFollowModal"
            @edit-username="openEditUsernameModal"
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

            <!-- Validation automatique des réponses -->
            <div class="pt-5 border-t border-white/5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4
                    class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display flex items-center"
                  >
                    <UIcon name="i-heroicons-bolt" class="mr-1.5 text-violet-400 text-sm" />
                    Validation automatique des réponses
                  </h4>
                  <p class="text-[11px] text-gray-500 mt-1 max-w-md leading-relaxed">
                    Valide instantanément votre réponse dès que vous cliquez dessus, sans passer par
                    le bouton Valider.
                  </p>
                </div>
                <USwitch
                  v-model="autoValidateAnswer"
                  :loading="loadingAutoValidateAnswer"
                  :disabled="loadingAutoValidateAnswer"
                  @update:model-value="updateAutoValidateAnswer"
                />
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

        <!-- Modal modification de pseudonyme -->
        <UModal v-model:open="editUsernameModalOpen" :ui="{ content: 'max-w-md' }">
          <template #content>
            <UCard :ui="{ body: 'p-5 sm:p-6' }">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-sm"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="text-base" />
                    </div>
                    <h3 class="text-base font-black font-display text-white tracking-wide">
                      Modifier votre pseudonyme
                    </h3>
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-x-mark-20-solid"
                    class="-my-1"
                    @click="editUsernameModalOpen = false"
                  />
                </div>
              </template>

              <form @submit.prevent="handleSaveUsernameModal" class="space-y-4">
                <UFormField
                  label="Nouveau pseudonyme"
                  name="newUsername"
                  :ui="{
                    label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                  }"
                >
                  <UInput
                    v-model="editUsernameValue"
                    placeholder="Entrez votre pseudonyme..."
                    icon="i-heroicons-user"
                    size="lg"
                    required
                    autocomplete="off"
                    class="w-full"
                    :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
                  />
                </UFormField>

                <!-- Information de coût et solde -->
                <div
                  v-if="!isInitialUsername"
                  class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5 text-xs"
                >
                  <div class="flex justify-between items-center text-gray-300">
                    <span>Coût de la modification :</span>
                    <span class="font-bold text-amber-300 font-display text-sm"
                      >{{ USERNAME_CHANGE_COST }} 🪙</span
                    >
                  </div>
                  <div class="flex justify-between items-center text-gray-400 text-[11px]">
                    <span>Votre solde actuel :</span>
                    <span
                      :class="
                        hasEnoughCoins
                          ? 'text-gray-300 font-semibold'
                          : 'text-rose-400 font-semibold'
                      "
                    >
                      {{ userStore.coins }} 🪙
                    </span>
                  </div>
                  <p v-if="!hasEnoughCoins" class="text-rose-400 font-medium text-[11px] pt-1">
                    Solde insuffisant pour changer de pseudonyme.
                  </p>
                </div>
                <div
                  v-else
                  class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-sparkles" class="text-sm shrink-0" />
                  <span>Premier choix de pseudonyme offert (gratuit).</span>
                </div>

                <!-- Règles du pseudo -->
                <div
                  class="text-[11px] text-gray-400 space-y-0.5 bg-white/5 rounded-xl p-3 border border-white/5"
                >
                  <p class="font-semibold text-gray-300">Règles :</p>
                  <p>• Entre 4 et 16 caractères</p>
                  <p>• Lettres, chiffres, tirets et underscores</p>
                </div>

                <!-- Affichage d'erreur -->
                <div v-if="editUsernameError">
                  <UAlert
                    color="error"
                    variant="soft"
                    icon="i-heroicons-exclamation-triangle"
                    :title="editUsernameError"
                    :ui="{ wrapper: 'rounded-xl' }"
                  />
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-3 pt-2">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    class="font-display font-bold uppercase tracking-wider text-xs"
                    @click="editUsernameModalOpen = false"
                  >
                    Annuler
                  </UButton>
                  <UButton
                    type="submit"
                    color="primary"
                    :loading="loadingUpdateUser"
                    :disabled="loadingUpdateUser || (!isInitialUsername && !hasEnoughCoins)"
                    class="font-display font-black uppercase tracking-wider text-xs px-5 py-2.5"
                  >
                    <template v-if="!isInitialUsername">
                      Confirmer ({{ USERNAME_CHANGE_COST }} 🪙)
                    </template>
                    <template v-else> Enregistrer </template>
                  </UButton>
                </div>
              </form>
            </UCard>
          </template>
        </UModal>

        <!-- Carte Contributeur / L'Atelier (Affiché UNIQUEMENT si >= 1 contribution) -->
        <UCard
          v-if="contributorStats"
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-light-bulb" class="text-amber-400 text-lg" />
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display">
                  Atelier & Contributions
                </h3>
              </div>
              <CommunityContributorTrustBadge :trust="contributorStats" size="sm" />
            </div>

            <div class="grid grid-cols-3 gap-2.5 text-center">
              <div class="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-0.5">
                <p class="text-[9px] uppercase font-bold text-gray-500 font-display">Validées</p>
                <p class="text-lg font-black text-emerald-400 font-display">
                  {{ contributorStats.totalApproved }}
                </p>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-0.5">
                <p class="text-[9px] uppercase font-bold text-gray-500 font-display">Taux Succès</p>
                <p class="text-lg font-black text-white font-display">
                  {{ contributorStats.approvalRate }}%
                </p>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-0.5">
                <p class="text-[9px] uppercase font-bold text-gray-500 font-display">PO Gagnées</p>
                <p class="text-lg font-black text-amber-400 font-display">
                  {{ contributorStats.totalRoyaltiesEarned }} 🪙
                </p>
              </div>
            </div>

            <div class="pt-1">
              <UButton
                to="/community"
                variant="soft"
                color="primary"
                size="xs"
                block
                class="font-bold font-display"
                icon="i-heroicons-arrow-right"
              >
                Gérer mes questions dans l'Atelier
              </UButton>
            </div>
          </div>
        </UCard>

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
import { USERNAME_CHANGE_COST, validateUsername } from "#shared/user";

const supabase = useSupabaseClient();
const router = useRouter();
const userStore = useUserStore();
const { authFetch } = useAuthFetch();
const toast = useToast();

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
const autoValidateAnswer = ref(false);
const loadingAutoValidateAnswer = ref(false);

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

const editUsernameModalOpen = ref(false);
const editUsernameValue = ref("");
const editUsernameError = ref("");

const isInitialUsername = computed(
  () => !initialUsername.value || initialUsername.value.trim() === "",
);
const hasEnoughCoins = computed(
  () => isInitialUsername.value || userStore.coins >= USERNAME_CHANGE_COST,
);

function openEditUsernameModal() {
  editUsernameValue.value = username.value;
  editUsernameError.value = "";
  editUsernameModalOpen.value = true;
}

const achievements = ref<any[]>([]);
const userAchievements = ref<any[]>([]);
const battleRoyaleHistory = ref<any[]>([]);
const showdownHistory = ref<any[]>([]);
const dailyHistory = ref<any[]>([]);
const themeProgress = ref<any[]>([]);
const brRank = ref<any>(null);
const showdownRank = ref<any>(null);
const globalStats = ref<any>(null);
const contributorStats = ref<any>(null);

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
    autoValidateAnswer.value = userConnected?.autoValidateAnswer ?? false;

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

    contributorStats.value = await $fetch<any>(`/api/community/submissions/stats/${userId}`).catch(
      () => null,
    );
  } catch (e) {
    console.error("Failed to load user history:", e);
  } finally {
    loadingHistory.value = false;
  }
}

async function handleSaveUsernameModal() {
  editUsernameError.value = "";

  const validation = validateUsername(editUsernameValue.value);
  if (!validation.valid) {
    editUsernameError.value = validation.error || "Pseudonyme invalide.";
    return;
  }

  if (validation.trimmed === initialUsername.value) {
    editUsernameModalOpen.value = false;
    return;
  }

  const isPaying = !isInitialUsername.value;
  if (isPaying && !hasEnoughCoins.value) {
    editUsernameError.value = `Solde insuffisant : changer de pseudonyme requiert ${USERNAME_CHANGE_COST} 🪙 (vous possédez ${userStore.coins} 🪙).`;
    return;
  }

  try {
    loadingUpdateUser.value = true;

    // Vérification de la disponibilité du pseudo au moment du clic
    const checkRes = await $fetch<{ available: boolean; message?: string }>(
      "/api/user/check-username",
      {
        params: { username: validation.trimmed },
      },
    ).catch(() => null);

    if (checkRes && !checkRes.available) {
      editUsernameError.value =
        checkRes.message || "Ce pseudonyme est déjà utilisé par un autre joueur.";
      return;
    }

    const userUpdated = await authFetch<any>("/api/user/username", {
      method: "POST",
      body: {
        username: validation.trimmed,
      },
    });

    username.value = userUpdated?.name ?? validation.trimmed;
    initialUsername.value = userUpdated?.name ?? validation.trimmed;

    if (userStore.user) {
      userStore.user.name = username.value;
      if (userUpdated?.Wallet) {
        userStore.user.Wallet = userUpdated.Wallet;
      }
    }

    editUsernameModalOpen.value = false;

    toast.add({
      title: "Profil mis à jour",
      description: isPaying
        ? `Votre pseudonyme a bien été changé (${USERNAME_CHANGE_COST} 🪙 débitées).`
        : "Votre pseudonyme a été enregistré avec succès.",
      color: "success",
    });
  } catch (e: any) {
    console.error("Failed to update username:", e);
    editUsernameError.value =
      e?.data?.statusMessage || e?.message || "Impossible de mettre à jour le pseudonyme.";
  } finally {
    loadingUpdateUser.value = false;
  }
}

async function updateAutoValidateAnswer(value: boolean) {
  const previousValue = autoValidateAnswer.value;
  autoValidateAnswer.value = value;
  try {
    loadingAutoValidateAnswer.value = true;
    await authFetch<any>("/api/user/settings", {
      method: "POST",
      body: {
        autoValidateAnswer: value,
      },
    });
    if (userStore.user) {
      userStore.user.autoValidateAnswer = value;
    }
  } catch (e) {
    console.error("Failed to update autoValidateAnswer:", e);
    autoValidateAnswer.value = previousValue;
  } finally {
    loadingAutoValidateAnswer.value = false;
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
