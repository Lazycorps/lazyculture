<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden relative"
      :ui="{ body: 'p-2.5 sm:p-6' }"
    >
      <!-- Non authenticated user -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl text-indigo-400 mx-auto animate-pulse"
          >
            🔒
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Mode Showdown</h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Mesurez-vous en duel à mort dans l'arène ! Répondez vite et juste pour anéantir les
              points de vie de l'adversaire.
            </p>
          </div>
          <UButton
            to="/login"
            color="primary"
            size="lg"
            block
            icon="i-heroicons-key"
            class="font-extrabold uppercase font-display tracking-wider py-3"
          >
            Se connecter et jouer
          </UButton>
        </div>
      </template>

      <!-- Authenticated player -->
      <template v-else>
        <!-- 1. MATCHMAKING SCREEN -->
        <div v-if="!matchId" class="py-6 px-4 space-y-6 flex flex-col items-center">
          <!-- Recoverable session banner -->
          <div
            v-if="session.recoverableMatchId.value"
            class="w-full max-w-md bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-lg text-center space-y-3"
          >
            <div class="text-amber-400 text-2xl animate-bounce">⚡</div>
            <div class="space-y-1">
              <h3 class="text-sm font-black font-display text-white uppercase tracking-wider">
                Partie en cours détectée
              </h3>
              <p class="text-xs text-gray-400">
                Vous étiez dans un duel actif. Souhaitez-vous le rejoindre ?
              </p>
            </div>
            <UButton
              color="warning"
              size="md"
              block
              icon="i-heroicons-arrow-right-circle"
              class="font-black uppercase font-display tracking-wider py-2.5"
              @click="session.connect(session.recoverableMatchId.value, user?.id || '')"
            >
              Rejoindre la partie
            </UButton>
          </div>

          <!-- Incoming challenge banner -->
          <div
            v-if="incomingChallenge"
            class="w-full max-w-md bg-gradient-to-r from-indigo-500/10 to-pink-500/10 border border-indigo-500/30 rounded-2xl p-4 shadow-lg text-center space-y-3"
          >
            <div class="text-2xl animate-bounce">⚔️</div>
            <div class="space-y-1">
              <h3 class="text-sm font-black font-display text-white uppercase tracking-wider">
                {{ incomingChallenge.challengerName }} te défie en duel !
              </h3>
              <p class="text-xs text-gray-400">Acceptez-vous le défi Showdown ?</p>
            </div>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="soft"
                size="md"
                icon="i-heroicons-x-mark"
                class="flex-1 font-black uppercase font-display tracking-wider py-2.5"
                @click="respondToChallenge(false)"
              >
                Refuser
              </UButton>
              <UButton
                color="primary"
                size="md"
                icon="i-heroicons-bolt"
                class="flex-1 font-black uppercase font-display tracking-wider py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500"
                @click="respondToChallenge(true)"
              >
                Accepter
              </UButton>
            </div>
          </div>

          <!-- Mode Introduction -->
          <div class="text-center space-y-2">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-3xl text-white mx-auto shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-pulse"
            >
              💥
            </div>
            <h2 class="text-2xl font-black font-display text-white tracking-wide uppercase">
              Showdown
            </h2>
            <p class="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              Duel en temps réel basé sur le classement LP. 100 HP chacun, 20 secondes pour drafter
              vos thèmes et 20 secondes pour répondre. Dégâts augmentés par la vitesse et les combos
              !
            </p>
          </div>

          <!-- Queue control panel -->
          <div class="w-full max-w-md space-y-4">
            <div
              v-if="queueStatus === 'searching'"
              class="flex flex-col items-center py-6 px-4 bg-slate-900/50 border border-white/5 rounded-2xl space-y-6"
            >
              <!-- Radar Radar animation -->
              <div class="relative w-24 h-24 flex items-center justify-center">
                <div
                  class="absolute inset-0 rounded-full border border-indigo-500/30 animate-radar-ping"
                ></div>
                <div
                  class="absolute inset-2 rounded-full border border-indigo-500/50 animate-radar-ping delay-1000"
                ></div>
                <div
                  class="absolute inset-4 rounded-full border border-indigo-500/70 animate-radar-ping delay-2000"
                ></div>
                <div
                  class="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-[0_0_15px_rgba(99,102,241,0.7)] animate-pulse"
                >
                  📡
                </div>
              </div>

              <div class="text-center space-y-1">
                <h3
                  class="text-sm font-bold text-indigo-400 uppercase tracking-widest animate-pulse font-display"
                >
                  Recherche d'un adversaire...
                </h3>
                <p class="text-[10px] text-gray-500">
                  Temps écoulé : {{ formatElapsedTime(elapsedTime) }}
                </p>
              </div>

              <UButton
                color="warning"
                variant="ghost"
                size="sm"
                icon="i-heroicons-x-mark"
                class="hover:bg-red-500/15"
                @click="cancelSearch"
              >
                Annuler la recherche
              </UButton>
            </div>

            <!-- Waiting for challenged friend -->
            <div
              v-else-if="outgoingChallenge"
              class="flex flex-col items-center py-6 px-4 bg-slate-900/50 border border-white/5 rounded-2xl space-y-6"
            >
              <div class="text-4xl animate-pulse">⚔️</div>
              <div class="text-center space-y-1">
                <h3
                  class="text-sm font-bold text-indigo-400 uppercase tracking-widest animate-pulse font-display"
                >
                  En attente de {{ outgoingChallenge.name }}...
                </h3>
                <p class="text-[10px] text-gray-500">
                  Votre ami a reçu une notification. Le défi expire après 2 minutes.
                </p>
              </div>
              <UButton
                color="warning"
                variant="ghost"
                size="sm"
                icon="i-heroicons-x-mark"
                class="hover:bg-red-500/15"
                @click="cancelChallenge"
              >
                Annuler le défi
              </UButton>
            </div>

            <div v-else class="flex flex-col space-y-3">
              <UButton
                color="primary"
                size="lg"
                block
                icon="i-heroicons-bolt"
                class="font-black uppercase font-display tracking-wider py-4 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/20"
                @click="startSearch"
              >
                Lancer la recherche de duel
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                size="lg"
                block
                icon="i-heroicons-user-group"
                class="font-black uppercase font-display tracking-wider py-3.5"
                @click="challengeModalOpen = true"
              >
                Défier un ami
              </UButton>
              <div class="text-center">
                <span class="text-[10px] text-gray-500">
                  Recherche avec tolérance de ±200 LP puis élargissement automatique.
                </span>
              </div>
            </div>
          </div>

          <SocialInviteFriendsModal
            v-model:open="challengeModalOpen"
            mode="single"
            title="Défier un ami"
            confirm-label="Défier"
            @select="challengeFriend"
          />
        </div>

        <!-- ACTIVE GAME STATES -->
        <div v-else class="py-2 space-y-4">
          <!-- HUD Combat (Shared between Theme Draft, Playing Duel and Finished Screen) -->
          <div
            v-if="status === 'THEME_SELECTION' || status === 'PLAYING' || status === 'FINISHED'"
            class="grid grid-cols-7 items-center gap-2 px-2 py-3 bg-slate-900/40 border border-white/5 rounded-2xl"
          >
            <!-- Player A (Moi) -->
            <div class="col-span-3 text-left space-y-1">
              <div class="flex items-center space-x-2 pl-1 relative">
                <span class="text-xl relative">
                  {{ isP1Me ? "🦁" : "🦊" }}
                  <!-- Emote Bubble -->
                  <transition name="pop-in">
                    <div
                      v-if="myActiveEmote"
                      class="absolute -top-10 -left-2 bg-slate-950 border border-indigo-500/50 rounded-xl px-1.5 py-0.5 flex items-center justify-center text-base shadow-lg animate-emote-bounce z-30"
                    >
                      {{ myActiveEmote }}
                    </div>
                  </transition>
                </span>
                <div class="truncate">
                  <div class="text-xs font-black text-white truncate leading-tight">
                    {{ user?.name || "Moi" }}
                  </div>
                  <div class="text-[9px] text-indigo-400 font-medium">Lvl. {{ myLevel }}</div>
                </div>
                <!-- Floating Damage Indicator -->
                <transition name="float-up">
                  <span
                    v-if="myDamageTaken !== null"
                    class="absolute -top-6 right-1 text-lg font-black text-[#ff2e54] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_0_12px_rgba(255,46,84,0.8)] animate-damage-pop z-20"
                  >
                    -{{ myDamageTaken }} HP
                  </span>
                </transition>
              </div>
              <!-- HP Bar -->
              <div
                class="relative w-full h-5 bg-slate-950 rounded-full border border-white/10 overflow-hidden"
                :class="{ 'flash-red-border': myHpFlash }"
              >
                <div
                  class="h-full bg-gradient-to-r transition-all duration-500"
                  :class="
                    myHpFlash
                      ? 'from-red-600 to-rose-500'
                      : myHp > 50
                        ? 'from-emerald-500 to-green-400'
                        : myHp > 25
                          ? 'from-amber-500 to-yellow-400'
                          : 'from-red-600 to-rose-500'
                  "
                  :style="{ width: `${myHp}%` }"
                ></div>
                <!-- HP text overlay -->
                <div
                  class="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow"
                >
                  {{ myHp }}/100 HP
                </div>
              </div>
              <!-- Combo Streak -->
              <div
                class="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 rounded text-[9px] text-amber-400 font-black uppercase transition-all duration-300"
                :class="
                  myStreak > 0
                    ? 'opacity-100 animate-pulse'
                    : 'opacity-0 pointer-events-none select-none'
                "
              >
                <span>🔥 Combo x{{ myStreak || 1 }}</span>
              </div>
            </div>

            <!-- VS / TIMER -->
            <div class="col-span-1 flex flex-col items-center justify-center">
              <template v-if="status === 'THEME_SELECTION'">
                <div
                  class="w-9 h-9 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-400 font-display tracking-wide font-extrabold"
                >
                  VS
                </div>
              </template>
              <template v-else-if="status === 'FINISHED'">
                <div
                  class="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 font-display tracking-wide font-extrabold"
                >
                  🏆
                </div>
              </template>
              <template v-else>
                <div
                  class="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1"
                >
                  RD {{ currentRound }}
                </div>
                <div class="relative w-10 h-10 flex items-center justify-center">
                  <template v-if="showRoundResults">
                    <span class="text-lg font-mono font-black text-amber-400 z-10 animate-bounce">
                      {{ roundEndCountdown }}
                    </span>
                  </template>
                  <template v-else-if="isReading">
                    <span class="text-base z-10 animate-pulse" title="Temps de lecture">📖</span>
                    <span
                      class="absolute -bottom-1 text-[9px] font-mono font-black text-sky-400 z-10"
                    >
                      {{ readingTimeLeft }}s
                    </span>
                  </template>
                  <template v-else>
                    <!-- Circular progress outline -->
                    <svg class="absolute w-full h-full transform -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="rgba(255,255,255,0.05)"
                        stroke-width="2.5"
                        fill="transparent"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="#6366f1"
                        stroke-width="2.5"
                        fill="transparent"
                        :stroke-dasharray="113"
                        :stroke-dashoffset="dashOffset"
                        class="transition-all duration-1000"
                      />
                    </svg>
                    <span class="text-xs font-mono font-black text-white z-10">{{
                      timerLeft
                    }}</span>
                  </template>
                </div>
              </template>
            </div>

            <!-- Player B (Opponent) -->
            <div class="col-span-3 text-right space-y-1">
              <div class="flex items-center justify-end space-x-2 pr-1 relative">
                <!-- Floating Damage Indicator -->
                <transition name="float-up">
                  <span
                    v-if="opponentDamageTaken !== null"
                    class="absolute -top-6 left-1 text-lg font-black text-[#ff2e54] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_0_12px_rgba(255,46,84,0.8)] animate-damage-pop z-20"
                  >
                    -{{ opponentDamageTaken }} HP
                  </span>
                </transition>
                <div class="truncate">
                  <div class="text-xs font-black text-white truncate leading-tight">
                    {{ opponent?.name || "Adversaire" }}
                  </div>
                  <div class="text-[9px] text-pink-400 font-medium">
                    Lvl. {{ opponent?.level || 1 }}
                  </div>
                </div>
                <span class="text-xl relative">
                  {{ !isP1Me ? "🦁" : "🦊" }}
                  <!-- Emote Bubble -->
                  <transition name="pop-in">
                    <div
                      v-if="opponentActiveEmote"
                      class="absolute -top-10 -right-2 bg-slate-950 border border-pink-500/50 rounded-xl px-1.5 py-0.5 flex items-center justify-center text-base shadow-lg animate-emote-bounce z-30"
                    >
                      {{ opponentActiveEmote }}
                    </div>
                  </transition>
                </span>
              </div>
              <!-- HP Bar -->
              <div
                class="relative w-full h-5 bg-slate-950 rounded-full border border-white/10 overflow-hidden"
                :class="{ 'flash-red-border': opponentHpFlash }"
              >
                <div
                  class="h-full bg-gradient-to-l transition-all duration-500 ml-auto"
                  :class="
                    opponentHpFlash
                      ? 'from-red-600 to-rose-500'
                      : (opponent?.hp || 0) > 50
                        ? 'from-emerald-500 to-green-400'
                        : (opponent?.hp || 0) > 25
                          ? 'from-amber-500 to-yellow-400'
                          : 'from-red-600 to-rose-500'
                  "
                  :style="{ width: `${opponent?.hp || 0}%` }"
                ></div>
                <!-- HP text overlay -->
                <div
                  class="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow"
                >
                  {{ opponent?.hp || 0 }}/100 HP
                </div>
              </div>
              <!-- Combo Streak -->
              <div
                class="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 rounded text-[9px] text-amber-400 font-black uppercase transition-all duration-300"
                :class="
                  (opponent?.streak || 0) > 0
                    ? 'opacity-100 animate-pulse'
                    : 'opacity-0 pointer-events-none select-none'
                "
              >
                <span>🔥 Combo x{{ opponent?.streak || 1 }}</span>
              </div>
            </div>
          </div>

          <!-- 2. THEME SELECTION DRAFT STATE -->
          <div v-if="status === 'THEME_SELECTION'" class="space-y-6">
            <div class="text-center space-y-2">
              <div class="flex items-center justify-center space-x-1.5">
                <span class="text-xs font-black uppercase text-indigo-400 tracking-wider"
                  >Phase {{ phase }}</span
                >
                <span class="text-gray-600">•</span>
                <span class="text-xs font-medium text-gray-400">Sélection des thèmes</span>
              </div>

              <h3 class="text-lg font-black font-display text-white">
                {{
                  isMyThemeTurn
                    ? "C’est à votre tour de choisir !"
                    : "L’adversaire choisit un thème..."
                }}
              </h3>

              <!-- Timer countdown -->
              <div
                class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/60 border border-white/5 text-xs"
              >
                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span class="font-mono text-white font-bold">{{ themeSelectionTimeLeft }}s</span>
              </div>
            </div>

            <!-- List of 10 themes -->
            <div class="grid grid-cols-2 gap-2.5 sm:gap-4">
              <div
                v-for="theme in themePool"
                :key="theme.slug"
                class="relative overflow-hidden rounded-2xl border-2 transition-all duration-300 h-28 bg-slate-950 flex flex-col justify-end group/card select-none shadow-lg"
                :class="getThemeCardClass(theme.slug)"
                @click="handleSelectTheme(theme.slug)"
              >
                <!-- Theme cover image with hover zoom & selection dimming -->
                <img
                  v-if="theme.picture"
                  :src="theme.picture"
                  :alt="theme.name"
                  class="absolute inset-0 w-full h-full object-cover transition-all duration-500 rounded-2xl"
                  :class="{
                    'group-hover/card:scale-110': isMyThemeTurn && !isThemeSelected(theme.slug),
                    'brightness-[0.35]': isThemeSelected(theme.slug),
                  }"
                />

                <!-- Bottom glassy label to ensure 100% legibility of the title -->
                <div
                  class="absolute bottom-0 inset-x-0 bg-slate-950/75 backdrop-blur-md border-t border-white/10 py-2.5 px-2 text-center z-10 flex items-center justify-center min-h-[40px] transition-colors rounded-b-[14px]"
                  :class="getThemeLabelClass(theme.slug)"
                >
                  <span
                    class="font-extrabold text-xs text-white tracking-wide font-display group-hover/card:text-indigo-400 transition-colors"
                  >
                    {{ theme.name }}
                  </span>
                </div>

                <!-- Floating Neon Badges (Chosen status) -->
                <div class="absolute top-2.5 left-2.5 z-10">
                  <span
                    v-if="selectedThemes?.p1?.includes(theme.slug)"
                    class="text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-widest shadow-lg"
                    :class="
                      isP1Me
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/50'
                        : 'bg-pink-600 text-white border-pink-400 shadow-pink-500/50'
                    "
                  >
                    {{ isP1Me ? "Mon Choix" : "Adversaire" }}
                  </span>
                  <span
                    v-else-if="selectedThemes?.p2?.includes(theme.slug)"
                    class="text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-widest shadow-lg"
                    :class="
                      !isP1Me
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/50'
                        : 'bg-pink-600 text-white border-pink-400 shadow-pink-500/50'
                    "
                  >
                    {{ !isP1Me ? "Mon Choix" : "Adversaire" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. DUEL PLAYING STATE -->
          <div
            v-else-if="status === 'PLAYING'"
            class="space-y-6"
            :class="{ 'shake-animation': shakeActive }"
          >
            <!-- Active theme display -->
            <div class="text-center">
              <span
                class="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 tracking-wider"
              >
                Thème : {{ currentThemeName }}
              </span>
            </div>

            <!-- Round feedback/message -->
            <transition name="fade">
              <div v-if="showRoundResults && lastRoundResults" class="text-center mt-2">
                <span
                  v-if="!myRoundStats?.correct && !oppRoundStats?.correct"
                  class="inline-block text-[11px] font-black uppercase px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 tracking-wide animate-pulse"
                >
                  ⚠️ Double échec !
                </span>
                <span
                  v-else-if="myRoundStats?.correct"
                  class="inline-block text-[11px] font-black uppercase px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 tracking-wide"
                >
                  ⚔️ Bien joué !
                </span>
                <span
                  v-else-if="oppRoundStats?.correct"
                  class="inline-block text-[11px] font-black uppercase px-3 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 tracking-wide"
                >
                  🩸 L'adversaire a été plus rapide !
                </span>
              </div>
            </transition>

            <!-- Question card -->
            <div v-if="currentQuestion" class="space-y-4">
              <QuestionDisplay
                :questionId="currentQuestion.id"
                :libelle="currentQuestion.libelle"
                :img="currentQuestion.img"
                :themes="[]"
                :propositions="currentQuestion.propositions"
                :disabled="responded || isReading"
                :selectedOptionId="selectedOptionId"
                :correctOptionId="showRoundResults ? lastRoundResults?.correctAnswerId : null"
                :incorrectOptionId="
                  showRoundResults &&
                  lastRoundResults?.correctAnswerId != null &&
                  selectedOptionId !== lastRoundResults?.correctAnswerId
                    ? selectedOptionId
                    : null
                "
                :showCorrectIncorrectColors="showRoundResults"
                :showReporting="false"
                @selectOption="handleSubmitAnswer"
              />
            </div>

            <!-- Wait for opponent indicator -->
            <div v-if="responded && !showRoundResults" class="text-center py-2 space-y-1.5">
              <div
                class="w-4 h-4 border-2 border-indigo-500 border-r-transparent rounded-full animate-spin mx-auto"
              ></div>
              <p
                class="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse"
              >
                {{
                  opponentHasAnswered
                    ? "Résolution du round..."
                    : "Attente de la réponse de l’adversaire..."
                }}
              </p>
            </div>
          </div>

          <!-- 4. FINAL FINISHED PODIUM STATE -->
          <div
            v-else-if="status === 'FINISHED'"
            class="py-6 px-4 space-y-8 flex flex-col items-center text-center"
          >
            <!-- Title -->
            <div class="space-y-2">
              <div
                class="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg"
                :class="
                  isWinner
                    ? 'bg-amber-500/10 border border-amber-500/20 shadow-amber-500/20'
                    : 'bg-slate-800 border border-slate-700 shadow-slate-900/50'
                "
              >
                {{ isWinner ? "👑" : "💀" }}
              </div>
              <h2
                class="text-2xl font-black font-display tracking-wide uppercase"
                :class="isWinner ? 'text-amber-400 bg-clip-text' : 'text-gray-400'"
              >
                {{ isWinner ? "Victoire !" : isDraw ? "Match Nul" : "Défaite..." }}
              </h2>
              <p class="text-xs text-gray-500">
                Le combat s'est achevé à la mort d'un des duellistes.
              </p>
            </div>

            <!-- Results details -->
            <div class="w-full max-w-sm bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4">
              <!-- Score breakdown -->
              <div class="grid grid-cols-2 gap-4 divide-x divide-white/5">
                <div>
                  <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    HP Restants
                  </div>
                  <div class="text-xl font-black text-white">{{ myHp }} HP</div>
                </div>
                <div>
                  <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    XP Gagné
                  </div>
                  <div class="text-xl font-black text-emerald-400">
                    +{{ myFinalStats?.xpEarned || 0 }} XP
                  </div>
                </div>
              </div>

              <!-- LP gain or loss progress -->
              <div class="pt-2 border-t border-white/5 space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-400">Classement Showdown</span>
                  <span
                    class="font-bold"
                    :class="
                      (myFinalStats?.lpChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    "
                  >
                    {{ (myFinalStats?.lpChange || 0) >= 0 ? "+" : ""
                    }}{{ myFinalStats?.lpChange || 0 }} LP
                  </span>
                </div>

                <!-- Rank Card -->
                <div
                  class="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/40 border border-white/5"
                >
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-tr"
                    :class="myFinalStats?.newRank?.color || 'from-slate-800 to-slate-900'"
                  >
                    🏆
                  </div>
                  <div class="text-left">
                    <div class="text-xs font-black text-white">
                      {{ myFinalStats?.newRank?.label || "Bronze III" }}
                    </div>
                    <div class="text-[10px] text-gray-400">
                      {{ myFinalStats?.newPoints || 0 }} LP cumulés
                    </div>
                  </div>

                  <!-- Promotion badge -->
                  <div
                    v-if="myFinalStats?.isPromoted"
                    class="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 animate-pulse"
                  >
                    Promotion !
                  </div>
                </div>
              </div>
            </div>

            <!-- Back to Menu button -->
            <UButton
              color="primary"
              size="lg"
              block
              icon="i-heroicons-arrow-left-on-rectangle"
              class="font-black uppercase font-display tracking-wider py-3"
              @click="session.disconnect()"
            >
              Retour au menu
            </UButton>
          </div>
          <!-- Floating Emote Selector -->
          <div v-if="matchId" class="absolute bottom-4 right-4 z-40">
            <MultiplayerEmoteSelector @select="session.sendEmote" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useShowdownSession } from "~/composables/useShowdownSession";

import { useUserStore } from "~/stores/userStore";

const userStore = useUserStore();
await userStore.fetchUser();
const user = computed(() => userStore.user);

const session = useShowdownSession();

// Reactive mappings with SSE session
const matchId = session.matchId;
const status = session.status;
const currentRound = session.currentRound;
const phase = session.phase;
const themePool = session.themePool;
const selectedThemes = session.selectedThemes;
const themeSelectionTurn = session.themeSelectionTurn;
const themeSelectionTimeLeft = session.themeSelectionTimeLeft;
const currentQuestion = session.currentQuestion;
const currentQuestionDuration = session.currentQuestionDuration;
const currentQuestionAnswerStartTime = session.currentQuestionAnswerStartTime;
const currentQuestionEndTime = session.currentQuestionEndTime;
const myHp = session.myHp;
const myStreak = session.myStreak;
const opponent = session.opponent;
const responded = session.responded;
const selectedOptionId = session.selectedOptionId;
const winnerId = session.winnerId;
const showRoundResults = session.showRoundResults;
const lastRoundResults = session.lastRoundResults;
const opponentHasAnswered = session.opponentHasAnswered;

const myActiveEmote = session.myActiveEmote;
const opponentActiveEmote = session.opponentActiveEmote;

// Matchmaking local states
const queueStatus = ref<"none" | "searching" | "matched">("none");
let queuePollInterval: any = null;
const elapsedTime = ref(0);
let timerInterval: any = null;

// Challenge (défi direct entre amis) states
const route = useRoute();
const toast = useToast();
const challengeModalOpen = ref(false);
const outgoingChallenge = ref<{ id: string; name: string } | null>(null);
const incomingChallenge = ref<{ id: string; challengerName: string } | null>(null);
let challengePollInterval: any = null;

const showBottomNav = useState("showBottomNav", () => true);

watch(
  [queueStatus, matchId],
  ([qStatus, mId]) => {
    showBottomNav.value = !(qStatus === "searching" || mId);
  },
  { immediate: true },
);

// Duel timers
const timerLeft = ref(10);
const isReading = ref(false);
const readingTimeLeft = ref(0);
let duelTimerInterval: any = null;

// Visual FX
const shakeActive = ref(false);
const myDamageTaken = ref<number | null>(null);
const opponentDamageTaken = ref<number | null>(null);
const myHpFlash = ref(false);
const opponentHpFlash = ref(false);

const myLevel = ref(1);

onMounted(async () => {
  if (user) {
    // 1. Get user global level
    myLevel.value = userStore.level;

    // 2. Check if we have an active game to recover
    await session.checkActiveSession();
    if (session.recoverableMatchId.value) {
      // Prompt will be shown
    } else if (route.query.challenge) {
      // Deeplink de défi reçu : afficher la carte Accepter/Refuser si le défi est valide
      await loadIncomingChallenge(route.query.challenge as string);
    } else {
      // Check if we are already matched/searching
      const statusRes = await $fetch<{
        status: "none" | "searching" | "matched";
        matchId?: string;
      }>("/api/multiplayer/showdown/queue-status");
      if (statusRes.status === "searching") {
        queueStatus.value = "searching";
        startElapsedTimeTimer();
        startQueuePolling();
      } else if (statusRes.status === "matched" && statusRes.matchId) {
        session.connect(statusRes.matchId, user.value?.id || "");
      }
    }
  }
});

onBeforeUnmount(() => {
  stopQueuePolling();
  stopElapsedTimeTimer();
  stopChallengePolling();
  stopDuelTimer();
  if (status.value === "FINISHED") {
    session.disconnect();
  }
  showBottomNav.value = true;
});

// Watch for matchId changes (reconnect or matched transitions)
watch(matchId, (newId) => {
  if (newId) {
    stopQueuePolling();
    stopElapsedTimeTimer();
    queueStatus.value = "matched";
  } else {
    queueStatus.value = "none";
  }
});

const roundEndCountdown = ref(3);
let roundEndInterval: any = null;

// Watch for round end results to trigger shake effect if I took damage, and handle 3s countdown
watch(showRoundResults, (isActive) => {
  if (isActive) {
    stopDuelTimer();
    const { stopSound } = useAudio();
    stopSound("timer");
    roundEndCountdown.value = 3;
    if (roundEndInterval) clearInterval(roundEndInterval);
    roundEndInterval = setInterval(() => {
      roundEndCountdown.value--;
      if (roundEndCountdown.value <= 0) {
        clearInterval(roundEndInterval);
      }
    }, 1000);

    if (lastRoundResults.value) {
      const isP1 = lastRoundResults.value.p1.userId === user.value?.id;
      const myStats = isP1 ? lastRoundResults.value.p1 : lastRoundResults.value.p2;
      const oppStats = isP1 ? lastRoundResults.value.p2 : lastRoundResults.value.p1;

      if (myStats.correct) {
        const { playSound } = useAudio();
        playSound("response-success");
      }

      if (myStats.damageTaken > 0) {
        shakeActive.value = true;
        setTimeout(() => {
          shakeActive.value = false;
        }, 500);

        myDamageTaken.value = myStats.damageTaken;
        myHpFlash.value = true;
        setTimeout(() => {
          myHpFlash.value = false;
          myDamageTaken.value = null;
        }, 2500);
      }

      if (oppStats.damageTaken > 0) {
        opponentDamageTaken.value = oppStats.damageTaken;
        opponentHpFlash.value = true;
        setTimeout(() => {
          opponentHpFlash.value = false;
          opponentDamageTaken.value = null;
        }, 2500);
      }
    }
  } else {
    if (roundEndInterval) {
      clearInterval(roundEndInterval);
      roundEndInterval = null;
    }
  }
});

// Watch for new question to start the 15-second timer circle
watch(currentQuestion, (q) => {
  if (q && status.value === "PLAYING") {
    startDuelTimer();
  }
});

// --- MATCHMAKING METHODS ---

async function startSearch() {
  if (!user) return;
  try {
    queueStatus.value = "searching";
    elapsedTime.value = 0;
    startElapsedTimeTimer();

    const res = await $fetch<any>("/api/multiplayer/showdown/join-queue", {
      method: "post",
    });

    if (res.status === "matched" && res.matchId) {
      session.connect(res.matchId, user.value?.id || "");
    } else {
      startQueuePolling();
    }
  } catch (e) {
    console.error("Error joining queue:", e);
    queueStatus.value = "none";
    stopElapsedTimeTimer();
  }
}

async function cancelSearch() {
  if (!user.value) return;
  try {
    stopQueuePolling();
    stopElapsedTimeTimer();
    queueStatus.value = "none";

    await $fetch("/api/multiplayer/showdown/leave-queue", {
      method: "post",
    });
  } catch (e) {
    console.error("Error leaving queue:", e);
  }
}

function startQueuePolling() {
  stopQueuePolling();
  queuePollInterval = setInterval(async () => {
    try {
      const res = await $fetch<{ status: "none" | "searching" | "matched"; matchId?: string }>(
        "/api/multiplayer/showdown/queue-status",
      );
      if (res.status === "matched" && res.matchId) {
        stopQueuePolling();
        session.connect(res.matchId, user.value?.id || "");
      } else if (res.status === "none") {
        stopQueuePolling();
        queueStatus.value = "none";
        stopElapsedTimeTimer();
      }
    } catch (e) {
      console.error("Error polling queue status:", e);
    }
  }, 1500);
}

function stopQueuePolling() {
  if (queuePollInterval) {
    clearInterval(queuePollInterval);
    queuePollInterval = null;
  }
}

function startElapsedTimeTimer() {
  stopElapsedTimeTimer();
  timerInterval = setInterval(() => {
    elapsedTime.value++;
  }, 1000);
}

function stopElapsedTimeTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatElapsedTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// --- CHALLENGE (DÉFI ENTRE AMIS) METHODS ---

async function challengeFriend(friend: { userId: string; name: string }) {
  try {
    const res = await $fetch<{ challengeId: string }>("/api/multiplayer/showdown/challenge", {
      method: "post",
      body: { targetUserId: friend.userId },
    });
    outgoingChallenge.value = { id: res.challengeId, name: friend.name };
    startChallengePolling();
  } catch (e: any) {
    console.error("Erreur lors de la création du défi :", e);
    toast.add({
      title: "Défi impossible",
      description: e?.data?.statusMessage || "Impossible de créer le défi.",
      color: "error",
    });
  }
}

function startChallengePolling() {
  stopChallengePolling();
  challengePollInterval = setInterval(async () => {
    if (!outgoingChallenge.value) {
      stopChallengePolling();
      return;
    }
    try {
      const res = await $fetch<{ status: string; matchId?: string }>(
        `/api/multiplayer/showdown/challenge-status?challengeId=${outgoingChallenge.value.id}`,
      );
      if (res.status === "accepted" && res.matchId) {
        stopChallengePolling();
        outgoingChallenge.value = null;
        session.connect(res.matchId, user.value?.id || "");
      } else if (res.status === "declined" || res.status === "expired") {
        stopChallengePolling();
        toast.add({
          title: res.status === "declined" ? "Défi refusé" : "Défi expiré",
          description:
            res.status === "declined"
              ? `${outgoingChallenge.value.name} a refusé le duel.`
              : "Votre ami n'a pas répondu à temps.",
          color: "warning",
        });
        outgoingChallenge.value = null;
      }
    } catch (e) {
      console.error("Erreur lors du suivi du défi :", e);
    }
  }, 1500);
}

function stopChallengePolling() {
  if (challengePollInterval) {
    clearInterval(challengePollInterval);
    challengePollInterval = null;
  }
}

function cancelChallenge() {
  // Le défi expirera côté serveur ; on arrête simplement le suivi
  stopChallengePolling();
  outgoingChallenge.value = null;
}

async function loadIncomingChallenge(challengeId: string) {
  try {
    const res = await $fetch<{ status: string; challengerName?: string }>(
      `/api/multiplayer/showdown/challenge-status?challengeId=${challengeId}`,
    );
    if (res.status === "pending") {
      incomingChallenge.value = {
        id: challengeId,
        challengerName: res.challengerName || "Un joueur",
      };
    } else {
      toast.add({
        title: "Défi indisponible",
        description: "Ce défi n'est plus valide ou a expiré.",
        color: "warning",
      });
    }
  } catch (e) {
    console.error("Erreur lors du chargement du défi :", e);
  }
}

async function respondToChallenge(accept: boolean) {
  if (!incomingChallenge.value) return;
  try {
    const res = await $fetch<{ accepted: boolean; matchId?: string }>(
      "/api/multiplayer/showdown/challenge-respond",
      {
        method: "post",
        body: { challengeId: incomingChallenge.value.id, accept },
      },
    );
    incomingChallenge.value = null;
    if (res.accepted && res.matchId) {
      session.connect(res.matchId, user.value?.id || "");
    }
  } catch (e: any) {
    console.error("Erreur lors de la réponse au défi :", e);
    incomingChallenge.value = null;
    toast.add({
      title: "Défi indisponible",
      description: e?.data?.statusMessage || "Ce défi n'est plus valide.",
      color: "warning",
    });
  }
}

// --- DRAFT SELECTION METHODS ---

const isMyThemeTurn = computed(() => {
  return themeSelectionTurn.value === (user.value?.id || "");
});

const isP1Me = computed(() => {
  return session.isP1.value;
});

async function handleSelectTheme(themeSlug: string) {
  if (!isMyThemeTurn.value) return;

  const p1Choices = selectedThemes.value?.p1 || [];
  const p2Choices = selectedThemes.value?.p2 || [];
  if (p1Choices.includes(themeSlug) || p2Choices.includes(themeSlug)) return; // déjà pris

  const { stopSound } = useAudio();
  stopSound("timer");

  try {
    await $fetch("/api/multiplayer/showdown/select-theme", {
      method: "post",
      body: {
        matchId: matchId.value,
        themeSlug,
      },
    });
  } catch (e) {
    console.error("Error selecting theme:", e);
  }
}

function isThemeSelected(themeSlug: string): boolean {
  const p1Choices = selectedThemes.value?.p1 || [];
  const p2Choices = selectedThemes.value?.p2 || [];
  return p1Choices.includes(themeSlug) || p2Choices.includes(themeSlug);
}

function getThemeCardClass(themeSlug: string) {
  const p1Choices = selectedThemes.value?.p1 || [];
  const p2Choices = selectedThemes.value?.p2 || [];

  if (p1Choices.includes(themeSlug)) {
    return isP1Me.value
      ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.65)] z-10 cursor-not-allowed"
      : "border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.65)] z-10 cursor-not-allowed";
  }

  if (p2Choices.includes(themeSlug)) {
    return !isP1Me.value
      ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.65)] z-10 cursor-not-allowed"
      : "border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.65)] z-10 cursor-not-allowed";
  }

  if (!isMyThemeTurn.value) {
    return "border-white/5 opacity-40 cursor-not-allowed";
  }

  return "border-white/10 hover:border-indigo-400 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] cursor-pointer active:scale-95";
}

