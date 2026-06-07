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
          👑
        </div>
        <div>
          <h1
            class="text-lg font-black font-display bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-wide"
          >
            Lazyculture
          </h1>
          <p class="text-[10px] text-violet-400 font-bold uppercase tracking-widest font-display">
            Admin Panel
          </p>
        </div>
      </div>

      <!-- Navigation groups -->
      <nav class="flex-1 space-y-6">
        <!-- Maintenance Section -->
        <div class="space-y-2">
          <p
            class="px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 font-display"
          >
            Maintenance
          </p>
          <div class="space-y-1">
            <NuxtLink
              to="/admin/maintenance/questions"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              active-class="nav-active text-violet-400 bg-violet-600/10"
            >
              <UIcon
                name="i-heroicons-question-mark-circle"
                class="text-xl group-hover:scale-110 transition-transform"
              />
              <span class="font-semibold font-display tracking-wide">Questions</span>
            </NuxtLink>
            <NuxtLink
              to="/admin/maintenance/themes"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              active-class="nav-active text-violet-400 bg-violet-600/10"
            >
              <UIcon
                name="i-heroicons-book-open"
                class="text-xl group-hover:scale-110 transition-transform"
              />
              <span class="font-semibold font-display tracking-wide">Thèmes</span>
            </NuxtLink>
            <NuxtLink
              to="/admin/adventures"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              active-class="nav-active text-violet-400 bg-violet-600/10"
            >
              <UIcon
                name="i-heroicons-map"
                class="text-xl group-hover:scale-110 transition-transform"
              />
              <span class="font-semibold font-display tracking-wide">Aventures</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Imports Section -->
        <div class="space-y-2">
          <p
            class="px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 font-display"
          >
            Imports
          </p>
          <div class="space-y-1">
            <NuxtLink
              to="/admin/importquestions"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              active-class="nav-active text-violet-400 bg-violet-600/10"
            >
              <UIcon
                name="i-heroicons-arrow-up-tray"
                class="text-xl group-hover:scale-110 transition-transform"
              />
              <span class="font-semibold font-display tracking-wide">JSON</span>
            </NuxtLink>
            <NuxtLink
              to="/admin/import-culturequiz"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              active-class="nav-active text-violet-400 bg-violet-600/10"
            >
              <UIcon
                name="i-heroicons-globe-alt"
                class="text-xl group-hover:scale-110 transition-transform"
              />
              <span class="font-semibold font-display tracking-wide">CultureQuiz</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- Back to App Button -->
      <div class="pt-4 border-t border-white/5">
        <UButton
          to="/themes"
          block
          color="neutral"
          variant="ghost"
          class="flex items-center justify-start space-x-3 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl"
        >
          <UIcon name="i-heroicons-arrow-left-on-rectangle" class="text-xl" />
          <span class="font-semibold font-display tracking-wide text-sm">Retour au site</span>
        </UButton>
      </div>
    </aside>

    <!-- Mobile Top Header -->
    <header
      class="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 select-none"
    >
      <div class="flex items-center space-x-3" @click="router.push('/themes')">
        <div
          class="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg animate-pulse"
        >
          👑
        </div>
        <div class="flex flex-col">
          <span
            class="font-black text-sm font-display bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"
          >
            Lazyculture Admin
          </span>
        </div>
      </div>

      <UButton
        to="/themes"
        color="primary"
        variant="solid"
        size="xs"
        class="rounded-full px-3 py-1 font-bold font-display"
      >
        Quitter Admin
      </UButton>
    </header>

    <!-- Main Page Content -->
    <main
      ref="mainElement"
      class="flex-1 overflow-y-auto px-4 py-6 md:p-8 mt-16 md:mt-0 pb-28 md:pb-8 flex flex-col min-h-0"
    >
      <div class="max-w-6xl mx-auto w-full h-full flex flex-col">
        <slot />
      </div>
    </main>

    <!-- Mobile Glass Bottom Bar -->
    <nav
      class="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-glass flex justify-around py-3 px-2"
    >
      <NuxtLink
        to="/admin/maintenance/questions"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon
          name="i-heroicons-question-mark-circle"
          class="text-xl group-hover:scale-110 transition-transform mb-1"
        />
        <span class="text-[10px] font-bold font-display">Questions</span>
      </NuxtLink>

      <NuxtLink
        to="/admin/maintenance/themes"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon
          name="i-heroicons-book-open"
          class="text-xl group-hover:scale-110 transition-transform mb-1"
        />
        <span class="text-[10px] font-bold font-display">Thèmes</span>
      </NuxtLink>

      <NuxtLink
        to="/admin/adventures"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon
          name="i-heroicons-map"
          class="text-xl group-hover:scale-110 transition-transform mb-1"
        />
        <span class="text-[10px] font-bold font-display">Aventures</span>
      </NuxtLink>

      <NuxtLink
        to="/admin/importquestions"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon
          name="i-heroicons-arrow-up-tray"
          class="text-xl group-hover:scale-110 transition-transform mb-1"
        />
        <span class="text-[10px] font-bold font-display">JSON</span>
      </NuxtLink>

      <NuxtLink
        to="/admin/import-culturequiz"
        class="flex flex-col items-center justify-center text-gray-400 px-3 py-1 rounded-xl transition-all group select-none"
        active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
      >
        <UIcon
          name="i-heroicons-globe-alt"
          class="text-xl group-hover:scale-110 transition-transform mb-1"
        />
        <span class="text-[10px] font-bold font-display">CultureQuiz</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const mainElement = ref<HTMLElement | null>(null);

watch(
  () => route.path,
  () => {
    if (mainElement.value) {
      mainElement.value.scrollTop = 0;
    }
    if (import.meta.client) {
      window.scrollTo(0, 0);
    }
  },
);
</script>

<style scoped>
/* Scoped styles */
</style>
