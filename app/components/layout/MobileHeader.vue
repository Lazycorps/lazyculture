<template>
  <header
    class="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 select-none"
  >
    <div class="flex items-center space-x-3 cursor-pointer" @click="router.push('/themes')">
      <img src="/pwa-192x192.png" alt="Lazyculture" class="w-8 h-8 object-contain" />
      <span
        class="font-black text-lg font-display bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"
        >Lazyculture</span
      >
    </div>

    <!-- Mini stats for mobile header -->
    <ClientOnly>
      <div v-if="user" class="flex items-center">
        <div
          class="flex items-center bg-white/5 px-2.5 py-1 rounded-full border border-white/10 space-x-2"
        >
          <NuxtLink
            to="/user/profil"
            class="flex items-center space-x-2 text-xs active:scale-95 transition-all"
          >
            <span class="flex items-center text-amber-400 font-extrabold font-display">
              <UIcon name="i-heroicons-academic-cap-solid" class="mr-1 text-sm" />
              Niv. {{ userProfile?.level || 1 }}
            </span>
            <div class="w-px h-3 bg-white/20"></div>
            <span class="text-white font-bold truncate max-w-[80px]">{{
              userProfile?.name || "Joueur"
            }}</span>
          </NuxtLink>
          <div class="w-px h-3 bg-white/20"></div>
          <LayoutNotificationBell mini />
        </div>
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
    </ClientOnly>
  </header>
</template>

<script setup lang="ts">
const router = useRouter();

defineProps<{
  user: any;
  userProfile: any;
}>();
</script>
