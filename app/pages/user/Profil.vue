<template>
  <div class="w-full max-w-6xl mx-auto py-4 select-none animate-fade-in">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Column Left -->
      <div class="space-y-6">
        <!-- Main Info & Settings Card -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <!-- Profile Header (Avatar, Level & Username) -->
          <div
            class="flex flex-col items-center sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6"
          >
            <UAvatar
              icon="i-heroicons-user"
              size="xl"
              class="bg-violet-600/20 text-violet-300 border-2 border-violet-500/30 w-20 h-20 shadow-neon"
            />
            <div class="flex-1 text-center sm:text-left space-y-1.5 w-full">
              <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1">
                <h2 class="text-2xl font-black font-display text-white tracking-wide truncate">
                  {{ username || "Joueur" }}
                </h2>
                <span
                  class="inline-flex items-center justify-center self-center bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-extrabold px-3 py-1 rounded-full font-display"
                >
                  Niveau {{ level }}
                </span>
              </div>

              <!-- Experience Progression Jauge -->
              <div class="space-y-1 pt-1.5">
                <!-- Custom Premium Glass Progress Bar -->
                <div
                  class="w-full h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
                >
                  <div
                    class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                    :style="{ width: `${xpProgress}%` }"
                  ></div>
                </div>
                <div class="flex justify-between text-xs font-bold text-gray-500 font-display">
                  <span>{{ xp - xpThreshold }} / {{ xpMax - xpThreshold }} XP</span>
                  <span>Progression Niveau</span>
                </div>
              </div>
            </div>
          </div>

          <hr class="border-white/5 my-6" />

          <!-- Form Inputs Section -->
          <div class="space-y-5">
            <!-- Email Input -->
            <UFormField
              label="Adresse Email"
              name="email"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="email"
                disabled
                icon="i-heroicons-envelope"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-gray-400 cursor-not-allowed' }"
              />
            </UFormField>

            <!-- Username Input -->
            <UFormField
              label="Nom d'utilisateur"
              name="username"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <div class="flex flex-col sm:flex-row gap-3">
                <UInput
                  v-model="username"
                  placeholder="Entrez votre pseudonyme..."
                  icon="i-heroicons-user"
                  class="flex-grow w-full"
                  :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
                />
                <UButton
                  color="primary"
                  :disabled="!isUsernameSaveable"
                  :loading="loadingUpdateUser"
                  icon="i-heroicons-check-circle"
                  class="font-black font-display uppercase tracking-widest px-6 shrink-0 h-10 flex items-center justify-center"
                  @click="updateUsername"
                >
                  Enregistrer
                </UButton>
              </div>
            </UFormField>

            <!-- Notifications Push Section -->
            <div class="pt-5 border-t border-white/5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4
                    class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display flex items-center"
                  >
                    <UIcon name="i-heroicons-bell" class="mr-1.5 text-violet-400 text-sm" />
                    Notifications Push
                  </h4>
                  <p class="text-[11px] text-gray-500 mt-1 max-w-md leading-relaxed">
                    Recevez des rappels pour ne pas rater votre défi quotidien ou perdre votre série
                    de connexion.
                  </p>
                </div>
                <div class="flex items-center shrink-0">
                  <UButton
                    v-if="isSubscribed"
                    color="error"
                    variant="soft"
                    size="sm"
                    icon="i-heroicons-bell-slash"
                    :loading="loadingPush"
                    class="font-bold font-display uppercase tracking-wide text-xs"
                    @click="unsubscribeFromPush"
                  >
                    Désactiver
                  </UButton>
                  <UButton
                    v-else
                    color="primary"
                    size="sm"
                    icon="i-heroicons-bell"
                    :loading="loadingPush"
                    :disabled="!isPushSupported"
                    class="font-bold font-display uppercase tracking-wide text-xs"
                    @click="subscribeToPush"
                  >
                    {{ pushButtonText }}
                  </UButton>
                </div>
              </div>

              <!-- Message d'état ou d'erreur -->
              <div
                v-if="pushStatusMessage"
                class="flex items-start bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 text-xs text-violet-300"
              >
                <UIcon
                  name="i-heroicons-information-circle"
                  class="mr-2 text-base text-violet-400 shrink-0"
                />
                <span class="font-medium leading-relaxed">{{ pushStatusMessage }}</span>
              </div>

              <!-- Option de test rapide -->
              <div
                v-if="isSubscribed"
                class="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3"
              >
                <span class="text-xs text-gray-400 font-semibold font-display"
                  >Tester la configuration</span
                >
                <UButton
                  color="violet"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-paper-airplane"
                  :loading="loadingPushTest"
                  class="font-black font-display uppercase tracking-wider text-[10px]"
                  @click="sendTestNotification"
                >
                  Envoyer un test
                </UButton>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="error"
                variant="soft"
                icon="i-heroicons-arrow-left-on-rectangle"
                :loading="loading"
                class="font-bold uppercase tracking-wider font-display px-5 py-2.5"
                @click="signOut"
              >
                Déconnexion
              </UButton>
            </div>
          </template>
        </UCard>

        <!-- Statistiques Globales Section -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
            >
              <UIcon
                name="i-heroicons-chart-bar"
                class="mr-2 text-violet-500 text-base animate-pulse"
              />
              Statistiques Globales
            </h3>

            <div v-if="loadingHistory" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                v-for="i in 4"
                :key="i"
                class="bg-slate-950/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 h-24"
              >
                <USkeleton class="h-6 w-6 rounded-full bg-slate-800 shrink-0" />
                <USkeleton class="h-3 w-16 bg-slate-800 shrink-0" />
                <USkeleton class="h-5 w-10 bg-slate-800 shrink-0" />
              </div>
            </div>

            <div
              v-else-if="globalStats"
              class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in"
            >
              <!-- Carte 1: Précision -->
              <div
                class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
              >
                <UIcon name="i-heroicons-check-badge" class="text-emerald-400 text-2xl mb-1.5" />
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                  >Précision</span
                >
                <span class="text-xl font-black text-white font-display mt-0.5"
                  >{{ globalStats.accuracy }}%</span
                >
              </div>

              <!-- Carte 2: Questions Répondues -->
              <div
                class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
              >
                <UIcon
                  name="i-heroicons-chat-bubble-left-right"
                  class="text-violet-400 text-2xl mb-1.5"
                />
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                  >Questions</span
                >
                <span class="text-xl font-black text-white font-display mt-0.5">{{
                  globalStats.totalQuestions
                }}</span>
              </div>

              <!-- Carte 3: Parties PvP -->
              <div
                class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
              >
                <UIcon name="i-heroicons-bolt" class="text-pink-400 text-2xl mb-1.5" />
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                  >Parties PvP</span
                >
                <span class="text-xl font-black text-white font-display mt-0.5">{{
                  globalStats.totalPvPMatches
                }}</span>
                <span class="text-[9px] text-cyan-400 font-extrabold font-display mt-0.5"
                  >{{ globalStats.pvpWinRate }}% Victoires</span
                >
              </div>

              <!-- Carte 4: Série Active (Streak) -->
              <div
                class="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-glass"
              >
                <UIcon name="i-heroicons-fire" class="text-orange-500 text-2xl mb-1.5" />
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                  >Série Active</span
                >
                <span class="text-xl font-black text-white font-display mt-0.5"
                  >{{ globalStats.currentStreak }}
                  {{ globalStats.currentStreak > 1 ? "jours" : "jour" }}</span
                >
              </div>
            </div>
          </div>
        </UCard>

        <!-- Progression par Thème Section -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
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

            <div v-if="loadingHistory" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              v-else-if="themeProgress.length === 0"
              class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
            >
              <p class="text-xs text-gray-500">Aucune progression enregistrée.</p>
            </div>

            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar"
            >
              <div
                v-for="item in themeProgress"
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
                    <div
                      class="flex justify-between text-[9px] font-bold text-gray-500 font-display"
                    >
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

        <!-- Achievements Section -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
            >
              <UIcon
                name="i-heroicons-trophy"
                class="mr-2 text-amber-500 text-base animate-pulse"
              />
              Trophées & Exploits
            </h3>

            <div class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl">
              <AchievementComponent
                :achievements="achievements"
                :userAchievements="userAchievements"
              />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Column Right -->
      <div class="space-y-6">
        <!-- Competitive Battle Royale Section -->
        <UCard
          v-if="brRank"
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden animate-fade-in"
        >
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
            >
              <UIcon
                name="i-heroicons-shield-check"
                class="mr-2 text-violet-500 text-base animate-pulse"
              />
              Ligue Compétitive Battle Royale
            </h3>

            <div
              class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 relative overflow-hidden"
            >
              <!-- Glow background -->
              <div
                class="absolute inset-0 bg-gradient-to-r opacity-5 blur-xl pointer-events-none"
                :class="brRank.rankInfo.color"
              ></div>

              <!-- Badge Display -->
              <div
                class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg border border-white/10 shrink-0 relative"
                :class="brRank.rankInfo.color"
              >
                <UIcon :name="brRank.rankInfo.icon" />
              </div>

              <!-- Stats Info -->
              <div class="flex-1 w-full text-center sm:text-left space-y-3">
                <div>
                  <h4 class="text-xl font-black font-display text-white uppercase tracking-wider">
                    {{ brRank.rankInfo.label }}
                  </h4>
                  <p class="text-xs text-gray-400 font-medium">{{ brRank.points }} LP cumulés</p>
                </div>

                <!-- LP Division Progress Bar -->
                <div v-if="brRank.rankInfo.tier !== 'Master'" class="space-y-1">
                  <div
                    class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
                  >
                    <div
                      class="h-full bg-gradient-to-r rounded-full transition-all duration-300"
                      :class="brRank.rankInfo.color"
                      :style="{ width: `${brRank.rankInfo.pointsInDivision}%` }"
                    ></div>
                  </div>
                  <div
                    class="flex justify-between text-[10px] font-bold text-gray-500 font-display"
                  >
                    <span>{{ brRank.rankInfo.pointsInDivision }} / 100 LP</span>
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
                    <span class="text-sm font-black text-white font-display">{{
                      brRank.gamesPlayed
                    }}</span>
                  </div>
                  <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                    <span
                      class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                      >Victoires</span
                    >
                    <span class="text-sm font-black text-amber-400 font-display"
                      >🏆 {{ brRank.wins }}</span
                    >
                  </div>
                  <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                    <span
                      class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                      >Ratio Top 1</span
                    >
                    <span class="text-sm font-black text-cyan-400 font-display">
                      {{
                        brRank.gamesPlayed > 0
                          ? Math.round((brRank.wins / brRank.gamesPlayed) * 100)
                          : 0
                      }}%
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
                <UIcon name="i-heroicons-fire" class="mr-2 text-orange-500 text-base" />
                Historique des parties (20 dernières)
              </h4>

              <div v-if="loadingHistory" class="space-y-2">
                <USkeleton v-for="i in 3" :key="i" class="h-16 w-full bg-slate-800 rounded-xl" />
              </div>

              <div
                v-else-if="battleRoyaleHistory.length === 0"
                class="text-center py-6 bg-slate-950/20 border border-white/5 rounded-2xl"
              >
                <p class="text-xs text-gray-500">
                  Vous n'avez pas encore joué en mode Battle Royale.
                </p>
              </div>

              <div v-else class="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                <div
                  v-for="match in battleRoyaleHistory"
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
              </div>
            </div>
          </div>
        </UCard>

        <!-- Competitive Showdown Section -->
        <UCard
          v-if="showdownRank"
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden animate-fade-in"
        >
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
            >
              <UIcon name="i-heroicons-bolt" class="mr-2 text-pink-500 text-base animate-pulse" />
              Ligue Compétitive Showdown
            </h3>

            <div
              class="bg-slate-950/20 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 relative overflow-hidden"
            >
              <!-- Glow background -->
              <div
                class="absolute inset-0 bg-gradient-to-r opacity-5 blur-xl pointer-events-none"
                :class="showdownRank.rankInfo.color"
              ></div>

              <!-- Badge Display -->
              <div
                class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg border border-white/10 shrink-0 relative"
                :class="showdownRank.rankInfo.color"
              >
                <UIcon :name="showdownRank.rankInfo.icon" />
              </div>

              <!-- Stats Info -->
              <div class="flex-1 w-full text-center sm:text-left space-y-3">
                <div>
                  <h4 class="text-xl font-black font-display text-white uppercase tracking-wider">
                    {{ showdownRank.rankInfo.label }}
                  </h4>
                  <p class="text-xs text-gray-400 font-medium">
                    {{ showdownRank.points }} LP cumulés
                  </p>
                </div>

                <!-- LP Division Progress Bar -->
                <div v-if="showdownRank.rankInfo.tier !== 'Master'" class="space-y-1">
                  <div
                    class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
                  >
                    <div
                      class="h-full bg-gradient-to-r rounded-full transition-all duration-300"
                      :class="showdownRank.rankInfo.color"
                      :style="{ width: `${showdownRank.rankInfo.pointsInDivision}%` }"
                    ></div>
                  </div>
                  <div
                    class="flex justify-between text-[10px] font-bold text-gray-500 font-display"
                  >
                    <span>{{ showdownRank.rankInfo.pointsInDivision }} / 100 LP</span>
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
                    <span class="text-sm font-black text-white font-display">{{
                      showdownRank.gamesPlayed
                    }}</span>
                  </div>
                  <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                    <span
                      class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                      >Victoires</span
                    >
                    <span class="text-sm font-black text-amber-400 font-display"
                      >🏆 {{ showdownRank.wins }}</span
                    >
                  </div>
                  <div class="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                    <span
                      class="text-[9px] text-gray-500 font-bold block font-display uppercase tracking-wider"
                      >Ratio Victoires</span
                    >
                    <span class="text-sm font-black text-cyan-400 font-display">
                      {{
                        showdownRank.gamesPlayed > 0
                          ? Math.round((showdownRank.wins / showdownRank.gamesPlayed) * 100)
                          : 0
                      }}%
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
                <UIcon name="i-heroicons-bolt" class="mr-2 text-pink-500 text-base" />
                Historique des duels (20 derniers)
              </h4>

              <div v-if="loadingHistory" class="space-y-2">
                <USkeleton v-for="i in 3" :key="i" class="h-16 w-full bg-slate-800 rounded-xl" />
              </div>

              <div
                v-else-if="showdownHistory.length === 0"
                class="text-center py-6 bg-slate-950/20 border border-white/5 rounded-2xl"
              >
                <p class="text-xs text-gray-500">Vous n'avez pas encore joué en mode Showdown.</p>
              </div>

              <div v-else class="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                <div
                  v-for="match in showdownHistory"
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
                          {{
                            match.won ? "Victoire ⚔️" : match.draw ? "Match Nul 🤝" : "Défaite 💀"
                          }}
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
              </div>
            </div>
          </div>
        </UCard>

        <!-- Daily Challenges Section -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
        >
          <div class="space-y-4">
            <h3
              class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
            >
              <UIcon name="i-heroicons-calendar-days" class="mr-2 text-violet-400 text-base" />
              Historique Défis Quotidiens (20 derniers)
            </h3>

            <div v-if="loadingHistory" class="space-y-3">
              <USkeleton v-for="i in 3" :key="i" class="h-20 w-full bg-slate-800 rounded-xl" />
            </div>

            <div
              v-else-if="dailyHistory.length === 0"
              class="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl"
            >
              <p class="text-sm text-gray-500">Vous n'avez pas encore résolu de défi quotidien.</p>
            </div>

            <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <div
                v-for="daily in dailyHistory"
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
                <div
                  class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5"
                >
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AchievementComponent from "@/components/achievements/Achievement.vue";

