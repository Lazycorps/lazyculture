<template>
  <div
    id="app-container"
    class="min-h-screen flex flex-col md:flex-row bg-[#070a13] text-gray-100 font-sans"
  >
    <!-- Desktop Sidebar -->
    <aside
      class="hidden md:flex md:w-64 flex-col bg-slate-950/40 backdrop-blur-xl border-r border-white/10 p-6 space-y-8 flex-shrink-0"
    >
      <!-- Logo and App Title -->
      <div
        class="flex items-center space-x-3 cursor-pointer select-none group"
        @click="router.push('/themes')"
      >
        <div
          class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
        >
          🐢
        </div>
        <h1
          class="text-xl font-black font-display bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-wide"
        >
          Lazyculture
        </h1>
      </div>

      <!-- Navigation links -->
      <nav class="flex-1 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
          active-class="nav-active text-violet-400 bg-violet-600/10"
        >
          <UIcon :name="item.icon" class="text-xl group-hover:scale-110 transition-transform" />
          <span class="font-semibold font-display tracking-wide">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Mini-profile/Stats Card in Desktop Sidebar -->
      <div
        class="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 shadow-glass"
        v-if="user"
      >
        <NuxtLink
          to="/user/profil"
          class="flex items-center space-x-3 cursor-pointer group/profile -mx-2 -my-1 p-2 rounded-xl hover:bg-white/5 transition-all"
        >
          <UAvatar
            icon="i-heroicons-user"
            size="md"
            class="bg-violet-600/20 text-violet-300 border border-violet-500/30 group-hover/profile:border-violet-500/60 transition-colors"
          />
          <div class="overflow-hidden">
            <p
              class="font-bold text-sm truncate text-white group-hover/profile:text-violet-400 transition-colors"
            >
              {{ userProfile?.name || "Joueur" }}
            </p>
            <p class="text-xs text-violet-400 font-semibold font-display">
              Niveau {{ userProfile?.level || 1 }}
            </p>
          </div>
        </NuxtLink>

        <!-- Level Progress Jauge -->
        <div class="space-y-1">
          <!-- Custom Premium Glass Progress Bar -->
          <div
            class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
          >
            <div
              class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
              :style="{ width: `${xpProgress}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-[10px] font-bold text-gray-500 font-display">
            <span>{{ userProfile?.xp || 0 }} XP</span>
            <span>{{ userProfile?.nextLevelTreshold || 100 }} XP</span>
          </div>
        </div>
      </div>
      <div v-else class="p-4 bg-white/5 border border-white/10 rounded-2xl text-center space-y-3">
        <p class="text-xs text-gray-400 font-medium">
          Connectez-vous pour enregistrer votre progression !
        </p>
        <UButton to="/login" block color="primary" variant="solid" size="sm">Connexion</UButton>
      </div>
    </aside>

    <!-- Mobile Top Header -->
    <header
      class="md:hidden flex items-center justify-between px-6 py-4 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 select-none"
    >
      <div class="flex items-center space-x-3" @click="router.push('/themes')">
        <div
          class="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg"
        >
          🐢
        </div>
        <span
          class="font-black text-lg font-display bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"
          >Lazyculture</span
        >
      </div>

      <!-- Mini stats for mobile header -->
      <div v-if="user" class="flex items-center space-x-2">
        <NuxtLink
          to="/user/profil"
          class="flex items-center space-x-2 text-xs bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
        >
          <span class="flex items-center text-amber-400 font-extrabold font-display">
            <UIcon name="i-heroicons-bolt-solid" class="mr-1 text-sm animate-pulse" />
            {{ userProfile?.xp || 0 }} XP
          </span>
          <div class="w-px h-3 bg-white/20"></div>
          <span class="text-white font-bold truncate max-w-[80px]">{{
            userProfile?.name || "Joueur"
          }}</span>
        </NuxtLink>
      </div>
      <div v-else>
        <UButton
          to="/login"
          color="primary"
          variant="solid"
          size="xs"
          class="rounded-full px-3 py-1 font-bold"
        >
          Connexion
        </UButton>
      </div>
    </header>

    <!-- Main Page Content -->
    <main class="flex-1 overflow-y-auto px-4 py-6 md:p-8 pb-28 md:pb-8 flex flex-col min-h-0">
      <div class="max-w-6xl mx-auto w-full h-full flex flex-col">
        <slot />
      </div>
    </main>

    <!-- Mobile Glass Bottom Bar -->
    <nav
      class="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-glass flex justify-around py-3 px-2"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon :name="item.icon" class="text-2xl group-hover:scale-110 transition-transform mb-1" />
        <span class="text-[10px] font-bold font-display">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const user = useSupabaseUser();
const userProfile = ref<any>(null);

const xpProgress = computed(() => {
  if (!userProfile.value) return 0;
  const current = userProfile.value.xp ?? 0;
  const min = userProfile.value.xpThreshold ?? 0;
  const max = userProfile.value.nextLevelTreshold ?? 100;
  const diff = max - min;
  if (diff <= 0) return 0;
  return ((current - min) / diff) * 100;
});

const navItems = computed(() => [
  { label: "Thèmes", path: "/themes", icon: "i-heroicons-book-open" },
  { label: "Quotidien", path: "/series/daily", icon: "i-heroicons-calendar" },
  { label: "Ascension", path: "/series/ascent", icon: "i-heroicons-arrow-trending-up" },
  { label: "Classement", path: "/ranking", icon: "i-heroicons-chart-bar" },
]);

onMounted(async () => {
  await fetchProfile();
});

watch(user, async (newUser) => {
  if (newUser) {
    await fetchProfile();
  } else {
    userProfile.value = null;
  }
});

async function fetchProfile() {
  if (user.value) {
    try {
      const supabase = useSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const data = await $fetch<any>("/api/user/current", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      userProfile.value = {
        name: data?.name || "Joueur",
        level: data?.UserProgress?.levelId || 1,
        xp: data?.UserProgress?.xp || 0,
        xpThreshold: data?.UserProgress?.level?.xp_threshold || 0,
        nextLevelTreshold: data?.nextLevelTreshold || 100,
      };
    } catch (e) {
      console.error("Failed to fetch user in layout:", e);
    }
  }
}
</script>

<style>
/* Nuxt UI primary color customizations */
:root {
  --color-primary-50: 245 243 255;
  --color-primary-100: 237 233 254;
  --color-primary-200: 221 214 254;
  --color-primary-300: 196 181 253;
  --color-primary-400: 167 139 250;
  --color-primary-505: 139 92 246; /* fallback */
  --color-primary-500: 139 92 246;
  --color-primary-600: 124 58 237;
  --color-primary-700: 109 40 217;
  --color-primary-800: 91 33 182;
  --color-primary-900: 76 29 149;
  --color-primary-950: 46 16 101;
}
</style>
