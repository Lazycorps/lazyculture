<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-lg' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div
                class="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-400/30 flex items-center justify-center text-violet-300"
              >
                <UIcon name="i-heroicons-calendar" class="text-base" />
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-black font-display text-white tracking-wide">
                  Saisons Mensuelles
                </h3>
                <p class="text-[10px] text-gray-400 font-medium">
                  Sélectionnez un mois pour consulter son classement
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <!-- Sélecteur d'Année avec chevrons -->
        <div
          class="flex items-center justify-between mb-4 bg-slate-950/60 p-1.5 rounded-xl border border-white/5"
        >
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Année précédente"
            @click="goToPreviousYear"
          >
            <UIcon name="i-heroicons-chevron-left" class="text-sm block" />
          </button>
          <span class="text-xs font-black uppercase tracking-wider text-white font-display">
            {{ activeYear }}
          </span>
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
            :disabled="!canGoNextYear"
            title="Année suivante"
            @click="goToNextYear"
          >
            <UIcon name="i-heroicons-chevron-right" class="text-sm block" />
          </button>
        </div>

        <!-- Grille des 12 Mois -->
        <div class="relative min-h-[260px]">
          <!-- Loader quand on change d'année -->
          <div
            v-if="loading"
            class="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center rounded-xl"
          >
            <UIcon name="i-heroicons-arrow-path" class="text-2xl text-violet-400 animate-spin" />
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <button
              v-for="item in months"
              :key="item.monthKey"
              type="button"
              :disabled="isFutureMonth(item.monthKey)"
              class="p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 relative min-h-[84px] group"
              :class="getMonthCardClasses(item)"
              @click="selectMonth(item)"
            >
              <!-- Libellé du mois -->
              <div class="flex items-center justify-between w-full">
                <span
                  class="text-xs font-black font-display uppercase tracking-wider"
                  :class="getMonthLabelClasses(item)"
                >
                  {{ getMonthShortName(item.monthKey) }}
                </span>
              </div>

              <!-- Rang du joueur ou statut de la saison -->
              <div class="mt-2">
                <template v-if="isFutureMonth(item.monthKey)">
                  <span class="text-[9px] text-gray-600 font-medium font-display">À venir</span>
                </template>
                <template v-else-if="item.userRank">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none border shadow-xs"
                      :class="{
                        'bg-amber-400/25 text-amber-300 border-amber-400/50': item.userRank === 1,
                        'bg-slate-300/25 text-slate-100 border-slate-300/50': item.userRank === 2,
                        'bg-amber-700/30 text-amber-400 border-amber-600/50': item.userRank === 3,
                        'bg-violet-600/35 text-violet-200 border-violet-400/40': item.userRank > 3,
                      }"
                    >
                      #{{ item.userRank }}
                    </span>
                    <span class="text-[10px] text-violet-300/90 font-extrabold font-display">
                      {{ item.userPoints }} pts
                    </span>
                  </div>
                </template>
                <template v-else-if="item.totalParticipants > 0">
                  <span class="text-[9px] text-gray-400 font-medium font-display block">
                    {{ item.totalParticipants }}
                    {{ item.totalParticipants > 1 ? "joueurs" : "joueur" }}
                  </span>
                  <span class="text-[8px] text-gray-500 font-semibold font-display block">
                    Non classé
                  </span>
                </template>
                <template v-else>
                  <span class="text-[9px] text-gray-600 font-medium font-display"
                    >Aucune partie</span
                  >
                </template>
              </div>
            </button>
          </div>
        </div>

        <!-- Légende -->
        <div
          class="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[9px] text-gray-400 font-display"
        >
          <div class="flex items-center space-x-1.5">
            <span
              class="px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-300 border border-amber-400/50 font-black"
              >#1</span
            >
            <span
              class="px-1.5 py-0.5 rounded bg-slate-300/25 text-slate-100 border border-slate-300/50 font-black"
              >#2</span
            >
            <span
              class="px-1.5 py-0.5 rounded bg-amber-700/30 text-amber-400 border border-amber-600/50 font-black"
              >#3</span
            >
            <span class="ml-1">Podiums mensuels</span>
          </div>
          <div class="flex items-center space-x-1">
            <span
              class="px-1.5 py-0.5 rounded bg-violet-600/35 text-violet-200 border border-violet-400/40 font-bold"
              >#X</span
            >
            <span>Votre rang du mois</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-2.5 h-2.5 rounded-full border-2 border-violet-400 bg-violet-600/50" />
            <span>Sélectionné</span>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { MonthlyTimelineItemDTO } from "#shared/DTO/dailySeriesRankingDTO";
