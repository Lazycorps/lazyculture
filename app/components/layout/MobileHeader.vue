<template>
  <header
    class="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 select-none"
  >
    <div class="flex items-center space-x-3 cursor-pointer" @click="router.push('/themes')">
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
</template>

<script setup lang="ts">
const router = useRouter();

defineProps<{
  user: any;
  userProfile: any;
}>();
</script>