const supabase = useSupabaseClient();
const router = useRouter();

const loading = ref(true);
const loadingHistory = ref(true);
const username = ref("");
const initialUsername = ref("");
const email = ref("");
const level = ref(0);
const xp = ref(0);
const xpThreshold = ref(0);
const xpMax = ref(0);
const loadingUpdateUser = ref(false);

const config = useRuntimeConfig();
const isPushSupported = ref(false);
const isSubscribed = ref(false);
const loadingPush = ref(false);
const loadingPushTest = ref(false);
const pushStatusMessage = ref("");

const pushButtonText = computed(() => {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "denied") {
      return "Bloqué";
    }
  }
  return "Activer";
});

const isUsernameSaveable = computed(() => {
  return (
    username.value !== initialUsername.value &&
    username.value.length >= 4 &&
    username.value.length <= 16
  );
});

const achievements = ref<any[]>([]);
const userAchievements = ref<any[]>([]);
const battleRoyaleHistory = ref<any[]>([]);
const showdownHistory = ref<any[]>([]);
const dailyHistory = ref<any[]>([]);
const themeProgress = ref<any[]>([]);
const brRank = ref<any>(null);
const showdownRank = ref<any>(null);
const globalStats = ref<any>(null);

const xpProgress = computed(() => {
  const current = xp.value - xpThreshold.value;
  const max = xpMax.value - xpThreshold.value;
  if (max <= 0) return 0;
  return (current / max) * 100;
});