import { getMonthKey } from "#shared/dailySeason";

const props = defineProps<{
  selectedMonth: string; // YYYY-MM
}>();

const emit = defineEmits<{
  (e: "selectMonth", monthKey: string): void;
}>();

const open = defineModel<boolean>("open", { required: true });
const { authFetch } = useAuthFetch();

const currentYear = new Date().getUTCFullYear();
const currentMonthKey = getMonthKey();

// Année consultée
const activeYear = ref<number>(
  props.selectedMonth ? Number(props.selectedMonth.slice(0, 4)) : currentYear,
);

const canGoNextYear = computed(() => activeYear.value < currentYear);

const months = ref<MonthlyTimelineItemDTO[]>([]);
const loading = ref(false);

const monthNamesFr = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function getMonthShortName(monthKey: string): string {
  const m = Number(monthKey.slice(5, 7));
  return monthNamesFr[m - 1] || monthKey;
}

watch(open, (isOpen) => {
  if (isOpen) {
    activeYear.value = props.selectedMonth ? Number(props.selectedMonth.slice(0, 4)) : currentYear;
    loadYear();
  }
});

watch(activeYear, () => {
  if (open.value) {
    loadYear();
  }
});

async function loadYear() {
  loading.value = true;
  try {
    const data = await authFetch<MonthlyTimelineItemDTO[]>(
      `/api/ranking/monthly-calendar-year?year=${activeYear.value}`,
    );
    months.value = data || [];
  } catch (e) {
    console.error("Failed to load monthly calendar year:", e);
    months.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPreviousYear() {
  activeYear.value--;
}

function goToNextYear() {
  if (canGoNextYear.value) {
    activeYear.value++;
  }
}

function isFutureMonth(monthKey: string): boolean {
  return monthKey > currentMonthKey;
}

function selectMonth(item: MonthlyTimelineItemDTO) {
  if (isFutureMonth(item.monthKey)) return;
  emit("selectMonth", item.monthKey);
  open.value = false;
}

function isSelected(monthKey: string): boolean {
  return props.selectedMonth === monthKey;
}

function getMonthCardClasses(item: MonthlyTimelineItemDTO) {
  if (isFutureMonth(item.monthKey)) {
    return "bg-slate-900/20 border-white/5 opacity-30 cursor-not-allowed";
  }

  const selected = isSelected(item.monthKey);
  if (selected) {
    return "bg-gradient-to-b from-violet-600/30 to-indigo-600/20 border-violet-400 ring-2 ring-violet-400/50 shadow-md shadow-violet-900/30 cursor-pointer";
  }

  if (item.userRank === 1) {
    return "bg-amber-500/10 border-amber-400/40 hover:border-amber-400 hover:bg-amber-500/20 cursor-pointer";
  }
  if (item.userRank === 2) {
    return "bg-slate-400/10 border-slate-300/40 hover:border-slate-300 hover:bg-slate-400/20 cursor-pointer";
  }
  if (item.userRank === 3) {
    return "bg-amber-700/10 border-amber-600/40 hover:border-amber-600 hover:bg-amber-700/20 cursor-pointer";
  }
  if (item.userRank) {
    return "bg-violet-600/10 border-violet-500/20 hover:border-violet-400 hover:bg-violet-600/20 cursor-pointer";
  }

  return "bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-white/5 cursor-pointer";
}

function getMonthLabelClasses(item: MonthlyTimelineItemDTO) {
  if (isFutureMonth(item.monthKey)) return "text-gray-600";
  if (isSelected(item.monthKey)) return "text-white font-black";
  if (item.userRank === 1) return "text-amber-300";
  if (item.userRank === 2) return "text-slate-200";
  if (item.userRank === 3) return "text-amber-500";
  return "text-gray-300";
}

function getRankColor(rank: number): string {
  if (rank === 1) return "text-amber-300";
  if (rank === 2) return "text-slate-200";
  if (rank === 3) return "text-amber-500";
  return "text-violet-300";
}
</script>
