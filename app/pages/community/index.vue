<template>
  <div class="w-full max-w-5xl mx-auto py-4 px-3 sm:py-6 sm:px-4 space-y-6 select-none">
    <!-- Header Title Banner -->
    <div
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/60 backdrop-blur-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-glass"
    >
      <div class="space-y-2 relative z-10">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-400 text-xs font-bold font-display uppercase tracking-widest"
        >
          <span>🏛️ Espace Communautaire</span>
        </div>
        <h1
          class="text-2xl sm:text-3xl md:text-4xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          L'Atelier du Savoir
        </h1>
        <p class="text-xs sm:text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
          Enrichissez la base de questions de Lazyculture. Proposez vos propres créations (Niv. 5+)
          et touchez <strong class="text-amber-400 font-bold">1 PO</strong> à chaque fois qu'un
          joueur répond à votre question en jeu !
        </p>
      </div>

      <!-- Trust Badge & Link to Relecture -->
      <div
        v-if="user && myData?.authorTrust"
        class="relative z-10 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div
          class="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2 shadow-inner min-w-[220px]"
        >
          <p class="text-[10px] uppercase font-bold text-gray-500 font-display tracking-wider">
            Votre Réputation
          </p>
          <CommunityContributorTrustBadge :trust="myData.authorTrust" show-details size="md" />
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold font-display text-xs sm:text-sm tracking-wide transition-all shrink-0"
          :class="[
            currentTab === tab.id
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-neon'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent',
          ]"
          @click="currentTab = tab.id"
        >
          <UIcon :name="tab.icon" class="text-base" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <UButton
        to="/community/review"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-heroicons-scale"
        class="font-bold font-display hidden sm:inline-flex"
      >
        Arène de Relecture
      </UButton>
    </div>

    <!-- TAB 1: CRÉER UNE QUESTION -->
    <div v-if="currentTab === 'create'" class="space-y-6">
      <!-- Verrouillage si Niveau < 5 (sauf Admin) -->
      <div
        v-if="userLevel < 5 && !userProfile?.admin"
        class="p-8 rounded-3xl bg-slate-900/50 border border-white/10 text-center space-y-4 max-w-xl mx-auto backdrop-blur-xl"
      >
        <div
          class="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto text-violet-400"
        >
          🔒
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-black font-display text-white">
            Niveau 5 requis pour créer une question
          </h3>
          <p class="text-xs text-gray-400 font-medium leading-relaxed">
            Vous êtes actuellement
            <span class="text-violet-400 font-bold">Niveau {{ userLevel }}</span
            >. Jouez en Solo, Série Quotidienne ou Multijoueur pour progresser et débloquer la
            création de questions.
          </p>
        </div>
        <UButton to="/solo" color="primary" class="font-bold font-display" icon="i-heroicons-play">
          Faire des parties
        </UButton>
      </div>

      <!-- Formulaire de création (Niveau >= 5 ou Admin) -->
      <div
        v-else
        class="max-w-3xl mx-auto bg-[#111827]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 space-y-6 shadow-glass"
      >
        <div
          class="border-b border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div>
            <h3
              class="text-base sm:text-lg font-black font-display text-white flex items-center gap-2"
            >
              <UIcon name="i-heroicons-pencil-square" class="text-violet-400" />
              <span>Rédiger une nouvelle question</span>
            </h3>
            <p class="text-xs text-gray-400 font-medium mt-0.5">
              Soignez l'orthographe et la clarté. Elle sera soumise à 3 relecteurs de la communauté.
            </p>
          </div>
          <div
            class="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1 font-display"
          >
            <span>🪙 1 PO par réponse reçue</span>
          </div>
        </div>

        <form class="space-y-5" @submit.prevent="submitQuestion">
          <!-- 1. Libelle Question -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center text-xs font-bold font-display">
              <label class="text-gray-300"
                >Intitulé de la question <span class="text-rose-400">*</span></label
              >
              <span :class="form.libelle.length > 250 ? 'text-amber-400' : 'text-gray-500'">
                {{ form.libelle.length }} / 300
              </span>
            </div>
            <UInput
              v-model="form.libelle"
              placeholder="ex: Quel célèbre peintre a peint 'La Nuit étoilée' ?"
              size="lg"
              maxlength="300"
              class="w-full"
            />
          </div>

          <!-- 2. Image d'illustration (Après l'intitulé) -->
          <div class="space-y-2 p-4 rounded-2xl bg-slate-950/40 border border-white/5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold font-display text-gray-300 flex items-center gap-1.5">
                <UIcon name="i-heroicons-photo" class="text-violet-400" />
                <span
                  >Image d'illustration
                  <span class="text-gray-500 font-normal">(optionnelle)</span></span
                >
              </label>

              <!-- Upload mode switch -->
              <div class="flex items-center gap-1 text-[11px] font-bold font-display">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg transition-colors"
                  :class="
                    imageMode === 'upload'
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                      : 'text-gray-400 hover:text-white'
                  "
                  @click="imageMode = 'upload'"
                >
                  Téléverser
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg transition-colors"
                  :class="
                    imageMode === 'url'
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                      : 'text-gray-400 hover:text-white'
                  "
                  @click="imageMode = 'url'"
                >
                  Lien URL
                </button>
              </div>
            </div>

            <!-- Upload File Input -->
            <div v-if="imageMode === 'upload' && !form.img" class="space-y-2">
              <div
                class="border-2 border-dashed border-white/10 hover:border-violet-500/40 rounded-xl p-4 text-center cursor-pointer transition-all group bg-slate-900/30"
                @click="triggerFileInput"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  class="hidden"
                  @change="handleFileUpload"
                />
                <div class="flex flex-col items-center gap-1.5">
                  <UIcon
                    :name="uploadingImage ? 'i-heroicons-arrow-path' : 'i-heroicons-cloud-arrow-up'"
                    class="text-2xl text-gray-400 group-hover:text-violet-400 transition-colors"
                    :class="{ 'animate-spin text-violet-400': uploadingImage }"
                  />
                  <p class="text-xs font-bold text-gray-300 font-display">
                    {{
                      uploadingImage
                        ? "Téléversement en cours..."
                        : "Cliquez pour choisir une image (PNG, JPEG, WebP, max 3 Mo)"
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Direct URL Input -->
            <div v-else-if="imageMode === 'url' && !form.img" class="space-y-1">
              <UInput
                v-model="form.img"
                placeholder="https://exemple.com/image.jpg"
                size="md"
                class="w-full"
              />
            </div>

            <!-- Image Preview & Remove action -->
            <div
              v-if="form.img"
              class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-white/10"
            >
              <div
                class="w-16 h-16 rounded-lg overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center"
              >
                <img
                  :src="form.img"
                  alt="Aperçu image question"
                  class="w-full h-full object-contain"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-white font-display truncate">Image associée</p>
                <p class="text-[10px] text-gray-400 truncate">{{ form.img }}</p>
              </div>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                class="shrink-0"
                @click="form.img = ''"
              >
                Supprimer
              </UButton>
            </div>
          </div>

          <!-- 3. 4 Propositions (avec sélection radio de la bonne réponse) -->
          <div class="space-y-2 pt-1">
            <div class="flex justify-between items-center text-xs font-bold font-display">
              <label class="text-gray-300"
                >4 Propositions de réponse <span class="text-rose-400">*</span></label
              >
              <span class="text-[11px] text-emerald-400 font-medium">Cochez la bonne réponse</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="(prop, index) in form.propositions"
                :key="prop.id"
                class="flex items-center gap-2 p-2.5 rounded-2xl border transition-all"
                :class="[
                  form.response === prop.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-neon-green'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/15',
                ]"
              >
                <button
                  type="button"
                  class="w-8 h-8 rounded-xl flex items-center justify-center font-black font-display text-xs shrink-0 transition-transform active:scale-95"
                  :class="[
                    form.response === prop.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-white/5 text-gray-400 hover:text-white',
                  ]"
                  @click="form.response = prop.id"
                >
                  <UIcon
                    v-if="form.response === prop.id"
                    name="i-heroicons-check"
                    class="text-base"
                  />
                  <span v-else>{{ ["A", "B", "C", "D"][index] }}</span>
                </button>

                <input
                  v-model="prop.value"
                  type="text"
                  :placeholder="`Proposition ${['A', 'B', 'C', 'D'][index]}...`"
                  class="bg-transparent text-sm text-white focus:outline-none flex-1 font-medium placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <!-- 4. Thème & Difficulté -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <!-- Thèmes -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold font-display text-gray-300"
                >Thème principal <span class="text-rose-400">*</span></label
              >
              <USelectMenu
                v-model="selectedTheme"
                :items="themeOptions"
                label-key="name"
                value-key="slug"
                placeholder="Sélectionner un thème"
                size="md"
                class="w-full"
              />
            </div>

            <!-- Difficulté -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold font-display text-gray-300"
                >Difficulté estimée (1 à 5)</label
              >
              <div class="flex items-center gap-1.5 pt-1">
                <button
                  v-for="d in 5"
                  :key="d"
                  type="button"
                  class="flex-1 py-1.5 rounded-xl font-black font-display text-xs border transition-all"
                  :class="[
                    form.difficulty === d
                      ? 'bg-violet-600 text-white border-violet-400 shadow-neon scale-105'
                      : 'bg-slate-950/40 text-gray-400 border-white/5 hover:border-white/20',
                  ]"
                  @click="form.difficulty = d"
                >
                  {{ d }} ⭐
                </button>
              </div>
            </div>
          </div>

          <!-- 5. Explication / Anecdote -->
          <div class="space-y-1.5 pt-1">
            <label class="text-xs font-bold font-display text-gray-300">
              Explication / Anecdote
              <span class="text-gray-500 font-normal">(affichée après réponse)</span>
            </label>
            <UTextarea
              v-model="form.commentaire"
              placeholder="ex: Vincent van Gogh a peint cette œuvre en juin 1889 depuis sa chambre de l'asile de Saint-Paul-de-Mausole."
              :rows="2"
              class="w-full"
            />
          </div>

          <!-- 6. Source -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold font-display text-gray-300">
              Source / Référence
              <span class="text-gray-500 font-normal"
                >(lien URL ou référence pour les relecteurs)</span
              >
            </label>
            <UInput
              v-model="form.source"
              placeholder="https://fr.wikipedia.org/wiki/La_Nuit_%C3%A9toil%C3%A9e_(1889)"
              size="md"
              class="w-full"
            />
          </div>

          <!-- Submit Button -->
          <div class="pt-3">
            <UButton
              type="submit"
              color="primary"
              size="lg"
              block
              :loading="submitting"
              :disabled="!isFormValid"
              class="font-black font-display uppercase tracking-wider py-3 shadow-neon"
            >
              🚀 Soumettre à la relecture
            </UButton>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB 2: MES CONTRIBUTIONS (FORMAT DATA GRID) -->
    <div v-if="currentTab === 'submissions'" class="space-y-6">
      <!-- Summary stats bar -->
      <div v-if="myData" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-4 rounded-2xl bg-[#111827]/50 border border-white/10 space-y-1">
          <p class="text-[10px] uppercase font-bold text-gray-500 font-display">Total Soumises</p>
          <p class="text-2xl font-black text-white font-display">{{ myData.submissions.length }}</p>
        </div>
        <div class="p-4 rounded-2xl bg-[#111827]/50 border border-white/10 space-y-1">
          <p class="text-[10px] uppercase font-bold text-gray-500 font-display">Validées en Jeu</p>
          <p class="text-2xl font-black text-emerald-400 font-display">
            {{ myData.submissions.filter((s) => s.status === "APPROVED").length }}
          </p>
        </div>
        <div class="p-4 rounded-2xl bg-[#111827]/50 border border-white/10 space-y-1">
          <p class="text-[10px] uppercase font-bold text-gray-500 font-display">En Attente</p>
          <p class="text-2xl font-black text-amber-400 font-display">
            {{ myData.submissions.filter((s) => s.status === "PENDING").length }}
          </p>
        </div>
        <div class="p-4 rounded-2xl bg-[#111827]/50 border border-white/10 space-y-1">
          <p class="text-[10px] uppercase font-bold text-gray-500 font-display">
            Total Pièces Gagnées
          </p>
          <p class="text-2xl font-black text-amber-400 font-display flex items-center gap-1">
            <span>{{ myData.authorTrust?.totalRoyaltiesEarned || 0 }}</span>
            <span class="text-base">🪙</span>
          </p>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div
        v-if="myData && myData.submissions.length > 0"
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111827]/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl"
      >
        <!-- Status Filter Buttons -->
        <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            v-for="filter in statusFilterOptions"
            :key="filter.id"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              selectedStatusFilter === filter.id
                ? 'bg-violet-600 text-white shadow-neon'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            ]"
            @click="selectedStatusFilter = filter.id"
          >
            <span>{{ filter.label }}</span>
            <span
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="
                selectedStatusFilter === filter.id
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-400'
              "
            >
              {{ filter.count }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="w-full sm:w-64">
          <UInput
            v-model="searchQuerySubmissions"
            placeholder="Filtrer par intitulé ou thème..."
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-full"
          />
        </div>
      </div>

      <!-- Submissions Loading -->
      <div v-if="loadingSubmissions" class="text-center py-12 text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin mx-auto mb-2" />
        <p class="text-xs">Chargement de vos questions...</p>
      </div>

      <!-- Empty State (No submissions yet) -->
      <div
        v-else-if="!myData || myData.submissions.length === 0"
        class="p-12 text-center bg-[#111827]/30 border border-white/10 rounded-3xl space-y-3"
      >
        <div class="text-3xl">✍️</div>
        <h4 class="text-base font-bold font-display text-white">
          Vous n'avez pas encore proposé de question
        </h4>
        <p class="text-xs text-gray-400 max-w-sm mx-auto">
          Rejoignez les créateurs de Lazyculture et gagnez des pièces à chaque partie jouée par la
          communauté.
        </p>
        <UButton
          color="primary"
          size="sm"
          class="font-bold font-display"
          @click="currentTab = 'create'"
        >
          Proposer ma première question
        </UButton>
      </div>

      <!-- Empty Filtered Results -->
      <div
        v-else-if="filteredSubmissions.length === 0"
        class="p-12 text-center bg-[#111827]/30 border border-white/10 rounded-3xl space-y-2"
      >
        <p class="text-sm font-bold font-display text-white">
          Aucune question ne correspond à votre filtre
        </p>
        <p class="text-xs text-gray-400">Modifiez votre recherche ou réinitialisez les filtres.</p>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          @click="
            searchQuerySubmissions = '';
            selectedStatusFilter = 'ALL';
          "
        >
          Réinitialiser
        </UButton>
      </div>

      <!-- DATA GRID TABLE -->
      <div
        v-else
        class="overflow-x-auto rounded-3xl border border-white/10 bg-[#111827]/60 backdrop-blur-xl shadow-glass"
      >
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              class="border-b border-white/10 bg-slate-950/40 text-gray-400 uppercase font-display font-black text-[10px] tracking-wider"
            >
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 min-w-[280px]">Question & Thème</th>
              <th class="py-3.5 px-4 text-center">Difficulté</th>
              <th class="py-3.5 px-4 text-center">Votes</th>
              <th class="py-3.5 px-4 text-center">Gains & Réponses</th>
              <th class="py-3.5 px-4">Date</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 font-medium">
            <tr
              v-for="sub in filteredSubmissions"
              :key="sub.id"
              class="hover:bg-white/5 transition-colors cursor-pointer group"
              @click="openDetailModal(sub)"
            >
              <!-- Statut -->
              <td class="py-3.5 px-4 shrink-0 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black font-display uppercase tracking-wider"
                  :class="[
                    sub.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : sub.status === 'REJECTED'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
                  ]"
                >
                  {{
                    sub.status === "APPROVED"
                      ? "🟢 Validée"
                      : sub.status === "REJECTED"
                        ? "🔴 Refusée"
                        : "🟡 En attente"
                  }}
                </span>
              </td>

              <!-- Question & Thème -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div
                    v-if="sub.data.img"
                    class="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center"
                  >
                    <img :src="sub.data.img" alt="Miniature" class="w-full h-full object-cover" />
                  </div>
                  <div class="min-w-0 flex-1 space-y-1">
                    <p
                      class="font-bold text-white text-xs sm:text-sm line-clamp-2 group-hover:text-violet-300 transition-colors"
                    >
                      {{ sub.data.libelle }}
                    </p>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        v-for="t in sub.themes"
                        :key="t"
                        class="text-[9px] font-bold uppercase font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
                      >
                        {{ themeName(t) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Difficulté -->
              <td
                class="py-3.5 px-4 text-center font-display font-bold text-gray-300 whitespace-nowrap"
              >
                {{ sub.difficulty }} ⭐
              </td>

              <!-- Votes -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold"
                    title="Votes favorables"
                  >
                    <span>👍</span>
                    <span>{{ sub.approvalCount }}</span>
                  </span>
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold"
                    title="Votes défavorables"
                  >
                    <span>👎</span>
                    <span>{{ sub.rejectionCount }}</span>
                  </span>
                </div>
              </td>

              <!-- Gains & Réponses -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div v-if="sub.status === 'APPROVED'" class="space-y-0.5">
                  <span
                    class="inline-flex items-center gap-1 text-amber-400 font-bold font-display"
                  >
                    <span>+{{ sub.royaltiesEarned || 0 }}</span>
                    <span>🪙</span>
                  </span>
                  <p class="text-[10px] text-gray-500">
                    {{ sub.answersReceivedCount || 0 }} réponses
                  </p>
                </div>
                <div v-else class="text-gray-500 text-[11px]">-</div>
              </td>

              <!-- Date -->
              <td class="py-3.5 px-4 text-gray-400 text-[11px] whitespace-nowrap">
                {{ formatDate(sub.createDate) }}
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap" @click.stop>
                <div class="inline-flex items-center gap-1.5 justify-end">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-eye"
                    class="font-display font-bold"
                    @click="openDetailModal(sub)"
                  >
                    Détails
                  </UButton>

                  <!-- Action Modifier & Supprimer rapides si PENDING -->
                  <template v-if="sub.status === 'PENDING'">
                    <UButton
                      color="primary"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-pencil-square"
                      title="Modifier"
                      @click="openEditModal(sub)"
                    />
                    <UButton
                      color="error"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-trash"
                      title="Supprimer"
                      @click="openDeleteModal(sub)"
                    />
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL 1: DÉTAILS DE LA CONTRIBUTION & RETOURS -->
    <UModal
      v-model:open="showDetailModal"
      title="Détails de la question"
      :description="
        selectedDetailSub
          ? selectedDetailSub.status === 'APPROVED'
            ? 'Validée en jeu officiel'
            : selectedDetailSub.status === 'REJECTED'
              ? 'Question non retenue'
              : 'En cours de relecture communautaire'
          : ''
      "
      :ui="{
        content:
          'sm:max-w-2xl bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200 shadow-2xl',
      }"
    >
      <template #body>
        <div v-if="selectedDetailSub" class="space-y-4">
          <!-- Top Badges Row -->
          <div
            class="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/5"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-black font-display uppercase tracking-wider"
                :class="[
                  selectedDetailSub.status === 'APPROVED'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : selectedDetailSub.status === 'REJECTED'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
                ]"
              >
                {{
                  selectedDetailSub.status === "APPROVED"
                    ? "🟢 Validée en jeu"
                    : selectedDetailSub.status === "REJECTED"
                      ? "🔴 Non retenue"
                      : `🟡 En cours de vote (${selectedDetailSub.approvalCount}/3 👍)`
                }}
              </span>

              <span
                v-for="t in selectedDetailSub.themes"
                :key="t"
                class="text-[9px] font-bold uppercase font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
              >
                {{ themeName(t) }}
              </span>

              <span class="text-xs text-gray-400 font-bold font-display"
                >Difficulté {{ selectedDetailSub.difficulty }} ⭐</span
              >
            </div>
            <p class="text-[11px] text-gray-500">
              Soumise le {{ formatDate(selectedDetailSub.createDate) }}
            </p>
          </div>

          <!-- Question Libelle & Image -->
          <div class="space-y-3">
            <h3 class="text-base sm:text-lg font-black font-display text-white leading-snug">
              {{ selectedDetailSub.data.libelle }}
            </h3>

            <div
              v-if="selectedDetailSub.data.img"
              class="rounded-xl overflow-hidden bg-slate-950 border border-white/10 max-h-48 flex items-center justify-center p-2"
            >
              <img
                :src="selectedDetailSub.data.img"
                alt="Illustration"
                class="max-h-44 object-contain rounded-lg"
              />
            </div>
          </div>

          <!-- 4 Propositions -->
          <div class="space-y-1.5">
            <p class="text-xs font-bold uppercase font-display text-gray-400">
              Propositions de réponse
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="prop in selectedDetailSub.data.propositions"
                :key="prop.id"
                class="p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium"
                :class="[
                  prop.id === selectedDetailSub.data.response
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-slate-950/40 border-white/5 text-gray-300',
                ]"
              >
                <span
                  class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                  :class="[
                    prop.id === selectedDetailSub.data.response
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/5 text-gray-400',
                  ]"
                >
                  <UIcon
                    v-if="prop.id === selectedDetailSub.data.response"
                    name="i-heroicons-check"
                  />
                  <span v-else>{{ ["A", "B", "C", "D"][prop.id] }}</span>
                </span>
                <span class="truncate">{{ prop.value }}</span>
              </div>
            </div>
          </div>

          <!-- Anecdote & Source -->
          <div
            v-if="selectedDetailSub.data.commentaire || selectedDetailSub.source"
            class="p-3 rounded-xl bg-slate-950/50 border border-white/5 space-y-1.5 text-xs text-gray-300"
          >
            <p v-if="selectedDetailSub.data.commentaire">
              <strong class="text-violet-400">💡 Anecdote :</strong>
              {{ selectedDetailSub.data.commentaire }}
            </p>
            <p v-if="selectedDetailSub.source">
              <strong class="text-gray-400">🔗 Source :</strong>
              <a
                :href="selectedDetailSub.source"
                target="_blank"
                class="text-violet-400 underline ml-1 hover:text-violet-300"
              >
                {{ selectedDetailSub.source }}
              </a>
            </p>
          </div>

          <!-- SECTION RETOURS DES RELECTEURS & VOTES -->
          <div class="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2.5">
            <div class="flex items-center justify-between">
              <p
                class="text-xs font-black uppercase font-display text-white flex items-center gap-1.5"
              >
                <span>⚖️ Bilan des Votes de la Communauté</span>
              </p>
              <div class="flex items-center gap-2 text-xs font-display">
                <span
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold"
                >
                  👍 {{ selectedDetailSub.approvalCount }} pour
                </span>
                <span
                  class="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold"
                >
                  👎 {{ selectedDetailSub.rejectionCount }} contre
                </span>
              </div>
            </div>

            <!-- Liste des commentaires négatifs / motifs de rejet -->
            <div
              v-if="hasNegativeFeedback(selectedDetailSub)"
              class="space-y-2 pt-2 border-t border-white/5"
            >
              <p class="text-xs font-bold text-rose-300 flex items-center gap-1">
                <UIcon name="i-heroicons-chat-bubble-bottom-center-text" />
                <span>Retours et motifs signalés par les relecteurs :</span>
              </p>

              <div class="space-y-2">
                <div
                  v-for="(c, idx) in getRejectionFeedbackList(selectedDetailSub)"
                  :key="idx"
                  class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200/90 space-y-1"
                >
                  <p class="leading-relaxed font-medium">"{{ c.reason }}"</p>
                  <p v-if="c.createdAt" class="text-[10px] text-rose-300/60">
                    {{ formatDate(c.createdAt) }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="text-xs text-gray-500 italic pt-1">
              Aucun retour négatif ou signalement pour cette question.
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div v-if="selectedDetailSub" class="flex items-center justify-between gap-2 w-full">
          <div class="flex items-center gap-2">
            <template v-if="selectedDetailSub.status === 'PENDING'">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-heroicons-pencil-square"
                class="font-bold font-display"
                @click="startEditFromDetail(selectedDetailSub)"
              >
                Modifier la question
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                @click="openDeleteFromDetail(selectedDetailSub)"
              >
                Supprimer
              </UButton>
            </template>
          </div>

          <UButton variant="ghost" color="neutral" size="sm" @click="showDetailModal = false">
            Fermer
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL 2: MODIFIER UNE QUESTION PENDING -->
    <UModal
      v-model:open="showEditModal"
      title="Modifier la contribution"
      description="Toute modification réinitialise la validation de la communauté à 0 vote."
      :ui="{
        content:
          'sm:max-w-xl bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200 shadow-2xl',
      }"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="saveEdit">
          <!-- Libelle -->
          <div class="space-y-1">
            <label class="text-xs font-bold font-display text-gray-300"
              >Intitulé de la question <span class="text-rose-400">*</span></label
            >
            <UInput v-model="editForm.libelle" size="md" maxlength="300" class="w-full" />
          </div>

          <!-- Image -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold font-display text-gray-300"
              >Image d'illustration (URL optionnelle)</label
            >
            <UInput v-model="editForm.img" placeholder="https://..." size="sm" class="w-full" />
          </div>

          <!-- 4 propositions -->
          <div class="space-y-2">
            <label class="text-xs font-bold font-display text-gray-300"
              >Propositions (cochez la bonne réponse) <span class="text-rose-400">*</span></label
            >
            <div class="space-y-2">
              <div
                v-for="(prop, index) in editForm.propositions"
                :key="prop.id"
                class="flex items-center gap-2 p-2 rounded-xl border"
                :class="[
                  editForm.response === prop.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/50 border-white/5',
                ]"
              >
                <button
                  type="button"
                  class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                  :class="[
                    editForm.response === prop.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/5 text-gray-400',
                  ]"
                  @click="editForm.response = prop.id"
                >
                  <UIcon v-if="editForm.response === prop.id" name="i-heroicons-check" />
                  <span v-else>{{ ["A", "B", "C", "D"][index] }}</span>
                </button>
                <input
                  v-model="prop.value"
                  type="text"
                  class="bg-transparent text-sm text-white focus:outline-none flex-1 placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <!-- Thème & Diff -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-bold font-display text-gray-300">Thème</label>
              <USelectMenu
                v-model="editSelectedTheme"
                :items="themeOptions"
                label-key="name"
                value-key="slug"
                size="sm"
                class="w-full"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold font-display text-gray-300">Difficulté (1-5)</label>
              <div class="flex items-center gap-1 pt-1">
                <button
                  v-for="d in 5"
                  :key="d"
                  type="button"
                  class="flex-1 py-1 rounded-lg text-xs font-bold border transition-all"
                  :class="[
                    editForm.difficulty === d
                      ? 'bg-violet-600 text-white border-violet-400'
                      : 'bg-slate-900 text-gray-400 border-white/5',
                  ]"
                  @click="editForm.difficulty = d"
                >
                  {{ d }} ⭐
                </button>
              </div>
            </div>
          </div>

          <!-- Anecdote & Source -->
          <div class="space-y-1">
            <label class="text-xs font-bold font-display text-gray-300"
              >Explication / Anecdote</label
            >
            <UTextarea v-model="editForm.commentaire" :rows="2" class="w-full" />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold font-display text-gray-300">Source</label>
            <UInput v-model="editForm.source" size="sm" class="w-full" />
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="showEditModal = false">Annuler</UButton>
          <UButton
            type="button"
            color="primary"
            :loading="savingEdit"
            :disabled="!isEditFormValid"
            class="font-bold font-display uppercase tracking-wider"
            @click="saveEdit"
          >
            Enregistrer et recommencer les votes
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- MODAL 3: CONFIRMATION SUPPRESSION -->
    <UModal
      v-model:open="showDeleteModal"
      title="Supprimer cette question ?"
      description="Êtes-vous sûr de vouloir supprimer définitivement cette question en attente ? Cette action est irréversible."
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200 shadow-2xl',
      }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false"
            >Annuler</UButton
          >
          <UButton
            color="error"
            :loading="deleting"
            class="font-bold font-display"
            @click="confirmDelete"
          >
            Confirmer la suppression
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useUserStore } from "~/stores/userStore";
import type {
  QuestionSubmissionDTO,
  ContributorTrustScoreDTO,
} from "#shared/DTO/questionSubmissionDTO";
import { toast } from "vue3-toastify";