function getThemeLabelClass(themeSlug: string) {
  const p1Choices = selectedThemes.value?.p1 || [];
  const p2Choices = selectedThemes.value?.p2 || [];

  if (p1Choices.includes(themeSlug)) {
    return isP1Me.value
      ? "border-t-indigo-500/40 bg-indigo-950/80"
      : "border-t-pink-500/20 bg-pink-950/70";
  }

  if (p2Choices.includes(themeSlug)) {
    return !isP1Me.value
      ? "border-t-indigo-500/40 bg-indigo-950/80"
      : "border-t-pink-500/20 bg-pink-950/70";
  }

  return "";
}

function getThemeName(slug: string): string {
  const theme = themePool.value.find((t) => t.slug === slug);
  return theme ? theme.name : slug;
}

// --- GAMEPLAY METHODS ---

const currentThemeName = computed(() => {
  if (!currentQuestion.value) return "";
  const qThemes = currentQuestion.value.themes || [];
  return qThemes[0] || "Quiz";
});

// Timer stroke progress circle
const dashOffset = computed(() => {
  const total = 113; // Circumference = 2 * pi * r = 2 * 3.14159 * 18 = 113
  return total - (timerLeft.value / currentQuestionDuration.value) * total;
});

function startDuelTimer() {
  stopDuelTimer();
  timerLeft.value = currentQuestionDuration.value;

  const tick = () => {
    const now = Date.now();
    const answerStart = currentQuestionAnswerStartTime.value;

    // Phase de lecture : les réponses sont verrouillées, le chrono n'a pas démarré
    if (answerStart && now < answerStart) {
      isReading.value = true;
      readingTimeLeft.value = Math.max(0, Math.ceil((answerStart - now) / 1000));
      timerLeft.value = currentQuestionDuration.value;
      return;
    }

    isReading.value = false;

    // Phase de réponse : décompte basé sur la date de fin
    if (currentQuestionEndTime.value) {
      const remaining = Math.max(0, Math.round((currentQuestionEndTime.value - now) / 1000));
      timerLeft.value = remaining;
      if (remaining <= 0) {
        stopDuelTimer();
      }
    } else {
      timerLeft.value--;
      if (timerLeft.value <= 0) {
        stopDuelTimer();
      }
    }
  };

  tick();
  duelTimerInterval = setInterval(tick, 200);
}

