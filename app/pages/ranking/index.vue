<template>
  <div class="w-full max-w-3xl mx-auto py-2 space-y-6 select-none pb-20">
    <!-- Header Title -->
    <div class="text-center space-y-1.5 sm:space-y-2">
      <h1
        class="text-3xl sm:text-4xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Classements
      </h1>
      <p class="text-xs sm:text-sm text-gray-400 font-medium max-w-md mx-auto">
        Découvrez les meilleurs joueurs de Lazyculture et grimpez au sommet de la gloire.
      </p>
    </div>

    <!-- Modes Ribbon Switcher (Single row on desktop, soft swipe on mobile) with subtle indicator arrows -->
    <div class="flex justify-center max-w-full">
      <div class="relative max-w-full">
        <!-- Flèche gauche indicatrice (affichée uniquement si défilement gauche possible) -->
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <button
            v-if="canScrollRibbonLeft"
            type="button"
            class="absolute left-0 inset-y-0 z-10 w-8 flex items-center justify-start pl-2 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent rounded-l-2xl text-violet-300 hover:text-white transition-colors cursor-pointer"
            title="Défiler vers la gauche"
            @click="scrollRibbon('left')"
          >
            <UIcon name="i-heroicons-chevron-left" class="text-xs" />
          </button>
        </Transition>

        <!-- Ruban scrollable des onglets -->
        <div
          ref="ribbonContainer"
          class="bg-slate-950/70 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar shadow-inner scroll-smooth"
          @scroll="updateRibbonScroll"
        >
          <button
            v-for="tab in modeTabs"
            :key="tab.id"
            class="py-2 px-3 sm:px-4 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            :class="
              currentTab === tab.id
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            "
            @click="selectTab(tab.id, $event)"
          >
            <UIcon :name="tab.icon" class="text-sm" />
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Flèche droite indicatrice (affichée uniquement si défilement droit possible) -->
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <button
            v-if="canScrollRibbonRight"
            type="button"
            class="absolute right-0 inset-y-0 z-10 w-8 flex items-center justify-end pr-2 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent rounded-r-2xl text-violet-300 hover:text-white transition-colors cursor-pointer"
            title="Défiler vers la droite"
            @click="scrollRibbon('right')"
          >
            <UIcon name="i-heroicons-chevron-right" class="text-xs" />
          </button>
        </Transition>
      </div>
    </div>

    <!-- Contextual Toolbar for Daily (Period switcher + Temporal navigator on one row) -->
    <div
      v-if="currentTab === 'daily'"
      class="bg-slate-950/50 p-2 sm:p-2.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5 max-w-xl mx-auto backdrop-blur-md"
    >
      <!-- Sub-Tabs Switcher (Du jour / Mensuel / Tout le temps) -->
      <div class="bg-black/40 p-1 rounded-xl border border-white/5 flex space-x-1 w-full sm:w-auto">
        <button
          class="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200"
          :class="
            dailyPeriod === 'day'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          "
          @click="dailyPeriod = 'day'"
        >
          Du jour
        </button>
        <button
          class="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200"
          :class="
            dailyPeriod === 'monthly'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          "
          @click="dailyPeriod = 'monthly'"
        >
          Mensuel
        </button>
        <button
          class="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200"
          :class="
            dailyPeriod === 'alltime'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          "
          @click="dailyPeriod = 'alltime'"
        >
          Tout le temps
        </button>
      </div>

      <!-- Temporal Navigator (Day or Month) -->
      <div
        v-if="dailyPeriod === 'day'"
        class="bg-black/40 p-1 rounded-xl border border-white/5 flex items-center justify-between w-full sm:w-auto sm:min-w-[210px]"
      >
        <button
          class="p-1 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :disabled="!hasOlderDay"
          title="Jour précédent"
          @click="goToPreviousDay"
        >
          <UIcon name="i-heroicons-chevron-left" class="text-sm block" />
        </button>
        <button
          type="button"
          class="flex items-center justify-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-center text-[10px] font-bold uppercase tracking-wider text-white font-display truncate group cursor-pointer"
          title="Ouvrir le calendrier du mois"
          @click="calendarMonthModalOpen = true"
        >
          <span class="truncate">{{ selectedDayLabel }}</span>
          <UIcon
            name="i-heroicons-calendar-days"
            class="text-xs text-violet-400 group-hover:scale-110 transition-transform shrink-0"
          />
        </button>
        <button
          class="p-1 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :disabled="!hasNewerDay"
          title="Jour suivant"
          @click="goToNextDay"
        >
          <UIcon name="i-heroicons-chevron-right" class="text-sm block" />
        </button>
      </div>

      <div
        v-else-if="dailyPeriod === 'monthly'"
        class="bg-black/40 p-1 rounded-xl border border-white/5 flex items-center justify-between w-full sm:w-auto sm:min-w-[210px]"
      >
        <button
          class="p-1 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :disabled="!hasOlderMonth"
          title="Saison précédente"
          @click="goToPreviousMonth"
        >
          <UIcon name="i-heroicons-chevron-left" class="text-sm block" />
        </button>
        <button
          type="button"
          class="flex items-center justify-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-center text-[10px] font-bold uppercase tracking-wider text-white font-display truncate group cursor-pointer"
          title="Ouvrir les saisons mensuelles"
          @click="calendarYearModalOpen = true"
        >
          <span class="truncate">{{ selectedMonthLabel }}</span>
          <UIcon
            name="i-heroicons-calendar"
            class="text-xs text-violet-400 group-hover:scale-110 transition-transform shrink-0"
          />
        </button>
        <button
          class="p-1 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :disabled="!hasNewerMonth"
          title="Saison suivante"
          @click="goToNextMonth"
        >
          <UIcon name="i-heroicons-chevron-right" class="text-sm block" />
        </button>
      </div>

      <div
        v-else
        class="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-300 font-display flex items-center space-x-1"
      >
        <UIcon name="i-heroicons-trophy" class="text-xs text-amber-400" />
        <span>Historique des médailles</span>
      </div>
    </div>

    <!-- 7-Day Timeline Strip for Daily Series -->
    <div
      v-if="currentTab === 'daily' && dailyPeriod === 'day' && dailyTimeline.length > 0"
      class="max-w-xl mx-auto grid grid-cols-7 gap-1.5 sm:gap-2"
    >
      <button
        v-for="item in dailyTimelineChronological"
        :key="item.id"
        type="button"
        class="py-2.5 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer group shadow-sm"
        :class="
          selectedDay === item.date
            ? 'bg-gradient-to-b from-violet-500 to-indigo-600 border-2 border-violet-300 text-white shadow-xl shadow-violet-600/40 scale-[1.04]'
            : 'bg-slate-800 hover:bg-slate-700/90 border-slate-600/80 hover:border-slate-400 hover:scale-[1.02] shadow-md shadow-black/40'
        "
        @click="selectedDay = item.date"
      >
        <span
          class="text-[9px] sm:text-[10px] font-extrabold uppercase font-display leading-tight truncate w-full"
          :class="selectedDay === item.date ? 'text-white' : 'text-gray-200 group-hover:text-white'"
        >
          {{ item.shortDay === "Aujourd'hui" ? "Auj." : item.shortDay }}
        </span>
        <template v-if="selectedDay === item.date">
          <span
            v-if="item.userRank"
            class="text-[10px] sm:text-xs font-black font-display px-2 py-0.5 rounded-md border shadow-xs leading-none"
            :class="{
              'bg-amber-400 text-slate-950 border-amber-300': item.userRank === 1,
              'bg-slate-100 text-slate-950 border-white': item.userRank === 2,
              'bg-amber-500 text-slate-950 border-amber-300': item.userRank === 3,
              'bg-white/20 text-white border-white/30': item.userRank > 3,
            }"
          >
            #{{ item.userRank }}
          </span>
          <span
            v-else
            class="text-[10px] font-bold text-white/80 bg-white/15 border border-white/20 px-2 py-0.5 rounded-md leading-none"
          >
            -
          </span>
        </template>
        <template v-else>
          <span
            v-if="item.userRank"
            class="text-[10px] sm:text-xs font-black font-display px-2 py-0.5 rounded-md border shadow-xs leading-none"
            :class="{
              'bg-amber-400/30 text-amber-300 border-amber-400/60 shadow-amber-950/30':
                item.userRank === 1,
              'bg-slate-200/30 text-white border-slate-300/60 shadow-slate-950/30':
                item.userRank === 2,
              'bg-amber-600/35 text-amber-300 border-amber-500/60 shadow-amber-950/30':
                item.userRank === 3,
              'bg-violet-600/40 text-violet-200 border-violet-400/50 shadow-violet-950/30':
                item.userRank > 3,
            }"
          >
            #{{ item.userRank }}
          </span>
          <span
            v-else
            class="text-[10px] font-bold text-gray-400 bg-slate-950/60 border border-slate-700/70 px-2 py-0.5 rounded-md leading-none"
          >
            -
          </span>
        </template>
      </button>
    </div>

    <!-- 6-Month Timeline Strip for Monthly Seasons -->
    <div
      v-else-if="currentTab === 'daily' && dailyPeriod === 'monthly' && monthlyTimeline.length > 0"
      class="max-w-xl mx-auto grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2"
    >
      <button
        v-for="item in monthlyTimelineChronological"
        :key="item.monthKey"
        type="button"
        class="py-2.5 px-1.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer group shadow-sm"
        :class="
          selectedMonth === item.monthKey
            ? 'bg-gradient-to-b from-violet-500 to-indigo-600 border-2 border-violet-300 text-white shadow-xl shadow-violet-600/40 scale-[1.04]'
            : 'bg-slate-800 hover:bg-slate-700/90 border-slate-600/80 hover:border-slate-400 hover:scale-[1.02] shadow-md shadow-black/40'
        "
        @click="selectedMonth = item.monthKey"
      >
        <span
          class="text-[10px] sm:text-xs font-extrabold uppercase font-display leading-tight truncate w-full"
          :class="
            selectedMonth === item.monthKey ? 'text-white' : 'text-gray-200 group-hover:text-white'
          "
        >
          {{ item.shortMonth }}
        </span>
        <template v-if="selectedMonth === item.monthKey">
          <span
            v-if="item.userRank"
            class="text-[10px] sm:text-xs font-black font-display px-2.5 py-0.5 rounded-md border shadow-xs leading-none"
            :class="{
              'bg-amber-400 text-slate-950 border-amber-300': item.userRank === 1,
              'bg-slate-100 text-slate-950 border-white': item.userRank === 2,
              'bg-amber-500 text-slate-950 border-amber-300': item.userRank === 3,
              'bg-white/20 text-white border-white/30': item.userRank > 3,
            }"
          >
            #{{ item.userRank }}
          </span>
          <span
            v-else
            class="text-[10px] font-bold text-white/80 bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-md leading-none"
          >
            -
          </span>
        </template>
        <template v-else>
          <span
            v-if="item.userRank"
            class="text-[10px] sm:text-xs font-black font-display px-2.5 py-0.5 rounded-md border shadow-xs leading-none"
            :class="{
              'bg-amber-400/30 text-amber-300 border-amber-400/60 shadow-amber-950/30':
                item.userRank === 1,
              'bg-slate-200/30 text-white border-slate-300/60 shadow-slate-950/30':
                item.userRank === 2,
              'bg-amber-600/35 text-amber-300 border-amber-500/60 shadow-amber-950/30':
                item.userRank === 3,
              'bg-violet-600/40 text-violet-200 border-violet-400/50 shadow-violet-950/30':
                item.userRank > 3,
            }"
          >
            #{{ item.userRank }}
          </span>
          <span
            v-else
            class="text-[10px] font-bold text-gray-400 bg-slate-950/60 border border-slate-700/70 px-2.5 py-0.5 rounded-md leading-none"
          >
            -
          </span>
        </template>
      </button>
    </div>

    <!-- 3D Podium for Top 3 Players -->
    <div
      class="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-4 max-w-xl mx-auto"
      v-if="activeUsers && activeUsers.length > 0"
    >
      <!-- 2nd Place (Left) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="secondPlace">
          <NuxtLink
            :to="'/user/' + secondPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <UserAvatar
                :src="secondPlace.avatarUrl"
                :frame="secondPlace.frameStyleKey"
                size="lg"
                avatar-class="bg-slate-300/10 text-slate-300 border-2 shadow-lg group-hover:scale-105 transition-transform border-slate-400"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && secondPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-xs shadow-md"
                :class="secondPlace.rankInfo.color"
              >
                <UIcon :name="secondPlace.rankInfo.icon" class="text-[10px]" />
              </span>
              <span
                class="absolute -top-3 -right-2 bg-slate-400 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white/20 font-display shadow-md"
              >
                2
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-bold text-xs truncate text-slate-300 group-hover:text-white transition-colors"
              >
                {{ secondPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-[10px] font-extrabold text-slate-400/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ secondPlace.xp }} XP
              </p>
              <p
                class="text-[10px] font-extrabold text-cyan-400 font-display"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ secondPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5"
                  >{{ secondPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <template v-if="dailyPeriod === 'day'">
                  <span class="text-emerald-400 font-extrabold">{{ secondPlace.score }}/10</span>
                  <span class="block text-[8px] text-gray-400 uppercase tracking-wider mt-0.5"
                    >⏱️ {{ secondPlace.elapsedTime }} min</span
                  >
                </template>
                <template v-else>
                  <span
                    >🥇{{ secondPlace.firstPlaces }} 🥈{{ secondPlace.secondPlaces }} 🥉{{
                      secondPlace.thirdPlaces
                    }}</span
                  >
                  <span
                    class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                    >{{ secondPlace.score }} PTS</span
                  >
                </template>
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'brainrun'"
              >
                <span :class="secondPlace.isVictory ? 'text-emerald-400 font-extrabold' : ''">{{
                  brainrunFloorText(secondPlace)
                }}</span>
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ brainrunSubText(secondPlace) }}</span
                >
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-24 rounded-t-2xl border-t border-x border-slate-400/20 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-black font-display text-2xl text-slate-400/70 shadow-inner"
        >
          Ⅱ
        </div>
      </div>

      <!-- 1st Place (Center - Tallest) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="firstPlace">
          <NuxtLink
            :to="'/user/' + firstPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <!-- Golden Crown float effect -->
              <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce"
                >👑</span
              >
              <UserAvatar
                :src="firstPlace.avatarUrl"
                :frame="firstPlace.frameStyleKey"
                size="xl"
                avatar-class="bg-amber-500/10 text-amber-400 border-2 shadow-neon group-hover:scale-105 transition-transform border-amber-400"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && firstPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-sm shadow-md"
                :class="firstPlace.rankInfo.color"
              >
                <UIcon :name="firstPlace.rankInfo.icon" class="text-xs" />
              </span>
              <span
                class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 font-display shadow-md"
              >
                1
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-extrabold text-sm truncate text-amber-400 font-display group-hover:text-amber-300 transition-colors"
              >
                {{ firstPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-xs font-black text-amber-300/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ firstPlace.xp }} XP
              </p>
              <p
                class="text-xs font-black text-cyan-400 font-display animate-pulse"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ firstPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5"
                  >{{ firstPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-xs font-black text-gray-300 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <template v-if="dailyPeriod === 'day'">
                  <span class="text-emerald-400 font-extrabold">{{ firstPlace.score }}/10</span>
                  <span class="block text-[8px] text-gray-400 uppercase tracking-wider mt-0.5"
                    >⏱️ {{ firstPlace.elapsedTime }} min</span
                  >
                </template>
                <template v-else>
                  <span
                    >🥇{{ firstPlace.firstPlaces }} 🥈{{ firstPlace.secondPlaces }} 🥉{{
                      firstPlace.thirdPlaces
                    }}</span
                  >
                  <span
                    class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                    >{{ firstPlace.score }} PTS</span
                  >
                </template>
              </p>
              <p
                class="text-xs font-black text-gray-300 font-display flex flex-col items-center"
                v-else-if="currentTab === 'brainrun'"
              >
                <span :class="firstPlace.isVictory ? 'text-emerald-400' : ''">{{
                  brainrunFloorText(firstPlace)
                }}</span>
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ brainrunSubText(firstPlace) }}</span
                >
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-32 rounded-t-2xl border-t border-x border-amber-500/30 bg-amber-500/10 backdrop-blur-sm flex items-center justify-center font-black font-display text-4xl text-amber-400/80 shadow-lg shadow-amber-500/10"
        >
          Ⅰ
        </div>
      </div>

      <!-- 3rd Place (Right) -->
      <div class="flex flex-col items-center space-y-3">
        <template v-if="thirdPlace">
          <NuxtLink
            :to="'/user/' + thirdPlace.userId"
            class="flex flex-col items-center space-y-3 group cursor-pointer w-full"
          >
            <div class="relative">
              <UserAvatar
                :src="thirdPlace.avatarUrl"
                :frame="thirdPlace.frameStyleKey"
                size="lg"
                avatar-class="bg-amber-700/10 text-amber-600 border-2 shadow-lg group-hover:scale-105 transition-transform border-amber-700/60"
              />
              <!-- Rank badge icon overlay for BR/Showdown tab -->
              <span
                v-if="(currentTab === 'br' || currentTab === 'showdown') && thirdPlace.rankInfo"
                class="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center border border-white/10 text-xs shadow-md"
                :class="thirdPlace.rankInfo.color"
              >
                <UIcon :name="thirdPlace.rankInfo.icon" class="text-[10px]" />
              </span>
              <span
                class="absolute -top-3 -right-2 bg-amber-700 text-white font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white/20 font-display shadow-md"
              >
                3
              </span>
            </div>
            <div class="text-center w-full overflow-hidden px-1">
              <p
                class="font-bold text-xs truncate text-amber-700 group-hover:text-amber-500 transition-colors"
              >
                {{ thirdPlace.name || "Anonyme" }}
              </p>
              <p
                class="text-[10px] font-extrabold text-amber-700/80 font-display"
                v-if="currentTab === 'general' || currentTab === 'friends'"
              >
                {{ thirdPlace.xp }} XP
              </p>
              <p
                class="text-[10px] font-extrabold text-cyan-400 font-display"
                v-else-if="currentTab === 'br' || currentTab === 'showdown'"
              >
                {{ thirdPlace.points }} LP
                <span
                  class="block text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5"
                  >{{ thirdPlace.rankInfo?.label }}</span
                >
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'daily'"
              >
                <template v-if="dailyPeriod === 'day'">
                  <span class="text-emerald-400 font-extrabold">{{ thirdPlace.score }}/10</span>
                  <span class="block text-[8px] text-gray-400 uppercase tracking-wider mt-0.5"
                    >⏱️ {{ thirdPlace.elapsedTime }} min</span
                  >
                </template>
                <template v-else>
                  <span
                    >🥇{{ thirdPlace.firstPlaces }} 🥈{{ thirdPlace.secondPlaces }} 🥉{{
                      thirdPlace.thirdPlaces
                    }}</span
                  >
                  <span
                    class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                    >{{ thirdPlace.score }} PTS</span
                  >
                </template>
              </p>
              <p
                class="text-[10px] font-bold text-gray-400 font-display flex flex-col items-center"
                v-else-if="currentTab === 'brainrun'"
              >
                <span :class="thirdPlace.isVictory ? 'text-emerald-400 font-extrabold' : ''">{{
                  brainrunFloorText(thirdPlace)
                }}</span>
                <span
                  class="block text-[8px] text-violet-400 font-extrabold uppercase tracking-wider mt-0.5"
                  >{{ brainrunSubText(thirdPlace) }}</span
                >
              </p>
            </div>
          </NuxtLink>
        </template>
        <!-- Podium Stand -->
        <div
          class="w-full h-20 rounded-t-2xl border-t border-x border-amber-700/20 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-black font-display text-2xl text-amber-600/60 shadow-inner"
        >
          Ⅲ
        </div>
      </div>
    </div>

    <!-- Remaining Ranks List -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      :ui="{ body: 'p-0' }"
    >
      <div class="divide-y divide-white/5" v-if="remainingUsers.length > 0">
        <NuxtLink
          v-for="(userItem, index) in remainingUsers"
          :key="userItem.userId"
          :to="'/user/' + userItem.userId"
          class="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-white/5 transition-colors group cursor-pointer block"
          :class="userItem.isMe ? 'bg-violet-600/10 border-l-2 border-violet-500' : ''"
        >
          <!-- Rank & Avatar -->
          <div class="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
            <span
              class="w-6 text-center font-black font-display text-xs sm:text-sm text-gray-500 group-hover:text-violet-400 transition-colors shrink-0"
            >
              {{ index + 4 }}
            </span>
            <UserAvatar
              :src="userItem.avatarUrl"
              :frame="userItem.frameStyleKey"
              size="sm"
              avatar-class="bg-white/5 text-gray-400 border border-white/10 shrink-0"
            />
            <div class="text-left flex flex-col space-y-0.5 min-w-0">
              <span
                class="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-white transition-colors truncate"
              >
                {{ userItem.name || "Joueur Anonyme" }}
                <span v-if="userItem.isMe" class="text-violet-400 text-xs font-display ml-1"
                  >(vous)</span
                >
              </span>
              <!-- League badge and winrate detail for BR/Showdown tab -->
              <div
                v-if="(currentTab === 'br' || currentTab === 'showdown') && userItem.rankInfo"
                class="flex flex-wrap items-center gap-1.5"
              >
                <span
                  class="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-white/5"
                  :class="userItem.rankInfo.color"
                >
                  <UIcon :name="userItem.rankInfo.icon" class="text-[9px]" />
                  <span>{{ userItem.rankInfo.label }}</span>
                </span>
                <span
                  class="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-display"
                >
                  • Victoires :
                  {{
                    userItem.gamesPlayed > 0
                      ? Math.round((userItem.wins / userItem.gamesPlayed) * 100)
                      : 0
                  }}% ({{ userItem.wins }} / {{ userItem.gamesPlayed }}
                  {{ currentTab === "br" ? "BR" : "SD" }})
                </span>
              </div>
            </div>
          </div>

          <!-- XP / LP / Daily Score -->
          <div class="flex items-center space-x-4 sm:space-x-6 text-sm shrink-0 pl-3">
            <div class="text-right" v-if="currentTab === 'general' || currentTab === 'friends'">
              <span class="font-extrabold text-white font-display">{{ userItem.xp }}</span>
              <span
                class="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-display ml-1"
                >XP</span
              >
            </div>
            <div class="text-right" v-else-if="currentTab === 'br' || currentTab === 'showdown'">
              <span class="font-extrabold text-cyan-400 font-display">{{ userItem.points }}</span>
              <span
                class="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-display ml-1"
                >LP</span
              >
            </div>
            <div class="text-right flex flex-col items-end" v-else-if="currentTab === 'daily'">
              <template v-if="dailyPeriod === 'day'">
                <span class="font-extrabold text-emerald-400 font-display"
                  >{{ userItem.score }} / 10</span
                >
                <span class="text-[10px] font-semibold text-gray-400 font-display mt-0.5"
                  >⏱️ {{ userItem.elapsedTime }} min</span
                >
              </template>
              <template v-else>
                <div class="flex items-center space-x-1 text-xs text-gray-400 font-display">
                  <span>🥇{{ userItem.firstPlaces }}</span>
                  <span>🥈{{ userItem.secondPlaces }}</span>
                  <span>🥉{{ userItem.thirdPlaces }}</span>
                </div>
                <div class="text-[10px] font-black text-violet-400 font-display mt-0.5">
                  {{ userItem.score }} PTS
                </div>
              </template>
            </div>
            <div class="text-right flex flex-col items-end" v-else-if="currentTab === 'brainrun'">
              <span
                class="font-extrabold font-display"
                :class="userItem.isVictory ? 'text-emerald-400' : 'text-white'"
              >
                {{ brainrunFloorText(userItem) }}
              </span>
              <div class="text-[10px] font-bold text-gray-500 font-display mt-0.5">
                {{ brainrunSubText(userItem) }}
              </div>
            </div>

            <div
              class="w-12 text-right text-xs font-semibold text-gray-400"
              v-if="currentTab === 'general' && userItem.bestAscent"
            >
              ⛰️ {{ userItem.bestAscent }}
            </div>
          </div>
        </NuxtLink>
      </div>
      <div
        v-else-if="!activeUsers || activeUsers.length === 0"
        class="text-center py-12 text-gray-500 font-medium space-y-4 px-4"
      >
        <UIcon name="i-heroicons-sparkles" class="text-3xl text-gray-600 block mx-auto" />
        <p>{{ emptyRankingText }}</p>
        <UButton
          v-if="currentTab === 'friends'"
          to="/user/friends"
          color="primary"
          variant="soft"
          icon="i-heroicons-user-plus"
          class="font-bold uppercase tracking-wider font-display"
        >
          Ajouter des amis
        </UButton>
      </div>
    </UCard>

    <!-- Modales Calendriers (Mois / Année) -->
    <DailyMonthCalendarModal
      v-model:open="calendarMonthModalOpen"
      :selected-date="selectedDay"
      @select-date="(date) => (selectedDay = date)"
    />

    <DailyYearCalendarModal
      v-model:open="calendarYearModalOpen"
      :selected-month="selectedMonth"
      @select-month="(month) => (selectedMonth = month)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FriendRankingDTO } from "#shared/DTO/followDTO";
