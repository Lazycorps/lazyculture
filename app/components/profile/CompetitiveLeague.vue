<template>
  <UCard
    v-if="rank"
    class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden animate-fade-in"
  >
    <div class="space-y-4">
      <h3
        class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
      >
        <UIcon
          :name="isBattleRoyale ? 'i-heroicons-shield-check' : 'i-heroicons-bolt'"
          class="mr-2 text-base animate-pulse"
          :class="isBattleRoyale ? 'text-violet-500' : 'text-pink-500'"
        />
        Ligue Compétitive {{ isBattleRoyale ? "Battle Royale" : "Showdown" }}
      </h3>

      <div
        class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 relative overflow-hidden"
      >
        <!-- Glow background -->
        <div
          class="absolute inset-0 bg-gradient-to-r opacity-5 blur-xl pointer-events-none"
          :class="rank.rankInfo.color"
        ></div>

        <!-- Badge Display -->
        <div
          class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg border border-white/10 shrink-0 relative"
          :class="rank.rankInfo.color"
        >
          <UIcon :name="rank.rankInfo.icon" />
        </div>

        <!-- Stats Info -->
        <div class="flex-1 w-full text-center sm:text-left space-y-3">
          <div>
            <h4 class="text-xl font-black font-display text-white uppercase tracking-wider">
              {{ rank.rankInfo.label }}
            </h4>
            <p class="text-xs text-gray-400 font-medium">{{ rank.points }} LP cumulés</p>
          </div>

          <!-- LP Division Progress Bar -->
          <div v-if="rank.rankInfo.tier !== 'Master'" class="space-y-1">
            <div
              class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
            >
              <div
                class="h-full bg-gradient-to-r rounded-full transition-all duration-300"
                :class="rank.rankInfo.color"
                :style="{ width: `${rank.rankInfo.pointsInDivision}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] font-bold text-gray-500 font-display">
              <span>{{ rank.rankInfo.pointsInDivision }} / 100 LP</span>
              <span>Palier suivant</span>
            </div>
          </div>

          <!-- Competitive Stats Grid -->
          <div class="grid grid-cols-3 gap-2 pt-1">
            <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
              <span
                class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                >Parties</span
              >
              <span class="text-sm font-black text-white font-display">{{ rank.gamesPlayed }}</span>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
              <span
                class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                >Victoires</span
              >
              <span class="text-sm font-black text-amber-400 font-display">🏆 {{ rank.wins }}</span>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
              <span
                class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                >{{ isBattleRoyale ? "Ratio Top 1" : "Ratio Victoires" }}</span
              >
              <span class="text-sm font-black text-cyan-400 font-display">
                {{ rank.gamesPlayed > 0 ? Math.round((rank.wins / rank.gamesPlayed) * 100) : 0 }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <hr class="border-white/5 my-4" />

      <!-- History Subsection -->
      <div class="space-y-4">
        <h4
          class="text-xs font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
        >
          <UIcon
            :name="isBattleRoyale ? 'i-heroicons-fire' : 'i-heroicons-bolt'"
            class="mr-2 text-base"
            :class="isBattleRoyale ? 'text-orange-500' : 'text-pink-500'"
          />
          {{
            isBattleRoyale
              ? "Historique des parties (20 dernières)"
              : "Historique des duels (20 derniers)"
          }}
        </h4>

        <div v-if="loading" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-16 w-full bg-slate-800 rounded-xl" />
        </div>

        <div
          v-else-if="history.length === 0"
          class="text-center py-6 bg-slate-950/20 border border-white/5 rounded-2xl"
        >
          <p class="text-xs text-gray-500">
            {{
              isBattleRoyale
                ? "Aucune partie Battle Royale enregistrée."
                : "Aucun duel Showdown enregistré."
            }}
          </p>
        </div>

        <div v-else class="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          <!-- Battle Royale history items -->
          <template v-if="isBattleRoyale">
            <div
              v-for="match in history"
              :key="match.matchId"
              class="flex items-center justify-between p-3 border transition-all duration-300 bg-slate-950/20 border-white/5 hover:border-white/10 rounded-2xl"
              :class="{
                'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]':
                  match.rank === 1,
              }"
            >
              <div class="flex items-center space-x-3">
                <!-- Rank Badge -->
                <div
                  class="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-md font-display"
                  :class="[
                    match.rank === 1
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'
                      : match.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : match.rank === 3
                          ? 'bg-amber-700 text-slate-100'
                          : 'bg-slate-800/80 text-slate-400 border border-white/5',
                  ]"
                >
                  #{{ match.rank }}
                </div>

                <div class="text-left space-y-0.5">
                  <div class="flex items-center space-x-2">
                    <span class="font-extrabold text-xs text-white font-display">
                      {{ match.rank === 1 ? "Victoire Royale 👑" : `Top ${match.rank}` }}
                    </span>
                    <span
                      v-if="match.status !== 'FINISHED'"
                      class="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                    >
                      En Cours
                    </span>
                  </div>
                  <span class="text-[9px] text-gray-500 block font-medium">
                    {{ formatDate(match.createdAt) }} • {{ match.totalPlayers }} joueurs
                  </span>
                </div>
              </div>

              <div class="text-right space-y-0.5">
                <span class="text-xs font-black font-display text-emerald-400 block">
                  +{{ match.xpEarned }} XP
                </span>
                <span class="text-[9px] text-gray-500 block font-medium">
                  {{
                    match.eliminatedAtRound
                      ? `Éliminé au Rd ${match.eliminatedAtRound}`
                      : `Survivant (${match.currentRound || 0} Rd)`
                  }}
                </span>
              </div>
            </div>
          </template>

          <!-- Showdown history items -->
          <template v-else>
            <div
              v-for="match in history"
              :key="match.matchId"
              class="flex items-center justify-between p-3 border transition-all duration-300 bg-slate-950/20 border-white/5 hover:border-white/10 rounded-2xl"
              :class="{
                'bg-indigo-500/5 border-indigo-500/30 hover:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.05)]':
                  match.won,
                'bg-slate-500/5 border-slate-500/30 hover:border-slate-500/50': match.draw,
              }"
            >
              <div class="flex items-center space-x-3">
                <!-- Result Badge -->
                <div
                  class="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-md font-display"
                  :class="[
                    match.won
                      ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white'
                      : match.draw
                        ? 'bg-slate-600 text-slate-200'
                        : 'bg-slate-800 text-slate-400 border border-white/5',
                  ]"
                >
                  <UIcon
                    :name="
                      match.won
                        ? 'i-heroicons-trophy'
                        : match.draw
                          ? 'i-heroicons-hand-raised'
                          : 'i-heroicons-x-mark'
                    "
                    class="text-xs"
                  />
                </div>

                <div class="text-left space-y-0.5">
                  <div class="flex items-center space-x-2">
                    <span class="font-extrabold text-xs text-white font-display">
                      {{ match.won ? "Victoire ⚔️" : match.draw ? "Match Nul 🤝" : "Défaite 💀" }}
                    </span>
                    <span
                      v-if="match.status !== 'FINISHED'"
                      class="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                    >
                      En Cours
                    </span>
                  </div>
                  <span class="text-[9px] text-gray-500 block font-medium">
                    {{ formatDate(match.createdAt) }} • vs {{ match.opponentName }}
                  </span>
                </div>
              </div>

              <div class="text-right space-y-0.5">
                <span class="text-xs font-black font-display text-emerald-400 block">
                  +{{ match.xpEarned }} XP
                </span>
                <span class="text-[9px] text-gray-500 block font-medium">
                  {{ match.hpLeft }} vs {{ match.opponentHpLeft }} HP
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    mode: "battle-royale" | "showdown";
    rank: any | null;
    history: any[];
    loading?: boolean;
  }>(),
  { loading: false },
);

const isBattleRoyale = computed(() => props.mode === "battle-royale");
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
