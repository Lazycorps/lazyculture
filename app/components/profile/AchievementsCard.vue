<template>
  <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
    <div class="space-y-4">
      <h3
        class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
      >
        <UIcon name="i-heroicons-trophy" class="mr-2 text-amber-500 text-base animate-pulse" />
        Trophées &amp; Exploits
      </h3>

      <div class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
        <AchievementComponent :achievements="achievements" :userAchievements="userAchievements" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import AchievementComponent from "@/components/achievements/Achievement.vue";

defineProps<{
  achievements: any[];
  userAchievements: any[];
}>();
</script>