function stopDuelTimer() {
  if (duelTimerInterval) {
    clearInterval(duelTimerInterval);
    duelTimerInterval = null;
  }
  isReading.value = false;
}

async function handleSubmitAnswer(optionId: number) {
  if (responded.value || isReading.value) return;

  selectedOptionId.value = optionId;
  responded.value = true;

  const { stopSound } = useAudio();
  stopSound("timer");

  try {
    await $fetch("/api/multiplayer/showdown/submit", {
      method: "post",
      body: {
        matchId: matchId.value,
        propositionId: optionId,
      },
    });
  } catch (e) {
    console.error("Error submitting answer:", e);
    // En cas d'échec critique, permettre de recliquer
    responded.value = false;
    selectedOptionId.value = null;
  }
}

// --- ROUND RESULTS OVERLAY INFO ---

const isP1User = computed(() => {
  return lastRoundResults.value?.p1.userId === user.value?.id;
});

const myRoundStats = computed(() => {
  if (!lastRoundResults.value) return null;
  return isP1User.value ? lastRoundResults.value.p1 : lastRoundResults.value.p2;
});

const oppRoundStats = computed(() => {
  if (!lastRoundResults.value) return null;
  return isP1User.value ? lastRoundResults.value.p2 : lastRoundResults.value.p1;
});

