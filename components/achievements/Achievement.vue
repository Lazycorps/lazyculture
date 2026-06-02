<template>
  <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 select-none">
    <div
      v-for="achievement in achievementsStore.achievements.filter((a) => !a.hidden)"
      :key="achievement.id"
      class="flex justify-center"
    >
      <UTooltip
        :popper="{ placement: 'top' }"
        :ui="{
          content:
            'h-auto max-h-none py-2.5 px-3 bg-slate-950/95 border border-white/10 rounded-xl shadow-glass flex flex-col items-center justify-center text-center select-text',
        }"
        class="w-full"
      >
        <!-- Custom Tooltip Content inside :content fallback or custom slot -->
        <template #content>
          <div class="p-1.5 space-y-0.5 text-center">
            <p class="font-extrabold text-white text-xs">{{ achievement.title }}</p>
            <p class="text-[10px] text-amber-400 font-bold font-display">
              +{{ achievement.xpEarned }} XP
            </p>
            <p class="text-[10px] text-gray-300 font-medium leading-tight max-w-[150px] mx-auto">
              {{ achievement.description }}
            </p>
          </div>
        </template>

        <!-- Achievement Badge Container -->
        <div
          class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center cursor-help border transition-all duration-200"
          :class="
            userHasAchievement(achievement.id)
              ? 'bg-slate-900 border-amber-500/40 shadow-lg gold-glow scale-100 hover:scale-105'
              : 'bg-slate-950/50 border-white/5 grayscale opacity-45 scale-95 hover:opacity-70 hover:scale-[0.98]'
          "
        >
          <!-- Badge Icon Image -->
          <img
            v-if="achievement?.icon"
            :src="achievement.icon"
            alt="Achievement Icon"
            class="w-4/5 h-4/5 object-contain"
          />
          <!-- Fallback Trophy Emoji -->
          <span v-else class="text-3xl sm:text-4xl">🏆</span>

          <!-- Locked padlock badge badge -->
          <span
            v-if="!userHasAchievement(achievement.id)"
            class="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-slate-950/90 border border-white/10 flex items-center justify-center text-[10px] text-gray-400"
          >
            🔒
          </span>
        </div>
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
const achievementsStore = useAchievementStore();

function userHasAchievement(achievementId: number) {
  return achievementsStore.userAchievements.some((a) => a.achievementId === achievementId);
}
</script>

<style scoped>
/* Glowing shadow for unlocked badges */
.gold-glow {
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.5) !important;
}
</style>
