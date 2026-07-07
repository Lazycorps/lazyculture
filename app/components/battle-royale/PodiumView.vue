<template>
  <div class="text-center py-6 px-4 space-y-6 flex flex-col items-center select-none">
    <!-- Victory Royale / Game Over Banner -->
    <div class="relative w-full max-w-sm flex flex-col items-center">
      <!-- Glow behind -->
      <div
        class="absolute inset-0 blur-2xl rounded-full opacity-35 scale-125"
        :class="isWinner ? 'bg-amber-500' : 'bg-violet-500'"
      ></div>

      <!-- Icon display -->
      <div
        class="relative w-18 h-18 rounded-full border flex items-center justify-center text-4xl mb-4"
        :class="
          isWinner
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
        "
      >
        <span>{{ isWinner ? "👑" : "🏁" }}</span>
      </div>

      <div class="space-y-1">
        <h2
          class="text-2xl font-black font-display tracking-widest uppercase"
          :class="
            isWinner
              ? 'text-amber-400 animate-pulse font-extrabold filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'text-white'
          "
        >
          {{ isWinner ? "Victoire Royale" : "Partie Terminée" }}
        </h2>
        <p class="text-xs text-gray-400">
          {{
            isWinner
              ? "Vous êtes l'unique survivant de l'arène !"
              : `Félicitations pour votre combat.`
          }}
        </p>
      </div>
    </div>

    <!-- Personal Stats Card -->
    <div class="grid grid-cols-3 gap-2.5 w-full max-w-md">
      <!-- Rank -->
      <div
        class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center flex flex-col justify-center"
      >
        <p
          class="text-xl font-black font-display"
          :class="isWinner ? 'text-amber-400' : 'text-cyan-400'"
        >
          #{{ myRank }}
        </p>
        <p class="text-[8px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1">
          Votre Rang
        </p>
      </div>

      <!-- XP Gained -->
      <div
        class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center flex flex-col justify-center"
      >
        <p class="text-xl font-black font-display text-emerald-400">+{{ myXPEarned }} XP</p>
        <p class="text-[8px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1">
          Expérience
        </p>
      </div>

      <!-- LP Change -->
      <div
        class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center flex flex-col justify-center"
      >
        <p
          class="text-xl font-black font-display"
          :class="myLPChange >= 0 ? 'text-cyan-400' : 'text-rose-500'"
        >
          {{ myLPChange >= 0 ? "+" : "" }}{{ myLPChange }} LP
        </p>
        <p class="text-[8px] font-bold text-gray-500 uppercase tracking-wider font-display mt-1">
          Points de Ligue
        </p>
      </div>
    </div>

    <!-- LP Progress Bar / Rank Badge -->
    <div
      v-if="myRankInfo"
      class="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center space-y-3 relative overflow-hidden"
    >
      <!-- Glow background -->
      <div
        class="absolute inset-0 bg-gradient-to-r opacity-5 blur-xl pointer-events-none"
        :class="myRankInfo.color"
      ></div>

      <div class="flex items-center space-x-3 w-full">
        <!-- Badge Icon -->
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shadow-lg border border-white/10"
          :class="myRankInfo.color"
        >
          <UIcon :name="myRankInfo.icon" />
        </div>

        <div class="flex-1 text-left">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-black font-display text-white uppercase tracking-wider">
              {{ myRankInfo.label }}
            </span>
            <span class="text-xs font-bold text-gray-400 font-display">
              {{
                myRankInfo.tier === "Master"
                  ? `${myNewPoints} LP`
                  : `${myRankInfo.pointsInDivision} / 100 LP`
              }}
            </span>
          </div>

          <!-- Progress bar -->
          <div
            v-if="myRankInfo.tier !== 'Master'"
            class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden mt-1.5 relative shadow-inner"
          >
            <div
              class="h-full bg-gradient-to-r rounded-full transition-all duration-1000"
              :class="myRankInfo.color"
              :style="{ width: `${myRankInfo.pointsInDivision}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Promotion / Demotion alerts -->
      <div
        v-if="isMePromoted"
        class="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black py-2 px-3 rounded-xl flex items-center justify-center space-x-2 animate-bounce mt-2 font-display uppercase tracking-widest"
      >
        <span>🎉</span>
        <span>PROMOTION ! Vous passez en {{ myRankInfo.label }} !</span>
        <span>🎉</span>
      </div>
      <div
        v-else-if="isMeDemoted"
        class="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black py-2 px-3 rounded-xl flex items-center justify-center space-x-2 mt-2 font-display uppercase tracking-widest"
      >
        <span>⚠️</span>
        <span>RELÉGATION... Vous descendez en {{ myRankInfo.label }}</span>
        <span>⚠️</span>
      </div>
    </div>

    <!-- Leaderboard / Standings List -->
    <div
      class="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass space-y-3"
    >
      <div
        class="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest pb-2 border-b border-white/5"
      >
        <span>Classement Final</span>
        <span>Score</span>
      </div>

      <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        <NuxtLink
          v-for="(st, idx) in standings"
          :key="st.userId"
          :to="'/user/' + st.userId"
          class="flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer block"
          :class="[
            st.userId === myUserId
              ? 'bg-violet-600/10 border-violet-500/40'
              : 'bg-slate-950/20 border-white/5 hover:border-white/10',
            idx === 0 ? 'border-amber-500/20 shadow-neon-gold bg-amber-500/5' : '',
          ]"
        >
          <div class="flex items-center space-x-3">
            <!-- Rank Badge -->
            <div
              class="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center"
              :class="[
                idx === 0
                  ? 'bg-amber-500 text-slate-950'
                  : idx === 1
                    ? 'bg-slate-300 text-slate-950'
                    : idx === 2
                      ? 'bg-amber-700 text-slate-100'
                      : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ idx + 1 }}
            </div>

            <div class="text-left">
              <span
                class="font-bold text-sm text-white block max-w-[120px] truncate group-hover:text-violet-300 transition-colors"
              >
                {{ st.name }}
              </span>
              <span class="text-[9px] text-slate-400">
                {{ st.lives > 0 ? "Survécu" : `Éliminé au Round ${st.eliminatedAtRound}` }}
              </span>
            </div>
          </div>

          <div class="text-right flex flex-col justify-center">
            <span class="text-xs font-black font-display text-emerald-400 block">
              +{{ st.xpEarned }} XP
            </span>
            <span
              class="text-[10px] font-black font-display block"
              :class="st.lpChange >= 0 ? 'text-cyan-400' : 'text-rose-400'"
            >
              {{ st.lpChange >= 0 ? "+" : "" }}{{ st.lpChange }} LP
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Exit / Replay buttons -->
    <div class="w-full max-w-md pt-2 flex flex-col gap-3">
      <UButton
        size="lg"
        color="primary"
        block
        icon="i-heroicons-play"
        class="font-black font-display uppercase tracking-widest py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all duration-300"
        @click="$emit('replay')"
      >
        Rejouer (Nouveau Salon)
      </UButton>
      <UButton
        size="lg"
        color="neutral"
        variant="soft"
        block
        icon="i-heroicons-arrow-left-on-rectangle"
        class="font-black font-display uppercase tracking-widest py-2.5"
        @click="$emit('leave')"
      >
        Retour aux Salons
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Standing {
  userId: string;
  name: string;
  lives: number;
  xpEarned: number;
  eliminatedAtRound: number | null;
  lpChange: number;
  oldPoints: number;
  newPoints: number;
  isPromoted: boolean;
  isDemoted: boolean;
}