useHead({
  title: "L'Atelier du Savoir | Lazyculture",
  meta: [
    {
      name: "description",
      content:
        "Proposez vos propres questions de culture générale et relisez celles de la communauté sur Lazyculture.",
    },
  ],
});

const user = useSupabaseUser();
const userStore = useUserStore();

const currentTab = ref<"create" | "submissions">("create");
const submitting = ref(false);
const loadingSubmissions = ref(false);
const uploadingImage = ref(false);
const imageMode = ref<"upload" | "url">("upload");
const fileInputRef = ref<HTMLInputElement | null>(null);

const userProfile = computed(() => userStore.user);
const userLevel = computed(() => userStore.user?.UserProgress?.levelId || 1);

interface CommunityTab {
  id: "create" | "submissions";
  label: string;
  icon: string;
}

const tabs = computed<CommunityTab[]>(() => [
  { id: "create", label: "✍️ Proposer une question", icon: "i-heroicons-pencil-square" },
  { id: "submissions", label: "📊 Mes Contributions", icon: "i-heroicons-folder" },
]);

// Theme options
const { data: themesData } = await useFetch<any[]>("/api/theme/all");
const themeOptions = computed(() =>
  themesData.value?.length
    ? themesData.value
    : [{ slug: "culture_generale", name: "Culture Générale" }],
);
const themeName = (slug: string) => themeOptions.value.find((t) => t.slug === slug)?.name || slug;
const selectedTheme = ref("culture_generale");