import type {
  DailySeriesRankingDTO,
  DailySeriesDayDTO,
  DailyTimelineItemDTO,
  MonthlyTimelineItemDTO,
} from "#shared/DTO/dailySeriesRankingDTO";
import DailyMonthCalendarModal from "~/components/ranking/DailyMonthCalendarModal.vue";
import DailyYearCalendarModal from "~/components/ranking/DailyYearCalendarModal.vue";
import { brainrunEruditionLabel } from "#shared/brainrunErudition";
import { formatDayLabel, formatMonthLabel, getDayKey, getMonthKey } from "#shared/dailySeason";

useSeoMeta({
  title: "Classements Généraux",
  ogTitle: "Classements des Joueurs - LazyCulture",
  description:
    "Découvrez les meilleurs compétiteurs de LazyCulture. Consultez les classements d'expérience (XP), Battle Royale, Showdown et défis quotidiens.",
  ogDescription:
    "Découvrez les meilleurs compétiteurs de LazyCulture. Consultez les classements d'expérience (XP), Battle Royale, Showdown et défis quotidiens.",
});

const route = useRoute();
const userStore = useUserStore();
const { authFetch } = useAuthFetch();

const currentTab = ref<"general" | "br" | "showdown" | "daily" | "brainrun" | "friends">(
  (route.query.tab as any) || "daily",
);
const dailyPeriod = ref<"day" | "monthly" | "alltime">((route.query.period as any) || "day");

