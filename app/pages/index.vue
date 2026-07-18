<template>
  <div
    class="w-full max-w-5xl mx-auto py-4 px-3 sm:py-6 sm:px-4 space-y-5 sm:space-y-8 select-none"
  >
    <!-- 1. DYNAMIC WELCOME / PROFILE HEADER -->
    <ClientOnly>
      <div
        class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-4 sm:p-6 md:p-8 flex flex-col gap-4"
      >
        <!-- Background decorative glows -->
        <div
          class="absolute -left-16 -top-16 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl"
        ></div>
        <div
          class="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-indigo-600/10 blur-3xl"
        ></div>

        <!-- Top part: player info & badges -->
        <div
          class="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10"
        >
          <!-- Left: Player Info / Greeting -->
          <div class="flex items-center space-x-3 sm:space-x-4 relative z-10">
            <template v-if="user">
              <UserAvatar
                :src="userProfile?.equippedAvatar?.imageUrl"
                :frame="userProfile?.equippedFrame?.styleKey"
                size="xl"
                avatar-class="border-2 border-violet-500/40 shadow-neon"
              />
              <div class="space-y-1">
                <h2
                  class="text-lg sm:text-xl md:text-2xl font-black font-display text-white tracking-wide"
                >
                  Ravi de vous revoir, {{ userProfile?.name || "Joueur" }} ! 👋
                </h2>
              </div>
            </template>
            <template v-else>
              <div
                class="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-2xl text-violet-400"
              >
                🚀
              </div>
              <div class="space-y-1">
                <h2
                  class="text-lg sm:text-xl md:text-2xl font-black font-display text-white tracking-wide"
                >
                  Bienvenue sur LazyCulture !
                </h2>
                <p class="text-xs text-gray-400 font-medium">
                  Testez vos connaissances, explorez nos modes de jeu et défiez la communauté.
                </p>
              </div>
            </template>
          </div>

          <!-- Right: Stats Capsule / Guest Action -->
          <div class="relative z-10 shrink-0 w-full md:w-auto">
            <div
              v-if="user"
              class="bg-slate-950/50 border border-white/10 rounded-2xl p-3 min-w-full sm:min-w-[280px] md:min-w-[320px] space-y-2.5 relative overflow-hidden"
            >
              <!-- Row 1: Coins & Streak Pill -->
              <div class="flex items-center justify-between">
                <!-- Coins info -->
                <div class="flex items-center gap-1.5 text-amber-400">
                  <UIcon name="i-heroicons-circle-stack-solid" class="text-base animate-pulse" />
                  <span class="text-sm font-black font-display"
                    >{{ userProfile?.coins || 0 }} 🪙</span
                  >
                </div>

                <!-- Streak Info (only if active) -->
                <div
                  v-if="dailyStatus?.activity?.bonusPercent > 0"
                  class="bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-0.5 flex items-center gap-1 text-red-400 text-[9px] font-black font-display tracking-wider uppercase shrink-0"
                >
                  <UIcon name="i-heroicons-fire-solid" class="text-xs text-red-500 animate-pulse" />
                  <span
                    >+{{ dailyStatus.activity.bonusPercent }}% ({{
                      dailyStatus.activity.streak
                    }}j)</span
                  >
                </div>
              </div>

              <!-- Row 2: Level & XP progress -->
              <div class="space-y-1.5">
                <div
                  class="flex justify-between items-center text-[10px] font-bold font-display leading-none"
                >
                  <span class="text-violet-400 uppercase tracking-wider"
                    >Niveau {{ userProfile?.level || 1 }}</span
                  >
                  <span class="text-gray-500"
                    >{{ userProfile?.xp || 0 }} /
                    {{ userProfile?.nextLevelTreshold || 100 }} XP</span
                  >
                </div>
                <!-- Progress Bar -->
                <div
                  class="w-full h-1.5 bg-slate-900 rounded-full border border-white/5 overflow-hidden"
                >
                  <div
                    class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500 shadow-neon"
                    :style="{ width: `${xpProgress}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <div v-else class="flex gap-3">
              <UButton
                to="/login"
                color="primary"
                size="lg"
                class="font-black font-display uppercase tracking-widest px-6"
                icon="i-heroicons-key"
              >
                Se Connecter
              </UButton>
              <UButton
                to="/themes"
                color="white"
                variant="ghost"
                size="lg"
                class="font-black font-display uppercase tracking-widest border border-white/10 hover:bg-white/5"
              >
                Visiter
              </UButton>
            </div>
          </div>
        </div>

        <!-- Bottom part: Compact Daily claims (only if logged in and status is loaded) -->
        <div
          v-if="user && dailyStatus"
          class="w-full pt-4 mt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10"
        >
          <!-- Left: Compact Login Claim -->
          <div
            class="flex items-center justify-between gap-3 bg-slate-950/30 border border-white/5 rounded-xl p-3"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">📆</span>
              <div class="space-y-0.5 min-w-0">
                <p class="text-xs font-black text-white font-display">
                  Connexion : Jour
                  {{
                    dailyStatus.calendar.streakBroken
                      ? 1
                      : dailyStatus.calendar.claimedToday
                        ? dailyStatus.calendar.dailyStreak
                        : dailyStatus.calendar.dailyStreak + 1
                  }}
                </p>
                <p class="text-[10px] text-gray-400 truncate">
                  Récompense :
                  <span class="text-amber-400 font-bold font-display"
                    >{{
                      dailyStatus.calendar.rewards[
                        ((dailyStatus.calendar.streakBroken
                          ? 1
                          : dailyStatus.calendar.claimedToday
                            ? dailyStatus.calendar.dailyStreak
                            : dailyStatus.calendar.dailyStreak + 1) -
                          1) %
                          7
                      ]
                    }}
                    🪙</span
                  >
                </p>
                <p
                  v-if="
                    !dailyStatus.calendar.claimedToday && !dailyStatus.calendar.hasAnsweredToday
                  "
                  class="text-[9px] text-violet-400 font-semibold font-display"
                >
                  ⚠️ Répondez à 1 question d'abord
                </p>
              </div>
            </div>

            <div class="shrink-0 flex gap-2">
              <UButton
                v-if="dailyStatus.calendar.streakBroken && dailyStatus.calendar.canCatchUp"
                :color="dailyStatus.calendar.hasAnsweredToday ? 'amber' : 'gray'"
                :disabled="!dailyStatus.calendar.hasAnsweredToday"
                variant="soft"
                size="xs"
                icon="i-heroicons-arrow-path-solid"
                class="font-black font-display uppercase text-[9px] tracking-widest"
                :loading="claimingLogin"
                @click="claimLogin(true)"
              >
                {{
                  dailyStatus.calendar.hasAnsweredToday
                    ? "Rattrapage (20 🪙)"
                    : "Rattrapage verrouillé"
                }}
              </UButton>
              <UButton
                v-if="!dailyStatus.calendar.claimedToday"
                :color="dailyStatus.calendar.hasAnsweredToday ? 'primary' : 'gray'"
                :disabled="!dailyStatus.calendar.hasAnsweredToday"
                size="xs"
                icon="i-heroicons-gift-solid"
                class="font-black font-display uppercase text-[9px] tracking-widest bg-gradient-to-r shadow-md"
                :class="
                  dailyStatus.calendar.hasAnsweredToday
                    ? 'from-violet-600 to-indigo-600 shadow-violet-600/20'
                    : 'from-slate-800 to-slate-900 border border-white/5 cursor-not-allowed'
                "
                :loading="claimingLogin"
                @click="claimLogin(false)"
              >
                {{ dailyStatus.calendar.hasAnsweredToday ? "Réclamer" : "1 quiz requis" }}
              </UButton>
              <span
                v-else
                class="text-[10px] text-emerald-400 font-bold font-display flex items-center gap-1"
              >
                <UIcon name="i-heroicons-check-circle-solid" class="text-sm" /> Réclamé
              </span>
            </div>
          </div>

          <!-- Right: Compact Daily Quest -->
          <div
            v-if="dailyStatus.quest"
            class="flex items-center justify-between gap-3 bg-slate-950/30 border border-white/5 rounded-xl p-3"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-base shrink-0">🎯</span>
              <div class="space-y-1 min-w-0 flex-1">
                <div class="flex justify-between items-center gap-2">
                  <p class="text-xs font-black text-white font-display truncate">
                    Quête : {{ dailyStatus.quest.title }}
                  </p>
                  <span
                    class="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 font-black px-1.5 py-0.25 rounded-full font-display shrink-0"
                  >
                    {{ dailyStatus.quest.questStreak }} 🔥
                  </span>
                </div>
                <!-- Mini progress & text -->
                <div class="flex items-center gap-2">
                  <div
                    class="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                      :style="{
                        width: `${Math.min((dailyStatus.quest.progress / dailyStatus.quest.target) * 100, 100)}%`,
                      }"
                    ></div>
                  </div>
                  <span class="text-[9px] text-gray-500 font-bold shrink-0">
                    {{ dailyStatus.quest.progress }}/{{ dailyStatus.quest.target }}
                  </span>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex gap-2">
              <UButton
                v-if="!dailyStatus.quest.claimed"
                :disabled="dailyStatus.quest.progress < dailyStatus.quest.target"
                color="emerald"
                size="xs"
                icon="i-heroicons-check-solid"
                class="font-black font-display uppercase tracking-widest text-[9px]"
                :class="
                  dailyStatus.quest.progress >= dailyStatus.quest.target
                    ? 'animate-bounce bg-emerald-600'
                    : 'bg-slate-800 text-gray-500 border border-white/5'
                "
                :loading="claimingQuest"
                @click="claimQuest(dailyStatus.quest.id)"
              >
                {{
                  dailyStatus.quest.progress >= dailyStatus.quest.target ? "Réclamer" : "En cours"
                }}
              </UButton>
              <span
                v-else
                class="text-[10px] text-emerald-400 font-bold font-display flex items-center gap-1"
              >
                <UIcon name="i-heroicons-check-circle" /> Réclamée
              </span>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- 2. HIGH-ENGAGEMENT DAILY CHALLENGE HERO SECTION -->
    <div
      class="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#1e1b4b]/30 via-[#111827]/60 to-[#070a13]/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 hover:border-violet-500/40 transition-all duration-300 group"
    >
      <!-- Background radial glow -->
      <div
        class="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-violet-600/15 blur-3xl group-hover:bg-violet-600/25 transition-colors"
      ></div>

      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 relative z-10"
      >
        <div class="space-y-2.5 sm:space-y-4 max-w-xl">
          <!-- Mini Badge & Stats Inline -->
          <div class="flex items-center justify-between gap-4">
            <div
              class="inline-flex items-center space-x-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] sm:text-xs font-black uppercase text-violet-400 font-display tracking-widest"
            >
              <span class="animate-pulse">📅</span>
              <span>Défi Quotidien</span>
            </div>

            <div
              class="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold font-display text-gray-300"
            >
              <UIcon name="i-heroicons-users" class="text-violet-400 text-xs" />
              <span>{{ dailyStats?.participants ?? 0 }} participants</span>
            </div>
          </div>

          <div class="space-y-1.5">
            <h3
              class="text-xl sm:text-2xl md:text-3xl font-black font-display text-white tracking-wide uppercase"
            >
              {{ dailyTitle }}
            </h3>
            <p class="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Une série unique de 10 questions de culture générale, commune à tous les joueurs.
            </p>
          </div>
        </div>

        <!-- Action / Status block -->
        <div class="shrink-0 w-full md:w-auto">
          <ClientOnly>
            <div
              class="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-5 md:p-6 text-center space-y-2.5 sm:space-y-4 max-w-sm mx-auto md:max-w-none"
            >
              <template v-if="!user">
                <p class="text-xs text-gray-400 font-medium">
                  Connectez-vous pour enregistrer votre score
                </p>
                <UButton
                  to="/login"
                  color="primary"
                  size="xl"
                  block
                  icon="i-heroicons-key"
                  class="font-black font-display uppercase tracking-widest py-3 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-600/20"
                >
                  Jouer le Défi
                </UButton>
              </template>

              <template v-else>
                <!-- In progress -->
                <div v-if="questionId > 0 && !completed" class="space-y-3">
                  <div class="flex justify-between text-xs font-bold font-display text-gray-400">
                    <span>Progression du jour</span>
                    <span class="text-violet-400">{{ questionId }} / {{ nbrQuestion }}</span>
                  </div>
                  <div
                    class="w-40 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5"
                  >
                    <div
                      class="h-full bg-violet-600 rounded-full transition-all"
                      :style="{
                        width: `${nbrQuestion > 0 ? (questionId / nbrQuestion) * 100 : 0}%`,
                      }"
                    ></div>
                  </div>
                  <UButton
                    to="/series/daily"
                    color="primary"
                    size="lg"
                    block
                    icon="i-heroicons-play-solid"
                    class="font-black font-display uppercase tracking-widest py-3 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-600/20"
                  >
                    Reprendre le Défi
                  </UButton>
                </div>

                <!-- Completed -->
                <div v-else-if="completed" class="space-y-3">
                  <div
                    class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 font-display"
                  >
                    <span>⭐ Réussi</span>
                  </div>
                  <p class="text-sm font-black font-display text-white">
                    Score : <span class="text-emerald-400">{{ score }} / {{ nbrQuestion }}</span>
                  </p>
                  <p
                    class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider font-display"
                  >
                    Revenez demain !
                  </p>
                  <UButton
                    to="/ranking/daily"
                    color="primary"
                    size="md"
                    block
                    icon="i-heroicons-chart-bar"
                    class="font-black font-display uppercase tracking-widest"
                  >
                    Classement du Jour
                  </UButton>
                </div>

                <!-- Not started -->
                <div v-else class="space-y-2">
                  <p class="text-xs text-gray-400 font-bold uppercase tracking-wider font-display">
                    Défi disponible !
                  </p>
                  <UButton
                    to="/series/daily"
                    color="primary"
                    size="lg"
                    block
                    icon="i-heroicons-play-solid"
                    class="font-black font-display uppercase tracking-widest py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-600/20"
                  >
                    Démarrer
                  </UButton>
                </div>
              </template>
            </div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- 3. GAME MODES EXPLORATION HUBS -->
    <div class="space-y-5 sm:space-y-6">
      <div class="space-y-1">
        <h3 class="text-xl font-black font-display text-white tracking-wide uppercase">
          Explorez les Modes de Jeu
        </h3>
        <p class="text-xs text-gray-400 font-medium">
          Choisissez votre style de jeu : progressez seul à votre rythme ou affrontez des rivaux en
          direct.
        </p>
      </div>

      <!-- Section: Solo Modes -->
      <div class="space-y-3 sm:space-y-4">
        <div
          class="flex items-center space-x-2 text-xs font-black uppercase text-gray-400 tracking-wider font-display"
        >
          <span>🎯</span>
          <span>Modes Solo</span>
        </div>

        <div
          class="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:pb-0"
        >
          <!-- Aventure -->
          <div
            @click="navigateTo('/adventure')"
            class="w-[250px] shrink-0 snap-start sm:w-auto sm:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-5 flex flex-col justify-between h-40 sm:h-48 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-10 -top-10 w-20 h-20 rounded-full bg-emerald-600/10 blur-xl group-hover:bg-emerald-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">🗺️</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  Parcours
                </span>
              </div>
              <h4 class="text-base font-black font-display text-white tracking-wide">Aventure</h4>
              <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-3">
                Parcourez des chemins thématiques, validez chaque étape et progressez à votre propre
                rythme.
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-emerald-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Jouer</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>

          <!-- Brainrun -->
          <div
            @click="navigateTo('/brainrun')"
            class="w-[250px] shrink-0 snap-start sm:w-auto sm:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-5 flex flex-col justify-between h-40 sm:h-48 hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-10 -top-10 w-20 h-20 rounded-full bg-orange-600/10 blur-xl group-hover:bg-orange-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">🧠</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20"
                >
                  Roguelite
                </span>
              </div>
              <h4 class="text-base font-black font-display text-white tracking-wide">Brainrun</h4>
              <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-3">
                Grimpez les 3 actes, affrontez des boss, collectez des reliques et tentez de
                survivre le plus loin possible.
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-orange-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Lancer une run</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>

          <!-- Speedrun -->
          <div
            @click="navigateTo('/series/speedrun')"
            class="w-[250px] shrink-0 snap-start sm:w-auto sm:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-5 flex flex-col justify-between h-40 sm:h-48 hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-10 -top-10 w-20 h-20 rounded-full bg-violet-600/10 blur-xl group-hover:bg-violet-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">⏱️</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
                >
                  Sprint
                </span>
              </div>
              <h4 class="text-base font-black font-display text-white tracking-wide">Speedrun</h4>
              <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-3">
                Un maximum de questions dans un temps chronométré. Attention, chaque erreur réduit
                votre temps restant !
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-violet-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Lancer le sprint</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>

          <!-- Ascension -->
          <div
            @click="navigateTo('/series/ascent')"
            class="w-[250px] shrink-0 snap-start sm:w-auto sm:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-5 flex flex-col justify-between h-40 sm:h-48 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-10 -top-10 w-20 h-20 rounded-full bg-indigo-600/10 blur-xl group-hover:bg-indigo-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">🧗</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                >
                  Survie
                </span>
              </div>
              <h4 class="text-base font-black font-display text-white tracking-wide">Ascension</h4>
              <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-3">
                Grimpez vers le sommet de la culture générale en gérant vos points de vie à chaque
                étape difficile.
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-indigo-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Commencer</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Multiplayer Modes -->
      <div class="space-y-3 sm:space-y-4">
        <div
          class="flex items-center space-x-2 text-xs font-black uppercase text-gray-400 tracking-wider font-display"
        >
          <span>👥</span>
          <span>Modes Multijoueur</span>
        </div>

        <div
          class="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:gap-4 md:pb-0"
        >
          <!-- Battle Royale -->
          <div
            @click="navigateTo('/series/battle-royale')"
            class="w-[270px] shrink-0 snap-start md:w-auto md:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-6 flex flex-col justify-between h-40 sm:h-44 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-12 -top-12 w-24 h-24 rounded-full bg-red-600/10 blur-xl group-hover:bg-red-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">🔥</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  Arène à 20
                </span>
              </div>
              <h4 class="text-lg font-black font-display text-white tracking-wide">
                Battle Royale
              </h4>
              <p class="text-xs text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                Survivez en temps réel face à 19 autres combattants. Le dernier joueur avec des
                points de vie l'emporte !
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-red-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Rejoindre l'arène</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>

          <!-- Showdown -->
          <div
            @click="navigateTo('/series/showdown')"
            class="w-[270px] shrink-0 snap-start md:w-auto md:shrink relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/30 p-4 sm:p-6 flex flex-col justify-between h-40 sm:h-44 hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.1)] transition-all duration-300 group cursor-pointer active:scale-[0.99]"
          >
            <div
              class="absolute -right-12 -top-12 w-24 h-24 rounded-full bg-pink-600/10 blur-xl group-hover:bg-pink-600/15"
            ></div>
            <div class="space-y-2 relative z-10">
              <div class="flex justify-between items-start">
                <span class="text-2xl">⚔️</span>
                <span
                  class="text-[9px] font-black uppercase tracking-wider font-display px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20"
                >
                  Duel 1v1
                </span>
              </div>
              <h4 class="text-lg font-black font-display text-white tracking-wide">Showdown</h4>
              <p class="text-xs text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                Affrontez un adversaire dans un duel tactique de points de vie. Choisissez vos
                thèmes stratégiquement.
              </p>
            </div>
            <div
              class="relative z-10 flex items-center text-xs font-bold text-pink-400 font-display group-hover:translate-x-1 transition-transform"
            >
              <span>Lancer un duel</span>
              <UIcon name="i-heroicons-chevron-right-solid" class="ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. TWO COLUMN: NEWS / UPDATES & QUICK PLAY -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <!-- Latest updates column (Takes 2 cols) -->
      <div class="lg:col-span-2 space-y-3 sm:space-y-4">
        <div
          class="flex items-center space-x-2 text-xs font-black uppercase text-gray-400 tracking-wider font-display"
        >
          <UIcon name="i-heroicons-megaphone" class="text-violet-400 text-sm" />
          <span>Dernières Nouveautés</span>
        </div>

        <div
          class="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-col sm:space-y-3 sm:pb-0"
        >
          <template v-if="announcements && announcements.length > 0">
            <div
              v-for="news in announcements"
              :key="news.id"
              class="w-[280px] shrink-0 snap-start sm:w-auto sm:shrink bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 hover:bg-white/10 transition-colors"
            >
              <div
                class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400 text-lg"
              >
                <UIcon :name="news.icon || 'i-heroicons-megaphone'" />
              </div>
              <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div class="space-y-1.5">
                  <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2"
                  >
                    <h5 class="text-sm font-black font-display text-white leading-tight">
                      {{ news.title }}
                    </h5>
                    <span
                      class="self-start sm:self-auto text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 border"
                      :class="
                        news.tagColor || 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                      "
                    >
                      {{ news.tag }}
                    </span>
                  </div>
                  <p
                    class="text-[11px] sm:text-xs text-gray-400 leading-relaxed line-clamp-3 sm:line-clamp-none"
                  >
                    {{ news.description }}
                  </p>
                </div>

                <div class="flex items-center justify-between gap-2 pt-2 mt-auto">
                  <div class="text-[10px] text-gray-500 font-semibold font-display">
                    {{ formatDate(news.createDate) }}
                  </div>
                  <div v-if="news.btnLabel && news.btnLink">
                    <UButton
                      :to="news.btnLink"
                      size="xs"
                      color="primary"
                      variant="solid"
                      class="font-black font-display uppercase tracking-widest px-3.5 py-1.5"
                    >
                      {{ news.btnLabel }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div
            v-else
            class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 text-center text-xs text-gray-500 italic"
          >
            Aucune actualité disponible pour le moment.
          </div>
        </div>
      </div>

      <!-- Quick Play CTA / Training Column (Takes 1 col) -->
      <div class="space-y-3 sm:space-y-4">
        <div
          class="flex items-center space-x-2 text-xs font-black uppercase text-gray-400 tracking-wider font-display"
        >
          <UIcon name="i-heroicons-academic-cap" class="text-violet-400 text-sm" />
          <span>Partie Rapide</span>
        </div>

        <div
          class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/40 backdrop-blur-xl p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-6 hover:border-violet-500/40 transition-all duration-300 group lg:h-[calc(100%-2rem)]"
        >
          <div
            class="absolute -right-12 -bottom-12 w-28 h-28 rounded-full bg-violet-600/15 blur-xl group-hover:bg-violet-600/20"
          ></div>

          <div class="space-y-3 relative z-10">
            <div
              class="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"
            >
              🎲
            </div>
            <h4 class="text-lg font-black font-display text-white tracking-wide">
              Entraînement Rapide
            </h4>
            <p class="text-xs text-gray-400 leading-relaxed">
              Pas le temps pour une run complète ou un duel ? Lancez instantanément une série de
              questions aléatoires de culture générale pour vous échauffer !
            </p>
          </div>

          <div class="space-y-2.5 relative z-10 w-full">
            <UButton
              to="/themes/random"
              color="primary"
              size="lg"
              block
              icon="i-heroicons-play-solid"
              class="font-black font-display uppercase tracking-widest py-3 bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-500 group-hover:to-indigo-500"
            >
              Lancer Aléatoire
            </UButton>
            <UButton
              to="/themes"
              color="white"
              variant="solid"
              size="lg"
              block
              icon="i-heroicons-book-open"
              class="font-black font-display uppercase tracking-widest py-3 border border-white/10 hover:bg-white/5 bg-slate-950/60"
            >
              Tous les Thèmes
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/userStore";
import type { UserSeriesDTO } from "#shared/series";
import type { DailyStatsDTO } from "#shared/DTO/dailyStatsDTO";

// 1. Meta definitions for SEO
useSeoMeta({
  title: "Accueil - Quiz, Défis & Culture Générale",
  ogTitle: "Accueil - Quiz, Défis & Culture Générale - LazyCulture",
  description:
    "Découvrez LazyCulture, la plateforme de quiz thématiques, roguelite Brainrun, duels multijoueurs Showdown et défis quotidiens.",
  ogDescription:
    "Découvrez LazyCulture, la plateforme de quiz thématiques, roguelite Brainrun, duels multijoueurs Showdown et défis quotidiens.",
});

// 2. Auth & User store fetching
const userStore = useUserStore();
const user = useSupabaseUser();

const toast = useToast();
const claimingLogin = ref(false);
const claimingQuest = ref(false);
const showCalendar = ref(false);

const { data: dailyStatus, refresh: refreshDailyStatus } = await useFetch<any>(
  () => (user.value ? "/api/user/daily/status" : null),
  { server: false },
);

const calendarStartDay = computed(() => {
  if (!dailyStatus.value?.calendar) return 1;
  const { dailyStreak, claimedToday, streakBroken } = dailyStatus.value.calendar;
  if (streakBroken) return 1;

  if (claimedToday) {
    return Math.floor((dailyStreak - 1) / 7) * 7 + 1;
  } else {
    return Math.floor(dailyStreak / 7) * 7 + 1;
  }
});

const isDayClaimed = (index: number) => {
  if (!dailyStatus.value?.calendar) return false;
  const { dailyStreak } = dailyStatus.value.calendar;
  const dayNum = calendarStartDay.value + index;
  return dayNum <= dailyStreak;
};

const isDayActive = (index: number) => {
  if (!dailyStatus.value?.calendar) return false;
  const { dailyStreak, claimedToday, streakBroken } = dailyStatus.value.calendar;
  if (claimedToday) return false;

  const dayNum = calendarStartDay.value + index;
  const activeDay = streakBroken ? 1 : dailyStreak + 1;
  return dayNum === activeDay;
};

const claimLogin = async (catchUp = false) => {
  if (claimingLogin.value) return;
  claimingLogin.value = true;
  try {
    const res = await $fetch<any>("/api/user/daily/claim-login", {
      method: "POST",
      body: { catchUp },
    });
    if (res.success) {
      toast.add({
        title: "Récompense obtenue !",
        description: catchUp
          ? `Série sauvée ! Vous obtenez ${res.coinsEarned} pièces (rattrapage déduit).`
          : `Félicitations ! Vous obtenez ${res.coinsEarned} pièces.`,
        color: "green",
      });
      await userStore.fetchUser(true);
      await refreshDailyStatus();
    }
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e.data?.statusMessage || "Une erreur est survenue.",
      color: "red",
    });
  } finally {
    claimingLogin.value = false;
  }
};

