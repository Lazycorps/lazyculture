<template>
  <div
    class="achievement-notification flex items-center p-3 bg-slate-950 border border-amber-500/30 rounded-xl space-x-4 select-none"
  >
    <!-- Achievement Icon -->
    <div
      class="w-14 h-14 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-neon"
    >
      <img
        v-if="achievement?.icon"
        :src="achievement.icon"
        alt="Achievement Icon"
        class="w-4/5 h-4/5 object-contain"
      />
      <div v-else class="text-2xl">🏆</div>
    </div>

    <!-- Text Content -->
    <div class="flex-1 min-w-0 space-y-0.5">
      <p class="text-xs font-black uppercase tracking-wider text-amber-400 font-display">
        Succès Déverrouillé !
      </p>
      <p class="font-extrabold text-sm text-white truncate font-display">
        {{ achievement?.title }}
      </p>
      <p class="text-[11px] text-gray-400 font-medium leading-tight">
        {{ achievement?.description }}
        <span class="text-emerald-400 font-bold font-display ml-1"
          >+{{ achievement?.xpEarned }} XP</span
        >
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { ToastOptions } from "vue3-toastify";
import type { UserAchievementDTO } from "~/models/DTO/achievementDTO";

const props = defineProps<{
  toastProps?: PropType<ToastOptions>;
  achievement?: UserAchievementDTO;
}>();
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
}
</style>
