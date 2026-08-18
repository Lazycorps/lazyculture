<template>
  <div
    class="quest-notification flex items-center p-3.5 bg-slate-950 border rounded-2xl space-x-3.5 select-none shadow-2xl backdrop-blur-xl transition-all duration-300"
    :class="
      quest?.category === 'SHORT'
        ? 'border-amber-500/40 shadow-amber-500/10'
        : 'border-violet-500/40 shadow-violet-500/10'
    "
  >
    <!-- Quest Icon Capsule -->
    <div
      class="w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-xl border relative overflow-hidden"
      :class="
        quest?.category === 'SHORT'
          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
          : 'bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border-violet-500/30 text-violet-400'
      "
    >
      <span class="text-2xl animate-bounce">{{ quest?.category === "SHORT" ? "⚡" : "🏆" }}</span>
    </div>

    <!-- Text & Rewards Content -->
    <div class="flex-1 min-w-0 space-y-0.5">
      <div class="flex items-center gap-1.5">
        <p
          class="text-[10px] font-black uppercase tracking-wider font-display"
          :class="quest?.category === 'SHORT' ? 'text-amber-400' : 'text-violet-400'"
        >
          {{ quest?.category === "SHORT" ? "Quête Express Validée !" : "Quête du Jour Validée !" }}
        </p>
        <span
          v-if="quest?.questStreak && quest.questStreak > 1"
          class="text-[8px] bg-red-500/15 border border-red-500/30 text-red-400 font-black px-1.5 py-0.2 rounded-full font-display"
        >
          {{ quest.questStreak }} 🔥
        </span>
      </div>

      <p class="font-black text-sm text-white truncate font-display">
        {{ quest?.title }}
      </p>

      <div class="flex items-center gap-2 text-[11px]">
        <span class="text-emerald-400 font-black font-display flex items-center gap-1">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clip-rule="evenodd"
            />
          </svg>
          +{{ quest?.coinsEarned || 10 }} 🪙 pièces obtenues
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { ToastOptions } from "vue3-toastify";

export interface CompletedQuestToastData {
  id: number;
  category: "SHORT" | "LONG";
  questType: string;
  title: string;
  description: string;
  targetTheme?: string | null;
  themeName?: string | null;
  coinsEarned: number;
  questStreak: number;
}

const props = defineProps<{
  toastProps?: PropType<ToastOptions>;
  quest?: CompletedQuestToastData;
}>();
</script>

<style scoped>
.quest-notification {
  min-width: 280px;
  max-width: 380px;
}
</style>
