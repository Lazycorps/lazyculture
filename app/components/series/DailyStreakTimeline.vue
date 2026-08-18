<template>
  <div
    class="flex flex-col justify-between gap-2.5 bg-slate-950/40 border border-white/5 rounded-2xl p-3.5 hover:border-violet-500/20 transition-all duration-300 relative overflow-hidden"
  >
    <!-- Top Row: Title, Streak Pill, Bonus & Contextual Action Button -->
    <div class="flex items-center justify-between gap-2">
      <!-- Left: Title & Flame Streak -->
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-base shrink-0">🔥</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h4
              class="text-xs font-black text-white font-display uppercase tracking-wider truncate"
            >
              Série : {{ currentStreak }} {{ currentStreak > 1 ? "jours" : "jour" }}
            </h4>
            <UBadge
              v-if="bonusPercent > 0"
              color="warning"
              variant="subtle"
              size="xs"
              class="text-[9px] font-black font-display uppercase px-1.5 py-0 shrink-0"
            >
              +{{ bonusPercent }}% XP
            </UBadge>
          </div>
          <p class="text-[10px] text-gray-400 font-medium truncate">
            Jour {{ dayCycleIndex }}/7 • Prochain : {{ streak.todayRewardCoins || 15 }} 🪙
          </p>
        </div>
      </div>

      <!-- Right: Compact Action Button -->
      <div class="shrink-0">
        <!-- Repair up to 3 missed days -->
        <UButton
          v-if="repair?.canRepairYesterday"
          color="warning"
          size="xs"
          icon="i-heroicons-shield-check-solid"
          class="font-black font-display uppercase tracking-widest text-[9px] shadow-md shadow-amber-500/10"
          :loading="repairing"
          :disabled="repair.userCoins < repair.cost"
          :title="`Racheter ${repair.missedDaysCount || 1} jour(s) pour restaurer votre série de ${repair.previousStreakToRestore} jours`"
          @click="handleRepair"
        >
          {{
            repair.userCoins >= repair.cost
              ? `Racheter ${repair.missedDaysCount > 1 ? repair.missedDaysCount + "j " : ""}(${repair.cost} 🪙)`
              : `${repair.cost} 🪙 requis`
          }}
        </UButton>

        <!-- Ready to claim -->
        <UButton
          v-else-if="streak.hasAnsweredToday && !streak.claimedToday"
          color="primary"
          size="xs"
          icon="i-heroicons-gift-solid"
          class="font-black font-display uppercase tracking-widest text-[9px] bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-600/25 animate-pulse"
          :loading="claiming"
          @click="handleClaim"
        >
          Réclamer {{ streak.todayRewardCoins }} 🪙
        </UButton>

        <!-- Need 1 quiz -->
        <UButton
          v-else-if="!streak.hasAnsweredToday"
          to="/series/daily"
          color="primary"
          variant="soft"
          size="xs"
          icon="i-heroicons-play"
          class="font-black font-display uppercase tracking-widest text-[9px]"
        >
          1 quiz requis
        </UButton>

        <!-- Already claimed -->
        <span
          v-else
          class="text-[10px] text-emerald-400 font-bold font-display flex items-center gap-1"
        >
          <UIcon name="i-heroicons-check-circle-solid" class="text-sm" /> Validé
        </span>
      </div>
    </div>

    <!-- Bottom Row: Compact 7-day Mini Timeline Nodes -->
    <div class="pt-1.5 border-t border-white/5">
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
        <div
          v-for="(day, index) in timeline"
          :key="day.dateStr"
          class="flex flex-col items-center gap-0.5"
        >
          <!-- Day Name (Lun, Mar...) -->
          <span
            class="text-[8px] sm:text-[9px] font-bold uppercase font-display"
            :class="day.isToday ? 'text-violet-300 font-black' : 'text-gray-500'"
          >
            {{ day.isToday ? "Auj." : day.dayShort }}
          </span>

          <!-- Node Pill / Circle -->
          <div
            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] relative transition-all duration-300"
            :class="getCompactNodeClass(day)"
            :title="`${day.dayLabel} : ${getNodeTooltip(day)}`"
          >
            <!-- Played -->
            <template v-if="day.status === 'COMPLETED' || day.status === 'TODAY_COMPLETED'">
              <span class="text-[10px]">🔥</span>
            </template>

            <!-- Repaired -->
            <template v-else-if="day.status === 'REPAIRED'">
              <UIcon name="i-heroicons-shield-check-solid" class="text-xs text-violet-300" />
            </template>

            <!-- Today Pending -->
            <template v-else-if="day.status === 'TODAY_PENDING'">
              <UIcon name="i-heroicons-clock" class="text-[11px] text-amber-400 animate-pulse" />
            </template>

            <!-- Missed -->
            <template v-else>
              <span class="text-gray-600 text-[9px]">•</span>
            </template>

            <!-- Gift marker on day 7 -->
            <span v-if="index === 6" class="absolute -top-1 -right-1 text-[7px]"> 🎁 </span>
          </div>

          <!-- Reward indicator -->
          <span
            class="text-[7px] sm:text-[8px] font-bold font-display"
            :class="
              day.status === 'COMPLETED' ||
              day.status === 'TODAY_COMPLETED' ||
              day.status === 'REPAIRED'
                ? 'text-amber-400'
                : 'text-gray-600'
            "
          >
            {{ day.rewardCoins }}🪙
          </span>
        </div>
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

