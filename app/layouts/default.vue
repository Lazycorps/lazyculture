<template>
  <div
    id="app-container"
    class="min-h-dvh flex flex-col md:flex-row bg-[#070a13] text-gray-100 font-sans"
  >
    <!-- Desktop Sidebar -->
    <LayoutDesktopSidebar
      :user="user"
      :user-profile="userProfile"
      :xp-progress="xpProgress"
      :nav-items="navItems"
    />

    <!-- Mobile Top Header -->
    <LayoutMobileHeader :user="user" :user-profile="userProfile" />

    <!-- Main Page Content -->
    <main
      ref="mainElement"
      :class="[
        'flex-1 flex flex-col min-h-0 mt-16 md:mt-0',
        route.meta.fullscreen
          ? 'overflow-hidden p-0'
          : ['overflow-y-auto px-4 py-6 md:p-8', showBottomNav ? 'pb-28 md:pb-8' : 'pb-8'],
      ]"
      @scroll="handleScroll"
    >
      <div
        :class="['w-full h-full flex flex-col', route.meta.fullscreen ? '' : 'max-w-6xl mx-auto']"
      >
        <slot />
      </div>
    </main>

    <!-- Mobile Glass Bottom Bar -->
    <LayoutMobileBottomNav
      :show-bottom-nav="showBottomNav"
      :is-nav-hidden-by-scroll="isNavHiddenByScroll"
      :nav-items="navItems"
    />

    <!-- Global Floating widgets for Battle Royale -->
    <LayoutFloatingWidgets />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/userStore";

import { useNotificationStore } from "~/stores/notificationStore";

const router = useRouter();
const user = useSupabaseUser();
const showBottomNav = useState("showBottomNav", () => true);
const userStore = useUserStore();
const notificationStore = useNotificationStore();

const userProfile = computed(() => {
  if (!userStore.user) return null;
  return {
    name: userStore.user.name || "Joueur",
    level: userStore.user.UserProgress?.levelId || 1,
    xp: userStore.user.UserProgress?.xp || 0,
    xpThreshold: userStore.user.UserProgress?.level?.xp_threshold || 0,
    nextLevelTreshold: userStore.user.nextLevelTreshold || 100,
  };
});

const xpProgress = computed(() => userStore.xpProgress);

const navItems = computed(() => [
  { label: "Thèmes", path: "/themes", icon: "i-heroicons-book-open" },
  { label: "Aventures", path: "/adventure", icon: "i-heroicons-map" },
  { label: "Quotidien", path: "/series/daily", icon: "i-heroicons-calendar" },
  // { label: "Ascension", path: "/series/ascent", icon: "i-heroicons-arrow-trending-up" },
  // { label: "Brainrun", path: "/series/brainrun", icon: "i-heroicons-bolt" },
  { label: "Multijoueur", path: "/multiplayer", icon: "i-heroicons-users" },
  { label: "Classement", path: "/ranking", icon: "i-heroicons-chart-bar" },
]);

onMounted(async () => {
  await userStore.fetchUser();
  if (user.value) {
    notificationStore.startPolling();
  }
});

watch(user, async (newUser) => {
  if (newUser) {
    await userStore.fetchUser(true);
    notificationStore.startPolling();
  } else {
    userStore.clearUser();
    notificationStore.stopPolling();
    notificationStore.$reset();
  }
});

onUnmounted(() => {
  notificationStore.stopPolling();
});

const route = useRoute();

const pageTitle = computed(() => {
  const match = navItems.value.find(
    (item) => route.path === item.path || route.path.startsWith(item.path + "/"),
  );
  return match?.label ?? "LazyCulture";
});

useHead({ title: pageTitle });

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
    if (mainElement.value) {
      mainElement.value.scrollTop = 0;
    }
    if (import.meta.client) {
      window.scrollTo(0, 0);
    }
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
