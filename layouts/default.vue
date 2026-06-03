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
    <main
      ref="mainElement"
      class="flex-1 overflow-y-auto px-4 py-6 md:p-8 flex flex-col min-h-0"
      :class="showBottomNav ? 'pb-28 md:pb-8' : 'pb-8'"
      @scroll="handleScroll"
    >
      <div class="max-w-6xl mx-auto w-full h-full flex flex-col">
        <slot />
      </div>
    </main>

    <!-- Mobile Glass Bottom Bar -->
    <nav
      v-if="showBottomNav"
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 shadow-glass flex justify-around py-3 px-2 transition-transform duration-300"
      :class="{ 'translate-y-full': isNavHiddenByScroll }"
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

    <!-- Global Floating widgets for Battle Royale -->
    <div
      v-if="user"
      class="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none w-80"
    >
      <!-- 1. Recoverable Active Game Alert -->
      <div
        v-if="brSession.recoverableMatchId.value && route.path !== '/series/battle-royale'"
        class="pointer-events-auto bg-[#1e1b4b]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] space-y-3 transform transition-all duration-300 animate-slide-in"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-2xl animate-pulse">⚡</span>
            <div>
              <h4 class="text-xs font-black font-display text-white uppercase tracking-wider">
                Partie en cours !
              </h4>
              <p class="text-[10px] text-gray-300">Vous avez un match de Battle Royale actif.</p>
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            size="xs"
            color="neutral"
            variant="ghost"
            class="rounded-full hover:text-white"
            @click="brSession.recoverableMatchId.value = null"
          />
        </div>
        <UButton
          color="warning"
          size="sm"
          block
          icon="i-heroicons-arrow-right-circle"
          class="font-black font-display uppercase tracking-widest py-2"
          @click="resumeActiveBRMatch"
        >
          Rejoindre la partie
        </UButton>
      </div>

      <!-- 2. Active Lobby Status tracking (when navigated away) -->
      <div
        v-if="
          brSession.matchId.value &&
          brSession.status.value === 'WAITING' &&
          route.path !== '/series/battle-royale'
        "
        class="pointer-events-auto bg-[#0f172a]/95 backdrop-blur-md border border-violet-500/35 rounded-2xl p-4 shadow-[0_0_20px_rgba(139,92,246,0.25)] space-y-3 transform transition-all duration-300 animate-slide-in"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-2xl animate-spin-slow">🐢</span>
            <div>
              <h4 class="text-xs font-black font-display text-white uppercase tracking-wider">
                Salon d'attente
              </h4>
              <p class="text-[10px] text-violet-300 font-semibold font-display">
                {{ brSession.players.value.length }} joueur(s) connectés
              </p>
            </div>
          </div>
        </div>

        <div
          class="text-[10px] text-gray-400 bg-white/5 border border-white/5 rounded px-2 py-1 flex items-center justify-between"
        >
          <span>Statut :</span>
          <span
            v-if="brSession.isCountdownRunning.value"
            class="text-cyan-400 font-extrabold animate-pulse"
          >
            ⏳ Lancement ({{ brSession.countdown.value }}s)
          </span>
          <span v-else class="text-violet-400 font-bold"> En attente de joueurs... </span>
        </div>

        <div class="flex space-x-2">
          <UButton
            color="error"
            size="xs"
            variant="ghost"
            class="font-bold uppercase tracking-wider"
            @click="brSession.disconnect"
          >
            Quitter
          </UButton>
          <UButton
            color="primary"
            size="xs"
            class="flex-1 font-black font-display uppercase tracking-wider py-1.5 justify-center"
            icon="i-heroicons-arrow-right"
            to="/series/battle-royale"
          >
            Retourner au Salon
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBattleRoyaleSession } from "~/composables/useBattleRoyaleSession";

const router = useRouter();
const user = useSupabaseUser();
const showBottomNav = useState("showBottomNav", () => true);
const userProfile = ref<any>(null);

const brSession = useBattleRoyaleSession();

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
  { label: "Battle Royale", path: "/series/battle-royale", icon: "i-heroicons-fire" },
  { label: "Classement", path: "/ranking", icon: "i-heroicons-chart-bar" },
]);

onMounted(async () => {
  await fetchProfile();
  if (user.value) {
    void brSession.checkActiveSession();
  }
});

watch(user, async (newUser) => {
  if (newUser) {
    await fetchProfile();
    void brSession.checkActiveSession();
  } else {
    userProfile.value = null;
    brSession.disconnect();
  }
});

function resumeActiveBRMatch() {
  if (brSession.recoverableMatchId.value && user.value) {
    brSession.connect(brSession.recoverableMatchId.value, user.value.id);
    router.push("/series/battle-royale");
  }
}

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

const route = useRoute();
const mainElement = ref<HTMLElement | null>(null);
const isNavHiddenByScroll = ref(false);
let lastScrollTop = 0;

function handleScroll() {
  if (!mainElement.value) return;
  const el = mainElement.value;
  const scrollTop = el.scrollTop;
  const scrollHeight = el.scrollHeight;
  const clientHeight = el.clientHeight;

  // Check if there is a scrollbar
  if (scrollHeight <= clientHeight) {
    isNavHiddenByScroll.value = false;
    return;
  }

  const delta = scrollTop - lastScrollTop;
  if (Math.abs(delta) < 5) return;

  if (delta > 0 && scrollTop > 50) {
    isNavHiddenByScroll.value = true;
  } else if (delta < 0) {
    isNavHiddenByScroll.value = false;
  }
  lastScrollTop = scrollTop;
}

watch(
  () => route.path,
  () => {
    isNavHiddenByScroll.value = false;
    lastScrollTop = 0;
  },
);
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

@keyframes br-slide-in {
  from {
    transform: translateY(1rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: br-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-spin-slow {
  animation: spin 8s linear infinite;
}
</style>