// Modales calendriers
const calendarMonthModalOpen = ref(false);
const calendarYearModalOpen = ref(false);

// Lignes du temps Daily (7 jours) et Monthly (6 mois)
const { data: initialDailyTimeline } = await useFetch<DailyTimelineItemDTO[]>(
  "/api/ranking/daily-timeline",
);
const { data: initialMonthlyTimeline } = await useFetch<MonthlyTimelineItemDTO[]>(
  "/api/ranking/monthly-timeline",
);

const dailyTimeline = ref<DailyTimelineItemDTO[]>(initialDailyTimeline.value || []);
const monthlyTimeline = ref<MonthlyTimelineItemDTO[]>(initialMonthlyTimeline.value || []);

watch(initialDailyTimeline, (val) => {
  if (val) dailyTimeline.value = val;
});
watch(initialMonthlyTimeline, (val) => {
  if (val) monthlyTimeline.value = val;
});

async function refreshPersonalTimelines() {
  if (!userStore.isLoggedIn) return;
  try {
    const [dRes, mRes] = await Promise.all([
      authFetch<DailyTimelineItemDTO[]>("/api/ranking/daily-timeline"),
      authFetch<MonthlyTimelineItemDTO[]>("/api/ranking/monthly-timeline"),
    ]);
    if (dRes) dailyTimeline.value = dRes;
    if (mRes) monthlyTimeline.value = mRes;
  } catch (e) {
    console.error("Failed to load personal timelines:", e);
  }
}