// Form state
const form = reactive({
  libelle: "",
  img: "",
  propositions: [
    { id: 0, value: "" },
    { id: 1, value: "" },
    { id: 2, value: "" },
    { id: 3, value: "" },
  ],
  response: 0,
  difficulty: 1,
  commentaire: "",
  source: "",
});

const isFormValid = computed(() => {
  return (
    form.libelle.trim().length >= 5 &&
    form.propositions.every((p) => p.value.trim().length > 0) &&
    form.response >= 0 &&
    form.response <= 3
  );
});

function formatDate(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    toast.error("L'image est trop volumineuse (3 Mo maximum).");
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  uploadingImage.value = true;
  try {
    const res = await $fetch<{ success: boolean; url: string }>("/api/picture/save-question", {
      method: "POST",
      body: formData,
    });
    if (res.url) {
      form.img = res.url;
      toast.success("Image téléversée avec succès !");
    }
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors du téléversement de l'image.");
  } finally {
    uploadingImage.value = false;
    if (target) target.value = "";
  }
}

// Submissions state & Filtering
const myData = ref<{
  submissions: QuestionSubmissionDTO[];
  authorTrust: ContributorTrustScoreDTO | null;
} | null>(null);

const searchQuerySubmissions = ref("");
const selectedStatusFilter = ref<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

