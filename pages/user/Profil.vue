<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none">
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <!-- Profile Header (Avatar, Level & Username) -->
      <div
        class="flex flex-col items-center sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8"
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

      <!-- Achievements Subsection -->
      <div class="mt-8 space-y-4">
        <h3
          class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
        >
          <UIcon name="i-heroicons-trophy" class="mr-2 text-amber-500 text-base animate-pulse" />
          Trophées & Exploits
        </h3>

        <div class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
          <AchievementComponent />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end pt-2">
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
  </div>
</template>

<script setup lang="ts">
import AchievementComponent from "@/components/achievements/Achievement.vue";

const supabase = useSupabaseClient();
const router = useRouter();
const achievementStore = useAchievementStore();

const loading = ref(true);
const username = ref("");
const email = ref("");
const level = ref(0);
const xp = ref(0);
const xpThreshold = ref(0);
const xpMax = ref(0);
const userNameChanged = ref(false);
const loadingUpdateUser = ref(false);

const xpProgress = computed(() => {
  const current = xp.value - xpThreshold.value;
  const max = xpMax.value - xpThreshold.value;
  if (max <= 0) return 0;
  return (current / max) * 100;
});

onMounted(async () => {
  await fetchUser();
  await achievementStore.loadData();
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
  } catch (e) {
    console.error("Failed to load current user profil:", e);
  } finally {
    loading.value = false;
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
</script>

<style scoped>
/* Scoped modifications if needed */
</style>
