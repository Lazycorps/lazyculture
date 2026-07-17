<template>
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
      :active-class="item.path === '/' ? '' : 'nav-mobile-active text-violet-400 bg-violet-600/10'"
      exact-active-class="nav-mobile-active text-violet-400 bg-violet-600/10"
    >
      <UIcon :name="item.icon" class="text-2xl group-hover:scale-110 transition-transform mb-1" />
      <span class="text-[10px] font-bold font-display">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  showBottomNav: boolean;
  isNavHiddenByScroll: boolean;
  navItems: Array<{ label: string; path: string; icon: string }>;
}>();
</script>