const claiming = ref(false);
const repairing = ref(false);

const streak = computed(() => props.dailyStatus?.streak || {});
const repair = computed(() => props.dailyStatus?.repair || {});
const timeline = computed(() => props.dailyStatus?.timeline || []);

const currentStreak = computed(() => streak.value?.current || 0);
const bonusPercent = computed(() => streak.value?.bonusPercent || 0);
const dayCycleIndex = computed(() => streak.value?.dayCycleIndex || 1);

function getCompactNodeClass(day: any) {
  if (day.status === "COMPLETED" || day.status === "TODAY_COMPLETED") {
    return "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30 border border-emerald-400/40";
  }
  if (day.status === "REPAIRED") {
    return "bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-sm shadow-violet-600/30 border border-violet-400/40";
  }
  if (day.status === "TODAY_PENDING") {
    return "bg-slate-900 border border-amber-400/80 shadow-sm shadow-amber-500/20";
  }
  return "bg-slate-900/60 border border-white/5 text-gray-600";
}

function getNodeTooltip(day: any) {
  if (day.status === "COMPLETED" || day.status === "TODAY_COMPLETED") return "Jour validé";
  if (day.status === "REPAIRED") return "Jour racheté (20 🪙)";
  if (day.status === "TODAY_PENDING") return "En attente de quiz";
  return "Jour manqué";
}

async function handleClaim() {
  if (claiming.value) return;
  claiming.value = true;
  try {
    const res = await $fetch<any>("/api/user/daily/claim-login", {
      method: "POST",
    });
    if (res.success) {
      toast.success(`🎉 +${res.coinsEarned} pièces obtenues ! Série : ${res.newStreak} jours.`);
      emit("refresh");
    }
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de la réclamation.");
  } finally {
    claiming.value = false;
  }
}

async function handleRepair() {
  if (repairing.value) return;
  repairing.value = true;
  try {
    const res = await $fetch<any>("/api/user/daily/repair", {
      method: "POST",
    });
    if (res.success) {
      toast.success(
        `🛡️ Série sauvée ! Votre série de ${res.restoredStreak} jours est restaurée (${res.repairedDaysCount || 1} jour(s) racheté(s)).`,
      );
      emit("refresh");
    }
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors du rachat de série.");
  } finally {
    repairing.value = false;
  }
}
</script>