const statusFilterOptions = computed(() => {
  const subs = myData.value?.submissions || [];
  return [
    { id: "ALL", label: "Tout", count: subs.length },
    {
      id: "PENDING",
      label: "🟡 En relecture",
      count: subs.filter((s) => s.status === "PENDING").length,
    },
    {
      id: "APPROVED",
      label: "🟢 Validées",
      count: subs.filter((s) => s.status === "APPROVED").length,
    },
    {
      id: "REJECTED",
      label: "🔴 Refusées",
      count: subs.filter((s) => s.status === "REJECTED").length,
    },
  ];
});

const filteredSubmissions = computed(() => {
  if (!myData.value?.submissions) return [];
  return myData.value.submissions.filter((sub) => {
    // Status filter
    if (selectedStatusFilter.value !== "ALL" && sub.status !== selectedStatusFilter.value) {
      return false;
    }
    // Search query
    if (searchQuerySubmissions.value.trim()) {
      const q = searchQuerySubmissions.value.toLowerCase().trim();
      const matchLibelle = sub.data.libelle.toLowerCase().includes(q);
      const matchTheme = sub.themes.some((t) => t.toLowerCase().includes(q));
      return matchLibelle || matchTheme;
    }
    return true;
  });
});

async function fetchMySubmissions() {
  if (!user.value) return;
  loadingSubmissions.value = true;
  try {
    const res = await $fetch<{
      submissions: QuestionSubmissionDTO[];
      authorTrust: ContributorTrustScoreDTO | null;
    }>("/api/community/submissions/my");
    myData.value = res;

    // Update selectedDetailSub if it's currently open
    if (selectedDetailSub.value) {
      const refreshed = res.submissions.find((s) => s.id === selectedDetailSub.value?.id);
      if (refreshed) {
        selectedDetailSub.value = refreshed;
      }
    }
  } catch (err) {
    console.error("Erreur chargement soumissions :", err);
  } finally {
    loadingSubmissions.value = false;
  }
}

