<template>
  <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
    <div class="space-y-4">
      <h3
        class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
      >
        <UIcon name="i-heroicons-calendar-days" class="mr-2 text-violet-400 text-base" />
        Historique Défis Quotidiens (20 derniers)
      </h3>

      <div v-if="loading" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-20 w-full bg-slate-800 rounded-xl" />
      </div>

      <div
        v-else-if="items.length === 0"
        class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
      >
        <p class="text-sm text-gray-500">Aucun défi quotidien résolu.</p>
      </div>

      <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        <div
          v-for="daily in items"
          :key="daily.responseId"
          class="bg-slate-950/20 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-300 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-left space-y-0.5">
              <span class="font-extrabold text-sm text-white font-display block">
                {{ daily.title }}
              </span>
              <span class="text-[10px] text-gray-500 block font-medium">
                Résolu le {{ formatDate(daily.createDate) }} • Temps :
                {{ formatTime(daily.elapsedTime) }}
              </span>
            </div>

            <div class="text-right space-y-0.5">
              <span
                class="text-base font-black font-display block"
                :class="[
                  daily.correctCount >= 8
                    ? 'text-emerald-400'
                    : daily.correctCount >= 5
                      ? 'text-amber-400'
                      : 'text-rose-400',
                ]"
              >
                {{ daily.correctCount }} / {{ daily.totalQuestions }}
              </span>
              <span class="text-[10px] text-emerald-400 font-bold font-display block">
                +{{ daily.xpEarned }} XP
              </span>
            </div>
          </div>

          <!-- Custom premium progress bar -->
          <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="[
                daily.correctCount >= 8
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : daily.correctCount >= 5
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-rose-500 to-rose-400',
              ]"
              :style="{ width: `${(daily.correctCount / daily.totalQuestions) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    items: any[];
    loading?: boolean;
  }>(),
  { loading: false },
);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
