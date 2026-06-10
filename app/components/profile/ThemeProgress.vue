<template>
  <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
    <div class="space-y-4">
      <h3
        class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
      >
        <UIcon
          name="i-heroicons-academic-cap"
          class="mr-2 text-violet-500 text-base animate-pulse"
        />
        Progression par Thème
      </h3>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="flex items-center space-x-3 p-3 bg-slate-950/20 border border-white/5 rounded-2xl"
        >
          <USkeleton class="h-12 w-12 rounded-xl bg-slate-800 shrink-0" />
          <div class="space-y-2 flex-1">
            <USkeleton class="h-3.5 w-1/2 bg-slate-800" />
            <USkeleton class="h-2 w-full bg-slate-800" />
          </div>
        </div>
      </div>

      <div
        v-else-if="!items || items.length === 0"
        class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
      >
        <p class="text-xs text-gray-500">Aucune progression enregistrée.</p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar"
      >
        <div
          v-for="item in items"
          :key="item.slug"
          class="flex items-center space-x-3 p-3 bg-slate-950/20 border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300"
        >
          <img
            :src="item.picture"
            :alt="item.name"
            class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
          />
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black text-white font-display truncate pr-1">
                {{ item.name }}
              </h4>
              <span
                v-if="item.mastery > 0"
                class="flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                :class="getMasteryColorClass(item.mastery).badge"
              >
                <UIcon
                  name="i-heroicons-academic-cap"
                  class="mr-0.5 text-xs"
                  :class="getMasteryColorClass(item.mastery).icon"
                />
                {{ item.mastery.toFixed(1) }}
              </span>
            </div>

            <!-- Custom premium progress bar -->
            <div class="space-y-1">
              <div
                class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 relative"
              >
                <div
                  class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                  :style="{
                    width: `${item.questionCount > 0 ? (item.responseCount / item.questionCount) * 100 : 0}%`,
                  }"
                ></div>
              </div>
              <div class="flex justify-between text-[9px] font-bold text-gray-500 font-display">
                <span>{{ item.responseCount }} / {{ item.questionCount }} résolues</span>
                <span
                  >{{
                    item.questionCount > 0
                      ? Math.round((item.responseCount / item.questionCount) * 100)
                      : 0
                  }}%</span
                >
              </div>
            </div>
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