async function submitQuestion() {
  if (!isFormValid.value || submitting.value) return;

  submitting.value = true;
  try {
    await $fetch("/api/community/submissions", {
      method: "POST",
      body: {
        libelle: form.libelle.trim(),
        img: form.img.trim() || undefined,
        propositions: form.propositions.map((p) => ({ id: p.id, value: p.value.trim() })),
        response: form.response,
        themes: [selectedTheme.value],
        difficulty: form.difficulty,
        commentaire: form.commentaire.trim() || undefined,
        source: form.source.trim() || undefined,
      },
    });

    toast.success(
      "Votre question a été soumise avec succès ! Elle est désormais en cours de relecture.",
    );

    // Reset form
    form.libelle = "";
    form.img = "";
    form.propositions.forEach((p) => (p.value = ""));
    form.commentaire = "";
    form.source = "";

    await fetchMySubmissions();
    currentTab.value = "submissions";
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de la soumission de la question.");
  } finally {
    submitting.value = false;
  }
}

// --- Detail Modal State & Helpers ---
const showDetailModal = ref(false);
const selectedDetailSub = ref<QuestionSubmissionDTO | null>(null);

function openDetailModal(sub: QuestionSubmissionDTO) {
  selectedDetailSub.value = sub;
  showDetailModal.value = true;
}