// Défilement horizontal du ruban des modes (avec flèches au lieu de barre de défilement)
const ribbonContainer = ref<HTMLElement | null>(null);
const canScrollRibbonLeft = ref(false);
const canScrollRibbonRight = ref(false);
const hasRibbonOverflow = ref(false);
let ribbonResizeObserver: ResizeObserver | null = null;

function updateRibbonScroll() {
  const el = ribbonContainer.value;
  if (!el) return;
  const { scrollLeft, scrollWidth, clientWidth } = el;
  hasRibbonOverflow.value = scrollWidth > clientWidth + 4;
  canScrollRibbonLeft.value = hasRibbonOverflow.value && scrollLeft > 6;
  canScrollRibbonRight.value =
    hasRibbonOverflow.value && scrollLeft + clientWidth < scrollWidth - 6;
}

function scrollRibbon(direction: "left" | "right") {
  const el = ribbonContainer.value;
  if (!el) return;
  const delta = direction === "left" ? -180 : 180;
  el.scrollBy({ left: delta, behavior: "smooth" });
}

function selectTab(tabId: typeof currentTab.value, event?: MouseEvent) {
  currentTab.value = tabId;
  const btn = event?.currentTarget as HTMLElement | undefined;
  if (btn && ribbonContainer.value) {
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    refreshPersonalTimelines();
  }

  nextTick(() => {
    updateRibbonScroll();
    if (ribbonContainer.value && typeof ResizeObserver !== "undefined") {
      ribbonResizeObserver = new ResizeObserver(() => {
        updateRibbonScroll();
      });
      ribbonResizeObserver.observe(ribbonContainer.value);
    }
  });
});

