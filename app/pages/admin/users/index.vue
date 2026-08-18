<template>
  <div class="w-full max-w-6xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title & Action Row -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <NuxtLink
            to="/admin"
            class="text-xs font-bold font-display text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-left" class="text-sm" />
            Admin
          </NuxtLink>
          <span class="text-gray-600">/</span>
          <span class="text-xs font-bold font-display text-gray-400">Communauté</span>
        </div>
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          Gestion des Utilisateurs
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Supervisez la communauté, suivez l'activité des joueurs et les statistiques d'inscription.
        </p>
      </div>

      <div class="flex items-center space-x-3 self-start md:self-auto">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          class="font-bold font-display text-xs px-4 py-2"
          @click="() => refreshUsers()"
        >
          Actualiser
        </UButton>
      </div>
    </div>

    <!-- Quick Stats Grid (KPIs) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Users Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-violet-500/30 transition-all"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p
              class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
            >
              Total Joueurs
            </p>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20"
            >
              Base
            </span>
          </div>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-white font-display">
              {{ stats?.totalUsers ?? 0 }}
            </span>
          </div>
          <div class="flex items-center space-x-3 text-[11px] text-gray-400 pt-1">
            <span class="text-emerald-400 font-semibold">
              {{ stats?.namedUsersCount ?? 0 }} nommés
            </span>
            <span>•</span>
            <span class="text-amber-400 font-semibold"> {{ stats?.adminCount ?? 0 }} admins </span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xl text-violet-400 group-hover:scale-110 transition-transform"
          >
            👥
          </div>
        </div>
      </UCard>

      <!-- Inscriptions Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p
              class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
            >
              Nouveaux Inscrits
            </p>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            >
              +{{ stats?.newUsersToday ?? 0 }} auj.
            </span>
          </div>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-cyan-400 font-display">
              +{{ stats?.newUsers7d ?? 0 }}
            </span>
            <span class="text-xs text-gray-400 font-medium">sur 7j</span>
          </div>
          <div class="flex items-center space-x-2 text-[11px] text-gray-400 pt-1">
            <span>Sur 30 jours :</span>
            <span class="text-white font-bold">+{{ stats?.newUsers30d ?? 0 }}</span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-xl text-cyan-400 group-hover:scale-110 transition-transform"
          >
            ✨
          </div>
        </div>
      </UCard>

      <!-- Joueurs Actifs Aujourd'hui (DAU) Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p
              class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
            >
              Actifs Aujourd'hui
            </p>
            <span class="flex h-2 w-2 relative">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-emerald-400 font-display">
              {{ stats?.activeUsersToday ?? 0 }}
            </span>
            <span class="text-xs text-gray-400 font-medium">DAU</span>
          </div>
          <div class="text-[11px] text-gray-400 pt-1">
            <span>Taux du jour : </span>
            <span class="text-emerald-400 font-bold">
              {{
                stats?.totalUsers
                  ? Math.round(((stats.activeUsersToday ?? 0) / stats.totalUsers) * 100)
                  : 0
              }}%
            </span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 group-hover:scale-110 transition-transform"
          >
            ⚡
          </div>
        </div>
      </UCard>

      <!-- Actifs 7j & 30j (WAU & MAU) Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p
              class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
            >
              Joueurs Actifs (WAU/MAU)
            </p>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
            >
              Activité
            </span>
          </div>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-indigo-400 font-display">
              {{ stats?.activeUsers7d ?? 0 }}
            </span>
            <span class="text-xs text-gray-400 font-medium">sur 7j</span>
          </div>
          <div class="flex items-center space-x-2 text-[11px] text-gray-400 pt-1">
            <span>Sur 30 jours (MAU) :</span>
            <span class="text-white font-bold">{{ stats?.activeUsers30d ?? 0 }}</span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xl text-indigo-400 group-hover:scale-110 transition-transform"
          >
            🔥
          </div>
        </div>
      </UCard>
    </div>

    <!-- 14-Day Activity & Registrations Chart Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6"
    >
      <div class="space-y-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4"
        >
          <div>
            <h3 class="text-base font-black font-display text-white flex items-center gap-2">
              <UIcon name="i-heroicons-chart-bar" class="text-violet-400 text-lg" />
              Tendance des 14 derniers jours
            </h3>
            <p class="text-xs text-gray-400 font-medium">
              Visualisez le flux quotidien des nouveaux joueurs et l'engagement de la communauté.
            </p>
          </div>

          <!-- Chart Mode Switcher -->
          <div class="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all"
              :class="
                chartMode === 'registrations'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white'
              "
              @click="chartMode = 'registrations'"
            >
              Inscriptions
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all"
              :class="
                chartMode === 'activity'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              "
              @click="chartMode = 'activity'"
            >
              Joueurs Actifs
            </button>
          </div>
        </div>

        <!-- Visual Bar Chart -->
        <div class="pt-4">
          <div class="h-44 flex items-end justify-between gap-1.5 sm:gap-2 px-1 sm:px-2">
            <div
              v-for="item in currentTrendList"
              :key="item.dateStr"
              class="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              <!-- Tooltip popup on hover -->
              <div
                class="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-900 border border-white/15 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-xl whitespace-nowrap"
              >
                <div class="text-center">{{ item.dayLabel }}</div>
                <div
                  :class="chartMode === 'registrations' ? 'text-cyan-400' : 'text-emerald-400'"
                  class="font-black text-center"
                >
                  {{ item.count }} {{ chartMode === "registrations" ? "inscrits" : "actifs" }}
                </div>
              </div>

              <!-- Bar -->
              <div
                class="w-full max-w-[28px] rounded-t-lg transition-all duration-300 relative overflow-hidden"
                :class="
                  chartMode === 'registrations'
                    ? item.count > 0
                      ? 'bg-gradient-to-t from-cyan-600/60 to-cyan-400 group-hover:to-cyan-300'
                      : 'bg-white/5'
                    : item.count > 0
                      ? 'bg-gradient-to-t from-emerald-600/60 to-emerald-400 group-hover:to-emerald-300'
                      : 'bg-white/5'
                "
                :style="{
                  height: `${getBarHeightPercentage(item.count)}%`,
                  minHeight: '6px',
                }"
              >
                <div
                  v-if="item.count > 0"
                  class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                ></div>
              </div>

              <!-- Count on top if space permits -->
              <span
                v-if="item.count > 0"
                class="text-[9px] font-black font-display text-gray-300 mb-1 opacity-80"
              >
                {{ item.count }}
              </span>

              <!-- Label X-Axis -->
              <span
                class="text-[9px] sm:text-[10px] text-gray-500 font-semibold font-display truncate w-full text-center mt-2 group-hover:text-gray-300 transition-colors"
              >
                {{ item.dayLabel.split(" ")[0] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Filters & Search Bar Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        <!-- Search Input -->
        <div>
          <UFormField
            label="Recherche joueur"
            :ui="{
              label: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
            }"
          >
            <UInput
              v-model="searchQuery"
              placeholder="Pseudo, slug ou ID..."
              icon="i-heroicons-magnifying-glass"
              class="w-full"
              :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Activity Filter -->
        <div>
          <UFormField
            label="Filtrer par activité"
            :ui="{
              label: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
            }"
          >
            <USelect
              v-model="selectedFilter"
              :items="filterOptions"
              class="w-full"
              :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Sort Filter -->
        <div>
          <UFormField
            label="Trier par"
            :ui="{
              label: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
            }"
          >
            <USelect
              v-model="selectedSort"
              :items="sortOptions"
              class="w-full"
              :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Result count & reset -->
        <div class="flex items-end justify-between sm:justify-end gap-3 pt-2 sm:pt-4">
          <div class="text-right">
            <p class="text-[10px] text-gray-500 uppercase tracking-widest font-display">
              Résultats
            </p>
            <p class="text-sm font-black text-violet-300 font-display">
              {{ total }} {{ total > 1 ? "joueurs" : "joueur" }}
            </p>
          </div>
          <UButton
            v-if="searchQuery || selectedFilter !== 'all' || selectedSort !== 'createDate_desc'"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-x-mark"
            class="text-gray-400 hover:text-white"
            @click="resetFilters"
          >
            Réinitialiser
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Users Table Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      :ui="{ body: 'p-0' }"
    >
      <div class="overflow-x-auto min-h-[300px]">
        <div v-if="pending" class="flex flex-col items-center justify-center h-64 space-y-3">
          <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-violet-400" />
          <p class="text-xs text-gray-400 font-medium font-display">
            Chargement des utilisateurs...
          </p>
        </div>

        <div
          v-else-if="!users || users.length === 0"
          class="flex flex-col items-center justify-center h-64 space-y-2"
        >
          <span class="text-4xl">🔍</span>
          <p class="text-sm text-gray-400 font-bold font-display">Aucun utilisateur trouvé</p>
          <p class="text-xs text-gray-500 font-medium">
            Essayez de modifier votre terme de recherche ou vos filtres.
          </p>
        </div>

        <table v-else class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-white/10 bg-white/5 text-gray-400 font-display font-bold text-xs uppercase tracking-wider"
            >
              <th class="px-6 py-4">Joueur</th>
              <th class="px-6 py-4 text-center">Niveau & XP</th>
              <th class="px-6 py-4 text-center">Pièces & Streak</th>
              <th class="px-6 py-4 text-center">Activité de jeu</th>
              <th class="px-6 py-4">Dernière activité</th>
              <th class="px-6 py-4">Inscription</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-gray-300">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-white/5 transition-colors group"
            >
              <!-- User Profile & Avatar -->
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <UserAvatar
                    :src="user.avatarUrl"
                    :frame="user.frameStyleKey"
                    :alt="user.name"
                    size="md"
                  />
                  <div class="min-w-0">
                    <div class="flex items-center space-x-2">
                      <NuxtLink
                        :to="user.slug ? `/user/${user.slug}` : `/user/${user.id}`"
                        class="font-black font-display text-white group-hover:text-violet-300 transition-colors truncate hover:underline"
                      >
                        {{ user.name || "Joueur Anonyme" }}
                      </NuxtLink>
                      <span
                        v-if="user.admin"
                        class="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0"
                        title="Administrateur"
                      >
                        👑 Admin
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 font-mono truncate max-w-[160px]">
                      {{ user.slug ? `@${user.slug}` : user.id.slice(0, 12) + "..." }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Level & XP -->
              <td class="px-6 py-4 text-center">
                <div class="inline-flex flex-col items-center">
                  <span
                    class="text-xs font-black font-display px-2.5 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300"
                  >
                    Niv. {{ user.level }}
                  </span>
                  <span class="text-[10px] text-gray-500 font-semibold font-display mt-0.5">
                    {{ user.xp }} XP
                  </span>
                </div>
              </td>

              <!-- Coins & Streak -->
              <td class="px-6 py-4 text-center">
                <div
                  class="flex items-center justify-center space-x-3 text-xs font-bold font-display"
                >
                  <span class="text-amber-300 flex items-center gap-1"> 🪙 {{ user.coins }} </span>
                  <span
                    class="flex items-center gap-1"
                    :class="user.activityStreak > 0 ? 'text-orange-400' : 'text-gray-500'"
                  >
                    🔥 {{ user.activityStreak }}j
                  </span>
                </div>
              </td>

              <!-- Game Activity Summary -->
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2 text-xs">
                  <span
                    class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold font-display text-[11px]"
                    title="Questions répondues"
                  >
                    ❓ {{ user.stats?.responsesCount ?? 0 }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold font-display text-[11px]"
                    title="Duels PvP (BR & Showdown)"
                  >
                    ⚔️
                    {{
                      (user.stats?.brMatchesCount ?? 0) + (user.stats?.showdownMatchesCount ?? 0)
                    }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold font-display text-[11px]"
                    title="Runs Brainrun"
                  >
                    🧠 {{ user.stats?.brainrunRunsCount ?? 0 }}
                  </span>
                </div>
              </td>

              <!-- Last Active Date -->
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="
                      user.isActiveToday
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : user.isActive7d
                          ? 'bg-emerald-600/70'
                          : 'bg-gray-600'
                    "
                  ></span>
                  <div>
                    <p
                      class="text-xs font-bold font-display"
                      :class="user.isActiveToday ? 'text-emerald-400' : 'text-gray-300'"
                    >
                      {{ formatLastActive(user.lastActivityDate) }}
                    </p>
                    <p v-if="user.isActiveToday" class="text-[10px] text-emerald-500 font-medium">
                      Actif aujourd'hui
                    </p>
                  </div>
                </div>
              </td>

              <!-- Registration Date -->
              <td class="px-6 py-4 text-xs text-gray-400 font-medium">
                {{ formatDate(user.createDate) }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                <!-- View Public Profile -->
                <UButton
                  :to="user.slug ? `/user/${user.slug}` : `/user/${user.id}`"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-arrow-top-right-on-square"
                  size="xs"
                  class="hover:bg-violet-600/20 hover:text-violet-400 rounded-lg"
                  title="Voir le profil public"
                />

                <!-- Inspect Player Modal Trigger -->
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-information-circle"
                  size="xs"
                  class="hover:bg-white/10 hover:text-white rounded-lg"
                  title="Inspecter le joueur"
                  @click="openInspectModal(user)"
                />

                <!-- Toggle Admin Role -->
                <UButton
                  :color="user.admin ? 'warning' : 'neutral'"
                  variant="ghost"
                  :icon="user.admin ? 'i-heroicons-shield-exclamation' : 'i-heroicons-shield-check'"
                  size="xs"
                  class="hover:bg-amber-600/20 hover:text-amber-400 rounded-lg"
                  :title="user.admin ? 'Révoquer rôle admin' : 'Promouvoir administrateur'"
                  @click="confirmToggleAdmin(user)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <template v-if="total > limit" #footer>
        <div
          class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-white/5 w-full"
        >
          <span class="text-xs text-gray-400 font-medium font-display">
            Affichage de {{ (page - 1) * limit + 1 }} à {{ Math.min(page * limit, total) }} sur
            {{ total }} joueurs
          </span>
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="limit"
            show-edges
            :sibling-count="1"
            color="neutral"
            active-color="primary"
          />
        </div>
      </template>
    </UCard>

    <!-- Modal d'inspection détaillée du joueur -->
    <UModal
      title="Détails du Joueur"
      description="Informations approfondies et historique de jeu."
      v-model:open="inspectModalOpen"
      :ui="{
        content:
          'sm:max-w-lg bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
      }"
    >
      <template #body>
        <div v-if="inspectedUser" class="space-y-6">
          <!-- Profile Card -->
          <div class="flex items-center space-x-4 bg-white/5 border border-white/10 p-4 rounded-xl">
            <UserAvatar
              :src="inspectedUser.avatarUrl"
              :frame="inspectedUser.frameStyleKey"
              :alt="inspectedUser.name"
              size="lg"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-2">
                <h4 class="text-lg font-black font-display text-white truncate">
                  {{ inspectedUser.name || "Joueur Anonyme" }}
                </h4>
                <span
                  v-if="inspectedUser.admin"
                  class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400"
                >
                  👑 Admin
                </span>
              </div>
              <p class="text-xs text-violet-400 font-mono">
                {{ inspectedUser.slug ? `@${inspectedUser.slug}` : "Aucun slug" }}
              </p>
              <p class="text-[10px] text-gray-500 font-mono mt-0.5 truncate select-all">
                ID: {{ inspectedUser.id }}
              </p>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Niveau</p>
              <p class="text-lg font-black text-violet-300 font-display">
                Niv. {{ inspectedUser.level }}
              </p>
              <p class="text-[10px] text-gray-500">{{ inspectedUser.xp }} XP</p>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Pièces</p>
              <p class="text-lg font-black text-amber-300 font-display">
                🪙 {{ inspectedUser.coins }}
              </p>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Série Active</p>
              <p class="text-lg font-black text-orange-400 font-display">
                🔥 {{ inspectedUser.activityStreak }} jours
              </p>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Quiz Joués</p>
              <p class="text-lg font-black text-white font-display">
                ❓ {{ inspectedUser.stats?.responsesCount ?? 0 }}
              </p>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Duels PvP</p>
              <p class="text-lg font-black text-white font-display">
                ⚔️
                {{
                  (inspectedUser.stats?.brMatchesCount ?? 0) +
                  (inspectedUser.stats?.showdownMatchesCount ?? 0)
                }}
              </p>
            </div>
            <div class="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <p class="text-[10px] text-gray-400 font-bold uppercase font-display">Brainrun</p>
              <p class="text-lg font-black text-white font-display">
                🧠 {{ inspectedUser.stats?.brainrunRunsCount ?? 0 }}
              </p>
            </div>
          </div>

          <!-- Dates & Activity info -->
          <div class="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-400">Date d'inscription :</span>
              <span class="font-bold text-gray-200">{{
                formatFullDate(inspectedUser.createDate)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Dernière activité enregistrée :</span>
              <span class="font-bold text-gray-200">
                {{ formatLastActive(inspectedUser.lastActivityDate) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Statut d'activité :</span>
              <span
                class="font-bold"
                :class="
                  inspectedUser.isActiveToday
                    ? 'text-emerald-400'
                    : inspectedUser.isActive7d
                      ? 'text-emerald-500'
                      : 'text-gray-500'
                "
              >
                {{
                  inspectedUser.isActiveToday
                    ? "Actif aujourd'hui"
                    : inspectedUser.isActive7d
                      ? "Actif ces 7 derniers jours"
                      : "Inactif (> 7j)"
                }}
              </span>
            </div>
          </div>

          <!-- Action buttons inside modal -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              :to="inspectedUser.slug ? `/user/${inspectedUser.slug}` : `/user/${inspectedUser.id}`"
              color="primary"
              variant="solid"
              icon="i-heroicons-arrow-top-right-on-square"
              class="font-bold font-display text-xs"
            >
              Consulter Profil Public
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation changement de rôle admin -->
    <UModal
      :title="targetAdminUser?.admin ? 'Révoquer les droits admin' : 'Promouvoir Administrateur'"
      :description="
        targetAdminUser?.admin
          ? `Êtes-vous sûr de vouloir révoquer les droits administrateur pour ${targetAdminUser?.name || 'cet utilisateur'} ?`
          : `Êtes-vous sûr de vouloir accorder les pleins droits administrateur à ${targetAdminUser?.name || 'cet utilisateur'} ?`
      "
      v-model:open="adminConfirmModalOpen"
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
      }"
    >
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            class="font-bold font-display text-xs"
            @click="adminConfirmModalOpen = false"
          >
            Annuler
          </UButton>
          <UButton
            :color="targetAdminUser?.admin ? 'error' : 'primary'"
            variant="solid"
            :loading="togglingAdmin"
            class="font-bold font-display text-xs"
            @click="executeToggleAdmin"
          >
            Confirmer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type {
  AdminUserItemDTO,
  AdminUserListResponseDTO,
  DailyTrendItem,
} from "#shared/DTO/adminUserDTO";

definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const searchQuery = ref("");
const selectedFilter = ref("all");
const selectedSort = ref("createDate_desc");
const page = ref(1);
const limit = 20;

const chartMode = ref<"registrations" | "activity">("registrations");

const filterOptions = [
  { label: "Tous les utilisateurs", value: "all" },
  { label: "Actifs aujourd'hui", value: "active_today" },
  { label: "Actifs cette semaine (7j)", value: "active_7d" },
  { label: "Inactifs (> 7j)", value: "inactive" },
  { label: "Administrateurs", value: "admin" },
];

const sortOptions = [
  { label: "Date d'inscription (récents)", value: "createDate_desc" },
  { label: "Date d'inscription (anciens)", value: "createDate_asc" },
  { label: "Dernière activité", value: "lastActive_desc" },
  { label: "Niveau & XP", value: "xp_desc" },
  { label: "Solde de pièces", value: "coins_desc" },
  { label: "Série active (Streak)", value: "streak_desc" },
  { label: "Nom alphabétique (A-Z)", value: "name_asc" },
];

// Modal states
const inspectModalOpen = ref(false);
const inspectedUser = ref<AdminUserItemDTO | null>(null);

const adminConfirmModalOpen = ref(false);
const targetAdminUser = ref<AdminUserItemDTO | null>(null);
const togglingAdmin = ref(false);

// Query params for fetch
const queryParams = computed(() => ({
  page: page.value,
  limit,
  search: searchQuery.value,
  filter: selectedFilter.value,
  sort: selectedSort.value,
}));

// Fetch dataset
const {
  data: responseData,
  pending,
  refresh: refreshUsers,
} = await useFetch<AdminUserListResponseDTO>("/api/admin/users", {
  query: queryParams,
  watch: [queryParams],
});

const users = computed(() => responseData.value?.users ?? []);
const total = computed(() => responseData.value?.total ?? 0);
const stats = computed(() => responseData.value?.stats);

// Trends for chart
const currentTrendList = computed<DailyTrendItem[]>(() => {
  if (chartMode.value === "registrations") {
    return stats.value?.dailyRegistrations ?? [];
  }
  return stats.value?.dailyActiveUsers ?? [];
});

const maxTrendCount = computed(() => {
  const max = Math.max(...currentTrendList.value.map((i) => i.count), 1);
  return max;
});

function getBarHeightPercentage(count: number): number {
  if (count <= 0) return 4;
  return Math.max(8, Math.round((count / maxTrendCount.value) * 100));
}

// Reset page when filter or search changes
watch([searchQuery, selectedFilter, selectedSort], () => {
  page.value = 1;
});

function resetFilters() {
  searchQuery.value = "";
  selectedFilter.value = "all";
  selectedSort.value = "createDate_desc";
  page.value = 1;
}

function openInspectModal(user: AdminUserItemDTO) {
  inspectedUser.value = user;
  inspectModalOpen.value = true;
}

function confirmToggleAdmin(user: AdminUserItemDTO) {
  targetAdminUser.value = user;
  adminConfirmModalOpen.value = true;
}

async function executeToggleAdmin() {
  if (!targetAdminUser.value) return;

  try {
    togglingAdmin.value = true;
    await $fetch(`/api/admin/users/${targetAdminUser.value.id}/toggle-admin`, {
      method: "post",
    });
    adminConfirmModalOpen.value = false;
    await refreshUsers();
  } catch (error: any) {
    alert(error?.data?.statusMessage || "Erreur lors de la modification des droits admin.");
  } finally {
    togglingAdmin.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFullDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastActive(dateStr: string | null) {
  if (!dateStr) return "Inactif";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
</script>