function hasNegativeFeedback(sub: QuestionSubmissionDTO): boolean {
  if (sub.rejectionReason && sub.rejectionReason.trim().length > 0) return true;
  if (sub.rejectionComments && sub.rejectionComments.length > 0) return true;
  return false;
}

function getRejectionFeedbackList(
  sub: QuestionSubmissionDTO,
): { reason: string; createdAt?: string | Date }[] {
  const list: { reason: string; createdAt?: string | Date }[] = [];
  if (sub.rejectionComments) {
    sub.rejectionComments.forEach((c) => {
      if (c.reason && c.reason.trim()) list.push(c);
    });
  }
  if (sub.rejectionReason && sub.rejectionReason.trim()) {
    const alreadyExists = list.some((item) => item.reason === sub.rejectionReason);
    if (!alreadyExists) {
      list.push({ reason: sub.rejectionReason, createdAt: sub.updateDate });
    }
  }
  return list;
}

function startEditFromDetail(sub: QuestionSubmissionDTO) {
  showDetailModal.value = false;
  openEditModal(sub);
}

function openDeleteFromDetail(sub: QuestionSubmissionDTO) {
  showDetailModal.value = false;
  openDeleteModal(sub);
}

// --- Edit & Delete State & Handlers ---
const showEditModal = ref(false);
const savingEdit = ref(false);
const editingSubId = ref<number | null>(null);
const editSelectedTheme = ref("culture_generale");