onBeforeUnmount(() => {
  if (ribbonResizeObserver) {
    ribbonResizeObserver.disconnect();
  }
});

watch(
  () => userStore.user?.id,
  (id) => {
    if (id) refreshPersonalTimelines();
  },
);

const dailyTimelineChronological = computed(() => [...dailyTimeline.value].reverse());
const monthlyTimelineChronological = computed(() => [...monthlyTimeline.value].reverse());

// Onglets de navigation des modes
const modeTabs = computed(() => {
  const tabs = [
    { id: "daily" as const, label: "Quotidien", icon: "i-heroicons-calendar" },
    { id: "br" as const, label: "Battle Royale", icon: "i-heroicons-shield-check" },
    { id: "showdown" as const, label: "Showdown", icon: "i-heroicons-bolt" },
    { id: "general" as const, label: "XP", icon: "i-heroicons-sparkles" },
    { id: "brainrun" as const, label: "Brainrun", icon: "i-heroicons-fire" },
  ];
  if (userStore.isLoggedIn) {
    tabs.push({ id: "friends" as const, label: "Amis", icon: "i-heroicons-user-group" });
  }
  return tabs;
});

// Jours daily disponibles
const { data: dailyDays } = await useFetch<DailySeriesDayDTO[]>("/api/ranking/daily-days");
const availableDays = computed(() => dailyDays.value ?? []);

