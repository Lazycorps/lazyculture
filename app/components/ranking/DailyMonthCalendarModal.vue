<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div
                class="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-400/30 flex items-center justify-center text-violet-300"
              >
                <UIcon name="i-heroicons-calendar-days" class="text-base" />
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-black font-display text-white tracking-wide">
                  Calendrier des Daily
                </h3>
                <p class="text-[10px] text-gray-400 font-medium">
                  Sélectionnez un jour pour voir son classement
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

        <!-- Sélecteur de Mois avec chevrons -->
        <div
          class="flex items-center justify-between mb-4 bg-slate-950/60 p-1.5 rounded-xl border border-white/5"
        >
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Mois précédent"
            @click="goToPreviousMonth"
          >
            <UIcon name="i-heroicons-chevron-left" class="text-sm block" />
          </button>
          <span class="text-xs font-black uppercase tracking-wider text-white font-display">
            {{ activeMonthLabel }}
          </span>
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
            :disabled="!canGoNextMonth"
            title="Mois suivant"
            @click="goToNextMonth"
          >
            <UIcon name="i-heroicons-chevron-right" class="text-sm block" />
          </button>
        </div>

        <!-- Grille Calendrier -->
        <div class="relative min-h-[220px]">
          <!-- Loader quand on change de mois -->
          <div
            v-if="loading"
            class="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center rounded-xl"
          >
            <UIcon name="i-heroicons-arrow-path" class="text-2xl text-violet-400 animate-spin" />
          </div>

          <!-- En-tête des jours de la semaine -->
          <div class="grid grid-cols-7 gap-1 text-center mb-1.5">
            <span
              v-for="weekday in weekdays"
              :key="weekday"
              class="text-[10px] font-extrabold uppercase text-gray-400 font-display py-0.5"
            >
              {{ weekday }}
            </span>
          </div>

          <!-- Jours du mois -->
          <div class="grid grid-cols-7 gap-1">
            <!-- Cases vides pour décalage au 1er jour du mois -->
            <div
              v-for="offset in firstDayOffset"
              :key="'pad-' + offset"
              class="aspect-square rounded-xl bg-transparent"
            />

            <!-- Cases des jours -->
            <button
              v-for="day in days"
              :key="day.date"
              type="button"
              :disabled="!day.hasSeries"
              class="aspect-square rounded-xl p-0.5 relative flex flex-col items-center justify-between border transition-all duration-150 group"
              :class="getDayClasses(day)"
              :title="getDayTooltip(day)"
              @click="selectDay(day)"
            >
              <!-- Numéro du jour -->
              <span
                class="text-[11px] font-extrabold font-display leading-none mt-0.5"
                :class="getDayNumberClasses(day)"
              >
                {{ day.dayNumber }}
              </span>

              <!-- Badge du rang ou pastille d'existence -->
              <div class="w-full flex justify-center items-center mb-0.5">
                <template v-if="day.userRank">
                  <span
                    class="text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none border shadow-xs"
                    :class="{
                      'bg-amber-400/25 text-amber-300 border-amber-400/50': day.userRank === 1,
                      'bg-slate-300/25 text-slate-100 border-slate-300/50': day.userRank === 2,
                      'bg-amber-700/30 text-amber-400 border-amber-600/50': day.userRank === 3,
                      'bg-violet-600/35 text-violet-200 border-violet-400/40': day.userRank > 3,
                    }"
                  >
                    #{{ day.userRank }}
                  </span>
                </template>
                <template v-else-if="day.hasSeries">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-slate-500/80 group-hover:bg-violet-400 transition-colors"
                  />
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
            <span class="ml-1">Podium</span>
          </div>
          <div class="flex items-center space-x-1">
            <span
              class="px-1.5 py-0.5 rounded bg-violet-600/35 text-violet-200 border border-violet-400/40 font-bold"
              >#X</span
            >
            <span>Votre rang</span>
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
import type { DailyCalendarDayDTO } from "#shared/DTO/dailySeriesRankingDTO";
import {
  formatMonthLabel,
  getMonthFirstDayOffset,
  getMonthKey,
  getNextMonthKey,
  getPreviousMonthKey,
} from "#shared/dailySeason";