const props = defineProps<{
  winnerId: string | null;
  winnerName: string | null;
  standings: Standing[];
  myUserId: string;
}>();

const emit = defineEmits<{
  (e: "leave"): void;
  (e: "replay"): void;
}>();

const isWinner = computed(() => {
  return props.winnerId === props.myUserId;
});

const myRank = computed(() => {
  const index = props.standings.findIndex((s) => s.userId === props.myUserId);
  return index !== -1 ? index + 1 : props.standings.length;
});

const myXPEarned = computed(() => {
  const player = props.standings.find((s) => s.userId === props.myUserId);
  return player ? player.xpEarned : 0;
});

// Calculs compétitifs pour l'utilisateur courant
import { getRankFromPoints } from "~/composables/useRank";

const myStanding = computed(() => {
  return props.standings.find((s) => s.userId === props.myUserId);
});

const myLPChange = computed(() => myStanding.value?.lpChange ?? 0);
const myNewPoints = computed(() => myStanding.value?.newPoints ?? 0);
const isMePromoted = computed(() => myStanding.value?.isPromoted ?? false);
const isMeDemoted = computed(() => myStanding.value?.isDemoted ?? false);
const myRankInfo = computed(() => getRankFromPoints(myNewPoints.value));
</script>

<style scoped>
/* Glowing gold effect for podium 1st place */
.shadow-neon-gold {
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
}
</style>