const editForm = reactive({
  libelle: "",
  img: "",
  propositions: [
    { id: 0, value: "" },
    { id: 1, value: "" },
    { id: 2, value: "" },
    { id: 3, value: "" },
  ],
  response: 0,
  difficulty: 1,
  commentaire: "",
  source: "",
});

const isEditFormValid = computed(() => {
  return (
    editForm.libelle.trim().length >= 5 &&
    editForm.propositions.every((p) => p.value.trim().length > 0) &&
    editForm.response >= 0 &&
    editForm.response <= 3
  );
});

function openEditModal(sub: QuestionSubmissionDTO) {
  editingSubId.value = sub.id;
  editForm.libelle = sub.data.libelle;
  editForm.img = sub.data.img || "";
  editForm.propositions = sub.data.propositions.map((p, idx) => ({ id: idx, value: p.value }));
  editForm.response = sub.data.response;
  editForm.difficulty = sub.difficulty;
  editForm.commentaire = sub.data.commentaire || "";
  editForm.source = sub.source || "";
  editSelectedTheme.value = sub.themes[0] || "culture_generale";
  showEditModal.value = true;
}

async function saveEdit() {
  if (!editingSubId.value || !isEditFormValid.value || savingEdit.value) return;

  savingEdit.value = true;
  try {
    await $fetch(`/api/community/submissions/${editingSubId.value}`, {
      method: "PUT",
      body: {
        libelle: editForm.libelle.trim(),
        img: editForm.img.trim() || undefined,
        propositions: editForm.propositions.map((p) => ({ id: p.id, value: p.value.trim() })),
        response: editForm.response,
        themes: [editSelectedTheme.value],
        difficulty: editForm.difficulty,
        commentaire: editForm.commentaire.trim() || undefined,
        source: editForm.source.trim() || undefined,
      },
    });

    toast.success("Question mise à jour ! La relecture a été réinitialisée à 0 vote.");
    showEditModal.value = false;
    await fetchMySubmissions();
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de la modification.");
  } finally {
    savingEdit.value = false;
  }
}

// Delete modal
const showDeleteModal = ref(false);
const deletingSubId = ref<number | null>(null);
const deleting = ref(false);

function openDeleteModal(sub: QuestionSubmissionDTO) {
  deletingSubId.value = sub.id;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!deletingSubId.value || deleting.value) return;

  deleting.value = true;
  try {
    await $fetch(`/api/community/submissions/${deletingSubId.value}`, {
      method: "DELETE",
    });

    toast.success("Contribution supprimée avec succès.");
    showDeleteModal.value = false;
    await fetchMySubmissions();
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de la suppression.");
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  if (user.value) {
    fetchMySubmissions();
  }
});
</script>