const props = defineProps<{
  selectedDate: string; // YYYY-MM-DD
}>();

const emit = defineEmits<{
  (e: "selectDate", date: string): void;
}>();

const open = defineModel<boolean>("open", { required: true });
const { authFetch } = useAuthFetch();

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Mois actuellement affiché dans le calendrier
const activeMonth = ref<string>(
  props.selectedDate ? props.selectedDate.slice(0, 7) : getMonthKey(),
);
const activeMonthLabel = computed(() => formatMonthLabel(activeMonth.value));

// Empêcher de naviguer au-delà du mois actuel en cours
const currentMonthKey = getMonthKey();
const canGoNextMonth = computed(() => activeMonth.value < currentMonthKey);

const days = ref<DailyCalendarDayDTO[]>([]);
const loading = ref(false);

const firstDayOffset = computed(() => getMonthFirstDayOffset(activeMonth.value));

watch(open, (isOpen) => {
  if (isOpen) {
    activeMonth.value = props.selectedDate ? props.selectedDate.slice(0, 7) : getMonthKey();
    loadMonth();
  }
});

watch(activeMonth, () => {
  if (open.value) {
    loadMonth();
  }
});

async function loadMonth() {
  loading.value = true;
  try {
    const data = await authFetch<DailyCalendarDayDTO[]>(
      `/api/ranking/daily-calendar-month?month=${activeMonth.value}`,
    );
    days.value = data || [];
  } catch (e) {
    console.error("Failed to load daily calendar month:", e);
    days.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPreviousMonth() {
  activeMonth.value = getPreviousMonthKey(activeMonth.value);
}

function goToNextMonth() {
  if (canGoNextMonth.value) {
    activeMonth.value = getNextMonthKey(activeMonth.value);
  }
}

function selectDay(day: DailyCalendarDayDTO) {
  if (!day.hasSeries) return;
  emit("selectDate", day.date);
  open.value = false;
}

function isSelected(date: string) {
  return props.selectedDate === date;
}

function getDayClasses(day: DailyCalendarDayDTO) {
  if (!day.hasSeries) {
    return "bg-slate-900/20 border-white/5 opacity-20 cursor-not-allowed";
  }

  const selected = isSelected(day.date);
  if (selected) {
    return "bg-gradient-to-b from-violet-600/40 to-indigo-600/30 border-violet-400 ring-2 ring-violet-400/50 shadow-md shadow-violet-900/30 cursor-pointer";
  }

  if (day.userRank === 1) {
    return "bg-amber-500/10 border-amber-400/40 hover:border-amber-400 hover:bg-amber-500/20 cursor-pointer";
  }
  if (day.userRank === 2) {
    return "bg-slate-400/10 border-slate-300/40 hover:border-slate-300 hover:bg-slate-400/20 cursor-pointer";
  }
  if (day.userRank === 3) {
    return "bg-amber-700/10 border-amber-600/40 hover:border-amber-600 hover:bg-amber-700/20 cursor-pointer";
  }
  if (day.userRank) {
    return "bg-violet-600/10 border-violet-500/20 hover:border-violet-400 hover:bg-violet-600/20 cursor-pointer";
  }

  return "bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-white/5 cursor-pointer";
}

function getDayNumberClasses(day: DailyCalendarDayDTO) {
  if (!day.hasSeries) return "text-gray-600";
  if (isSelected(day.date)) return "text-white font-black";
  if (day.userRank === 1) return "text-amber-300";
  if (day.userRank === 2) return "text-slate-200";
  if (day.userRank === 3) return "text-amber-500";
  return "text-gray-300";
}

function getDayTooltip(day: DailyCalendarDayDTO) {
  if (!day.hasSeries) return "Aucune série ce jour-ci";
  let text = day.seriesTitle || "Série Daily";
  if (day.userRank) {
    text += ` • Votre rang : #${day.userRank} (${day.userScore}/10)`;
  }
  text += ` • ${day.totalParticipants} participants`;
  return text;
}
</script>