const didIWinRound = computed(() => {
  // J'ai répondu juste et j'ai infligé des dégâts, ou l'adversaire s'est pris des dégâts d'attaque
  if (!lastRoundResults.value) return false;
  return myRoundStats.value?.correct === true && (oppRoundStats.value?.damageTaken || 0) > 0;
});

const didILoseRound = computed(() => {
  if (!lastRoundResults.value) return false;
  return (myRoundStats.value?.damageTaken || 0) > 0;
});

const correctOptionValue = computed(() => {
  if (!currentQuestion.value || !lastRoundResults.value) return "";
  const correctId = lastRoundResults.value.correctAnswerId;
  const opt = currentQuestion.value.propositions.find((p: any) => p.id === correctId);
  return opt ? opt.value : "";
});

// --- PODIUM INFO ---

const isWinner = computed(() => {
  return winnerId.value === user.value?.id;
});

const isDraw = computed(() => {
  return winnerId.value === null;
});

const myFinalStats = computed(() => {
  if (status.value !== "FINISHED" || !lastRoundResults.value) return null;
  return lastRoundResults.value.p1.userId === user.value?.id
    ? lastRoundResults.value.p1
    : lastRoundResults.value.p2;
});

watch(timerLeft, (newVal) => {
  if (newVal === 5 && !responded.value && !showRoundResults.value && status.value === "PLAYING") {
    const { playSound } = useAudio();
    playSound("timer");
  }
});

