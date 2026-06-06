<template>
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
</template>

<script setup lang="ts">
const router = useRouter();

defineProps<{
  user: any;
  userProfile: any;
  xpProgress: number;
  navItems: Array<{ label: string; path: string; icon: string }>;
}>();
</script>
