<template>
  <div
    class="flex flex-col justify-between gap-2.5 bg-slate-950/40 border border-white/5 rounded-2xl p-3.5 hover:border-violet-500/20 transition-all duration-300 relative overflow-hidden h-full"
  >
    <!-- Top Row: Title, Streak Pill & Overall Status (Exact visual symmetry with DailyStreakTimeline) -->
    <div class="flex items-center justify-between gap-2">
      <!-- Left: Title & Flame Streak -->
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-base shrink-0">🎯</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h4
              class="text-xs font-black text-white font-display uppercase tracking-wider truncate"
            >
              Quêtes du jour
            </h4>
            <span
              v-if="questStreak > 0"
              class="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 font-black px-1.5 py-0 rounded-full font-display shrink-0"
            >
              {{ questStreak }} 🔥
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Global status badge / Reroll info -->
      <div class="shrink-0">
        <span
          v-if="completedCount === 2"
          class="text-[10px] text-emerald-400 font-bold font-display flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
        >
          <UIcon name="i-heroicons-check-circle-solid" class="text-sm" /> Toutes validées
        </span>
        <span
          v-else-if="canRerollToday"
          class="text-[9px] font-bold font-display text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"
          title="Vous disposez d'un changement de quête gratuit"
        >
          <UIcon name="i-heroicons-arrow-path" class="text-xs" /> 1 reroll dispo
        </span>
      </div>
    </div>

    <!-- Bottom: 2 Clickable Quest Boxes (Side-by-side on wide screens, stacked on small screens) -->
    <div class="pt-2 border-t border-white/5 flex-1 flex flex-col justify-center">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <!-- 1. Quête Express (Courte Thématique) - Clickable box -->
        <NuxtLink
          v-if="shortQuest"
          :to="shortQuest.actionUrl"
          class="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/40 hover:bg-slate-900/90 active:scale-[0.99] transition-all cursor-pointer select-none"
        >
          <!-- Icon & Quest Details -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-xs shrink-0 group-hover:scale-110 transition-transform">⚡</span>
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center justify-between gap-1.5">
                <span
                  class="text-[11px] font-bold text-white truncate font-display group-hover:text-amber-300 transition-colors"
                >
                  {{ shortQuest.themeName ? `Thème ${shortQuest.themeName}` : shortQuest.title }}
                </span>
                <span class="text-[9px] font-black font-display text-amber-400 shrink-0">
                  +{{ shortQuest.totalReward }} 🪙
                </span>
              </div>
              <!-- Quest Description -->
              <p class="text-[9px] text-gray-400 font-medium truncate leading-tight">
                {{ shortQuest.description }}
              </p>
              <!-- Progress Bar -->
              <div class="flex items-center gap-1.5">
                <div
                  class="flex-1 h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5"
                >
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="
                      shortQuest.claimed
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    "
                    :style="{
                      width: `${Math.min((shortQuest.progress / shortQuest.target) * 100, 100)}%`,
                    }"
                  ></div>
                </div>
                <span
                  class="text-[8px] font-bold font-display shrink-0"
                  :class="shortQuest.claimed ? 'text-emerald-400' : 'text-gray-400'"
                >
                  {{ shortQuest.progress }}/{{ shortQuest.target }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Side: Reroll Button or Arrow (when not claimed) -->
          <div v-if="!shortQuest.claimed" class="shrink-0 flex items-center gap-1">
            <UButton
              v-if="canRerollToday && !shortQuest.rerolled"
              color="warning"
              variant="ghost"
              size="xs"
              icon="i-heroicons-arrow-path"
              class="p-1 text-gray-500 hover:text-amber-400 hover:bg-white/5"
              :loading="rerollingId === shortQuest.id"
              title="Remplacer cette quête (1 par jour)"
              @click.stop.prevent="handleReroll(shortQuest.id)"
            />

            <UIcon
              name="i-heroicons-chevron-right"
              class="text-xs text-gray-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </NuxtLink>

        <!-- 2. Quête Principale (Longue) - Clickable box -->
        <NuxtLink
          v-if="longQuest"
          :to="longQuest.actionUrl"
          class="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-violet-500/40 hover:bg-slate-900/90 active:scale-[0.99] transition-all cursor-pointer select-none"
        >
          <!-- Icon & Quest Details -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-xs shrink-0 group-hover:scale-110 transition-transform">🏆</span>
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center justify-between gap-1.5">
                <span
                  class="text-[11px] font-bold text-white truncate font-display group-hover:text-violet-300 transition-colors"
                >
                  {{ longQuest.title }}
                </span>
                <span class="text-[9px] font-black font-display text-violet-400 shrink-0">
                  +{{ longQuest.totalReward }} 🪙
                </span>
              </div>
              <!-- Quest Description -->
              <p class="text-[9px] text-gray-400 font-medium truncate leading-tight">
                {{ longQuest.description }}
              </p>
              <!-- Progress Bar -->
              <div class="flex items-center gap-1.5">
                <div
                  class="flex-1 h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5"
                >
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="
                      longQuest.claimed
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-500'
                    "
                    :style="{
                      width: `${Math.min((longQuest.progress / longQuest.target) * 100, 100)}%`,
                    }"
                  ></div>
                </div>
                <span
                  class="text-[8px] font-bold font-display shrink-0"
                  :class="longQuest.claimed ? 'text-emerald-400' : 'text-gray-400'"
                >
                  {{ longQuest.progress }}/{{ longQuest.target }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Side: Reroll Button or Arrow (when not claimed) -->
          <div v-if="!longQuest.claimed" class="shrink-0 flex items-center gap-1">
            <UButton
              v-if="canRerollToday && !longQuest.rerolled"
              color="primary"
              variant="ghost"
              size="xs"
              icon="i-heroicons-arrow-path"
              class="p-1 text-gray-500 hover:text-violet-400 hover:bg-white/5"
              :loading="rerollingId === longQuest.id"
              title="Remplacer cette quête (1 par jour)"
              @click.stop.prevent="handleReroll(longQuest.id)"
            />

            <UIcon
              name="i-heroicons-chevron-right"
              class="text-xs text-gray-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { toast } from "vue3-toastify";

const props = defineProps<{
  dailyStatus: any;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const rerollingId = ref<number | null>(null);

const shortQuest = computed(() => props.dailyStatus?.shortQuest || null);
const longQuest = computed(() => props.dailyStatus?.longQuest || props.dailyStatus?.quest || null);
const canRerollToday = computed(() => props.dailyStatus?.canRerollToday ?? false);
const questStreak = computed(
  () => longQuest.value?.questStreak ?? props.dailyStatus?.quest?.questStreak ?? 0,
);

const completedCount = computed(() => {
  let count = 0;
  if (shortQuest.value?.claimed) count++;
  if (longQuest.value?.claimed) count++;
  return count;
});

async function handleReroll(questId: number) {
  if (rerollingId.value !== null) return;
  rerollingId.value = questId;
  try {
    const res = await $fetch<any>("/api/user/daily/reroll-quest", {
      method: "POST",
      body: { questId },
    });
    if (res.success) {
      toast.success(`🎲 Quête remplacée : "${res.quest?.title || "Nouveau défi"}" !`);
      emit("refresh");
    }
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Impossible de remplacer la quête.");
  } finally {
    rerollingId.value = null;
  }
}
</script>