// Jour sélectionné : date passée en query ou le jour le plus récent disponible, sinon aujourd'hui
const selectedDay = ref<string>(
  (route.query.date as string) || dailyDays.value?.[0]?.date || getDayKey(),
);

// Si le fetch des jours se termine et qu'aucune date n'était en query, synchroniser sur le premier jour dispo
watch(
  dailyDays,
  (days) => {
    if (days && days.length > 0 && !route.query.date) {
      const firstDay = days[0];
      if (firstDay && !days.some((d) => d.date === selectedDay.value)) {
        selectedDay.value = firstDay.date;
      }
    }
  },
  { immediate: true },
);

const selectedDayObj = computed(() =>
  availableDays.value.find((d) => d.date === selectedDay.value),
);
const selectedDayIndex = computed(() =>
  availableDays.value.findIndex((d) => d.date === selectedDay.value),
);
const hasOlderDay = computed(
  () => selectedDayIndex.value >= 0 && selectedDayIndex.value < availableDays.value.length - 1,
);
const hasNewerDay = computed(() => selectedDayIndex.value > 0);

function goToPreviousDay() {
  const previous = availableDays.value[selectedDayIndex.value + 1];
  if (hasOlderDay.value && previous) selectedDay.value = previous.date;
}

function goToNextDay() {
  const next = availableDays.value[selectedDayIndex.value - 1];
  if (hasNewerDay.value && next) selectedDay.value = next.date;
}