onMounted(async () => {
  await fetchUser();
  checkPushSupport();
});

async function fetchUser() {
  try {
    loading.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const userConnected = await $fetch<any>("/api/user/current", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    username.value = userConnected?.name ?? "";
    initialUsername.value = userConnected?.name ?? "";
    email.value = userConnected?.email ?? "";
    level.value = userConnected?.UserProgress?.levelId ?? 1;
    xp.value = userConnected?.UserProgress?.xp ?? 0;
    xpThreshold.value = userConnected?.UserProgress?.level?.xp_threshold ?? 0;
    xpMax.value = userConnected?.nextLevelTreshold ?? 100;
    brRank.value = userConnected?.brRank ?? null;
    showdownRank.value = userConnected?.showdownRank ?? null;

    if (userConnected?.id) {
      await fetchHistory(userConnected.id);
    }
  } catch (e) {
    console.error("Failed to load current user profil:", e);
  } finally {
    loading.value = false;
  }
}

async function fetchHistory(userId: string) {
  try {
    loadingHistory.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const data = await $fetch<any>(`/api/user/profile/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    achievements.value = data?.achievements ?? [];
    userAchievements.value = data?.userAchievements ?? [];
    battleRoyaleHistory.value = data?.battleRoyaleHistory ?? [];
    showdownHistory.value = data?.showdownHistory ?? [];
    dailyHistory.value = data?.dailyHistory ?? [];
    themeProgress.value = data?.themeProgress ?? [];
    brRank.value = data?.user?.brRank ?? null;
    showdownRank.value = data?.user?.showdownRank ?? null;
    globalStats.value = data?.globalStats ?? null;
  } catch (e) {
    console.error("Failed to load user history:", e);
  } finally {
    loadingHistory.value = false;
  }
}

async function updateUsername() {
  if (!username.value || username.value.length < 4 || username.value.length > 16) {
    return;
  }
  try {
    loadingUpdateUser.value = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const userUpdated = await $fetch<any>("/api/user/username", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        username: username.value,
      },
    });
    username.value = userUpdated?.name ?? "";
    initialUsername.value = userUpdated?.name ?? "";
  } catch (e) {
    console.error("Failed to update username:", e);
  } finally {
    loadingUpdateUser.value = false;
  }
}

async function signOut() {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
  } catch (e) {
    console.error("Sign out error:", e);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ms: number) {
  if (!ms || ms < 0) return "0s";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
}

function getMasteryColorClass(mastery: number) {
  if (mastery < 4.5) {
    return {
      badge: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      icon: "text-rose-500",
    };
  } else if (mastery < 7.5) {
    return {
      badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      icon: "text-amber-500",
    };
  } else {
    return {
      badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      icon: "text-emerald-500",
    };
  }
}

function checkPushSupport() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
    isPushSupported.value = true;
    checkSubscription();
  } else {
    isPushSupported.value = false;
    pushStatusMessage.value = "Les notifications push ne sont pas supportées par votre navigateur.";
  }
}

async function checkSubscription() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    isSubscribed.value = !!subscription;
  } catch (e) {
    console.error("Erreur lors de la vérification de l'abonnement push :", e);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  loadingPush.value = true;
  pushStatusMessage.value = "";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      pushStatusMessage.value =
        "Permission de notification refusée. Veuillez autoriser les notifications dans les paramètres du navigateur pour continuer.";
      loadingPush.value = false;
      return;
    }

    const vapidKey = config.public.vapidPublicKey;
    if (!vapidKey) {
      pushStatusMessage.value = "Configuration serveur manquante (clé publique VAPID introuvable).";
      loadingPush.value = false;
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    await $fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { subscription },
    });

    isSubscribed.value = true;
    pushStatusMessage.value =
      "Notifications push activées avec succès ! 🎉 Vous recevrez des alertes pour votre streak et vos défis quotidiens.";
  } catch (err: any) {
    console.error("Erreur lors de l'abonnement push :", err);
    pushStatusMessage.value = "Une erreur est survenue lors de l'abonnement aux notifications.";
  } finally {
    loadingPush.value = false;
  }
}

async function unsubscribeFromPush() {
  loadingPush.value = true;
  pushStatusMessage.value = "";
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      await $fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: { endpoint },
      });
    }

    isSubscribed.value = false;
    pushStatusMessage.value = "Les notifications push ont été désactivées.";
  } catch (err: any) {
    console.error("Erreur lors de la désinscription push :", err);
    pushStatusMessage.value = "Une erreur est survenue lors de la désactivation des notifications.";
  } finally {
    loadingPush.value = false;
  }
}

async function sendTestNotification() {
  loadingPushTest.value = true;
  pushStatusMessage.value = "";
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    await $fetch("/api/notifications/send-alerts", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { testNotification: true },
    });
    pushStatusMessage.value = "Notification de test envoyée avec succès ! 🔔";
  } catch (err: any) {
    console.error("Erreur lors de l'envoi du test :", err);
    pushStatusMessage.value = "Impossible d'envoyer la notification de test.";
  } finally {
    loadingPushTest.value = false;
  }
}
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