const claimQuest = async (questId: number) => {
  if (claimingQuest.value) return;
  claimingQuest.value = true;
  try {
    const res = await $fetch<any>("/api/user/daily/claim-quest", {
      method: "POST",
      body: { questId },
    });
    if (res.success) {
      toast.add({
        title: "Quête validée !",
        description: `Vous obtenez ${res.coinsEarned} pièces. Série actuelle de quêtes : ${res.questStreak} 🔥`,
        color: "green",
      });
      await userStore.fetchUser(true);
      await refreshDailyStatus();
    }
  } catch (e: any) {
    toast.add({
      title: "Erreur",
      description: e.data?.statusMessage || "Une erreur est survenue.",
      color: "red",
    });
  } finally {
    claimingQuest.value = false;
  }
};

onMounted(async () => {
  await userStore.fetchUser();
});

// Computed properties for player profile
const userProfile = computed(() => {
  if (!userStore.user) return null;
  return {
    name: userStore.user.name || "Joueur",
    level: userStore.user.UserProgress?.levelId || 1,
    xp: userStore.user.UserProgress?.xp || 0,
    nextLevelTreshold: userStore.user.nextLevelTreshold || 100,
    equippedAvatar: userStore.user.equippedAvatar ?? null,
    equippedFrame: userStore.user.equippedFrame ?? null,
    coins: userStore.user.Wallet?.coins ?? 0,
  };
});

const xpProgress = computed(() => userStore.xpProgress);

// 3. Daily challenge live data
const { data: userSeries } = await useFetch<UserSeriesDTO>(() =>
  user.value ? "/api/series/daily" : null,
);
const { data: dailyStats } = await useFetch<DailyStatsDTO>("/api/series/dailyStats");

const dailyTitle = computed(() => {
  return userSeries.value?.series?.title || "Série Quotidienne";
});
const nbrQuestion = computed(() => {
  return userSeries.value?.series?.data?.questionsIds?.length || 0;
});
const questionId = computed(() => {
  return userSeries.value?.userResponse?.data?.responses?.length ?? 0;
});
const completed = computed(() => {
  return nbrQuestion.value > 0 && questionId.value >= nbrQuestion.value;
});
const score = computed(() => {
  return userSeries.value?.userResponse?.data?.score ?? 0;
});

// 4. Dynamic announcements loading
const { data: announcements } = await useFetch<any[]>("/api/announcements");

// Format date helper
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();

  // Set times to midnight to compare only dates
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowDate.getTime() - dDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
};
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