const selectedDayLabel = computed(() =>
  formatDayLabel(selectedDay.value, selectedDayObj.value?.title),
);

// Saison mensuelle consultée : le mois en cours par défaut, navigable vers les mois précédents.
const selectedMonth = ref(getMonthKey());
const selectedMonthLabel = computed(() => formatMonthLabel(selectedMonth.value));

// Classement amis : chargé à la demande car il nécessite l'authentification
const friendsUsers = ref<FriendRankingDTO[]>([]);
const friendsLoaded = ref(false);

watch(currentTab, (tab) => {
  if (tab === "friends" && !friendsLoaded.value) {
    fetchFriendsRanking();
  }
});

async function fetchFriendsRanking() {
  try {
    friendsUsers.value = await authFetch<FriendRankingDTO[]>("/api/ranking/friends");
    friendsLoaded.value = true;
  } catch (e) {
    console.error("Failed to fetch friends ranking:", e);
  }
}

// Récupération des différents types de classements en parallèle
const { data: users } = await useFetch<any[]>("/api/ranking/top");
const { data: brUsers } = await useFetch<any[]>("/api/ranking/br");
const { data: showdownUsers } = await useFetch<any[]>("/api/ranking/showdown");
const { data: dailyDayUsers } = await useFetch<DailySeriesRankingDTO[]>(
  () => `/api/series/dailyRanking?date=${selectedDay.value}`,
);
const { data: dailyAlltimeUsers } = await useFetch<any[]>(
  "/api/ranking/daily-podium?period=alltime",
);
const { data: dailyMonthlyUsers } = await useFetch<any[]>(
  () => `/api/ranking/daily-podium?month=${selectedMonth.value}`,
);
const { data: dailyMonths } = await useFetch<string[]>("/api/ranking/daily-months");
const { data: brainrunUsers } = await useFetch<any[]>("/api/ranking/brainrun");