watch(themeSelectionTimeLeft, (newVal) => {
  if (phase.value === "DRAFT" && newVal === 5) {
    const { playSound } = useAudio();
    playSound("timer");
  }
});

watch(phase, (newPhase) => {
  if (newPhase !== "DRAFT") {
    const { stopSound } = useAudio();
    stopSound("timer");
  }
});

watch(status, (newStatus) => {
  if (newStatus === "FINISHED" && user.value) {
    const { playSound } = useAudio();
    if (isWinner.value) {
      playSound("winner");
    } else if (!isDraw.value) {
      playSound("fail-br");
    }
  }
});
</script>

<style scoped>
/* Glassmorphism custom design */
.shadow-glass {
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Matchmaking Radar Animation */
@keyframes radar-ping {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-radar-ping {
  animation: radar-ping 3s infinite linear;
}

/* Shake Animation (for damage received) */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-6px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(6px);
  }
}

.shake-animation {
  animation: shake 0.4s ease-in-out;
}

/* Shrink bar animation for correction overlay duration (6 seconds) */
@keyframes shrink-bar {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}

.animate-shrink-bar {
  animation: shrink-bar 6s linear forwards;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Red Flash Animation for HP Container */
@keyframes flash-red-anim {
  0%,
  100% {
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }
  50% {
    border-color: rgba(239, 68, 68, 0.85);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
  }
}

.flash-red-border {
  animation: flash-red-anim 0.5s ease-in-out 3;
}

/* Floating Damage Pop Animation */
@keyframes damage-pop-anim {
  0% {
    opacity: 0;
    transform: translateY(15px) scale(0.6);
  }
  12% {
    opacity: 1;
    transform: translateY(0) scale(1.6);
  }
  24% {
    transform: translateY(-4px) scale(1.35);
  }
  80% {
    opacity: 1;
    transform: translateY(-12px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-38px) scale(0.85);
  }
}

.animate-damage-pop {
  animation: damage-pop-anim 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

/* Float-up Transition wrapper */
.float-up-enter-active,
.float-up-leave-active {
  transition: opacity 0.3s ease;
}
.float-up-enter-from,
.float-up-leave-to {
  opacity: 0;
}
</style>