// Saisons disponibles, de la plus récente à la plus ancienne (l'API garantit le mois en cours).
const availableMonths = computed(() => dailyMonths.value ?? [selectedMonth.value]);
const selectedMonthIndex = computed(() => availableMonths.value.indexOf(selectedMonth.value));
const hasOlderMonth = computed(
  () =>
    selectedMonthIndex.value >= 0 && selectedMonthIndex.value < availableMonths.value.length - 1,
);
const hasNewerMonth = computed(() => selectedMonthIndex.value > 0);

function goToPreviousMonth() {
  const previous = availableMonths.value[selectedMonthIndex.value + 1];
  if (hasOlderMonth.value && previous) selectedMonth.value = previous;
}

function goToNextMonth() {
  const next = availableMonths.value[selectedMonthIndex.value - 1];
  if (hasNewerMonth.value && next) selectedMonth.value = next;
}

const emptyRankingText = computed(() => {
  if (currentTab.value === "friends") return "Suivez des joueurs pour les voir apparaître ici !";
  if (currentTab.value === "daily") {
    if (dailyPeriod.value === "day") return "Aucun joueur dans le classement pour ce jour.";
    if (dailyPeriod.value === "monthly")
      return `Aucun podium en ${selectedMonthLabel.value} pour le moment.`;
  }
  return "Aucun joueur dans ce classement pour le moment.";
});

const activeUsers = computed(() => {
  if (currentTab.value === "general") return users.value || [];
  if (currentTab.value === "br") return brUsers.value || [];
  if (currentTab.value === "showdown") return showdownUsers.value || [];
  if (currentTab.value === "brainrun") return brainrunUsers.value || [];
  if (currentTab.value === "daily") {
    if (dailyPeriod.value === "day") {
      return (dailyDayUsers.value || []).map((u) => ({
        ...u,
        name: u.userName,
        isMe: userStore.user?.id === u.userId,
      }));
    }
    return dailyPeriod.value === "alltime"
      ? dailyAlltimeUsers.value || []
      : dailyMonthlyUsers.value || [];
  }
  if (currentTab.value === "friends") return friendsUsers.value || [];
  return [];
});

/** Libellé de l'étage max atteint pour le classement Brainrun (« Victoire » ou « Acte X · Étage Y »). */
function brainrunFloorText(item: any): string {
  if (!item) return "";
  if (!item.isVictory) return `Acte ${item.bestAct} · Étage ${item.bestRow}`;
  return item.bestWonErudition > 0
    ? `🏆 Victoire · ${brainrunEruditionLabel(item.bestWonErudition)}`
    : "🏆 Victoire";
}

/** Sous-ligne : nombre de victoires pour les vainqueurs, sinon nombre de runs (critère de départage). */
function brainrunSubText(item: any): string {
  if (!item) return "";
  if (item.isVictory) {
    return `${item.victoryCount} ${item.victoryCount > 1 ? "victoires" : "victoire"}`;
  }
  return `${item.totalRuns} ${item.totalRuns > 1 ? "runs" : "run"}`;
}

const firstPlace = computed(() => activeUsers.value?.[0] || null);
const secondPlace = computed(() => activeUsers.value?.[1] || null);
const thirdPlace = computed(() => activeUsers.value?.[2] || null);
const remainingUsers = computed(() => activeUsers.value?.slice(3) || []);
</script>
