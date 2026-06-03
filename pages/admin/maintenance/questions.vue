<template>
  <div class="w-full max-w-6xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title & Action -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
        >
          Gestion des Questions
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Recherchez, filtrez, éditez ou traitez les signalements des questions du jeu.
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <UButton
          color="warning"
          size="md"
          icon="i-heroicons-arrow-path"
          class="font-black font-display uppercase tracking-wider px-6"
          :loading="recalculating"
          @click="recalculateDifficulties"
        >
          Recalculer Difficultés
        </UButton>
        <UButton
          color="primary"
          size="md"
          icon="i-heroicons-plus"
          class="font-black font-display uppercase tracking-wider px-6 shadow-neon"
          @click="editItem(defaultItem)"
        >
          Nouvelle Question
        </UButton>
      </div>
    </div>

    <!-- Filters Bar Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
    >
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <!-- Text Search -->
        <div class="md:col-span-2">
          <UFormField
            label="Recherche textuelle"
            :ui="{
              label: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
            }"
          >
            <UInput
              v-model="textFilter"
              placeholder="Rechercher par libellé ou proposition..."
              icon="i-heroicons-magnifying-glass"
              class="w-full"
              :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Theme Selector -->
        <div>
          <UFormField
            label="Filtrer par thème"
            :ui="{
              label: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
            }"
          >
            <USelectMenu
              v-model="selectedTheme"
              :items="themes?.map((t) => t.name) ?? []"
              class="w-full"
              placeholder="Tous les thèmes"
              clearable
              :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Switches Container -->
        <div
          class="flex flex-wrap items-center justify-start md:justify-end gap-x-6 gap-y-2 pt-4 md:pt-0"
        >
          <div class="flex items-center space-x-2">
            <USwitch v-model="showResponse" color="primary" id="switch-responses" />
            <label
              for="switch-responses"
              class="text-xs font-bold text-gray-400 font-display cursor-pointer select-none"
              >Réponses</label
            >
          </div>

          <div class="flex items-center space-x-2">
            <USwitch v-model="showReportedQuestions" color="warning" id="switch-reported" />
            <label
              for="switch-reported"
              class="text-xs font-bold text-gray-400 font-display cursor-pointer select-none"
              >Signalées</label
            >
          </div>

          <div class="flex items-center space-x-2">
            <USwitch v-model="showDeleted" color="error" id="switch-deleted" />
            <label
              for="switch-deleted"
              class="text-xs font-bold text-gray-400 font-display cursor-pointer select-none"
              >Supprimées</label
            >
          </div>
        </div>
      </div>
    </UCard>

    <!-- Questions Table Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      :ui="{ body: 'p-0' }"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-white/10 bg-white/5 text-gray-400 font-display font-bold text-xs uppercase tracking-wider"
            >
              <th class="px-6 py-4 max-w-sm">Question</th>
              <th v-if="showResponse" class="px-6 py-4">Réponse correcte</th>
              <th class="px-6 py-4">Thèmes</th>
              <th class="px-6 py-4 text-center">Difficulté</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-gray-200">
            <tr
              v-for="item in paginatedQuestions"
              :key="item.id"
              class="hover:bg-white/5 transition-colors group"
              :class="item.deleted ? 'opacity-50 line-through bg-red-950/10' : ''"
            >
              <!-- Libelle -->
              <td class="px-6 py-4 font-semibold max-w-sm truncate">
                {{ item.data?.libelle || "Sans libellé" }}
              </td>
              <!-- Response (Conditionally Showed) -->
              <td v-if="showResponse" class="px-6 py-4 font-bold text-emerald-400 font-display">
                {{ getResponse(item.data) }}
              </td>
              <!-- Themes -->
              <td class="px-6 py-4 text-xs font-semibold text-violet-400 font-display">
                {{ getThemNames(item.data?.theme || []) }}
              </td>
              <!-- Difficulty -->
              <td class="px-6 py-4 text-center font-semibold font-display text-xs">
                <span
                  class="px-2.5 py-0.5 rounded-full"
                  :class="getDifficultyClass(item.difficulty)"
                >
                  {{ getDifficultyLabel(item.difficulty) }}
                </span>
              </td>
              <!-- Status Indicators -->
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                  <span
                    v-if="isReported(item.reportings)"
                    class="flex items-center text-[10px] font-extrabold uppercase tracking-widest font-display text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-neon shadow-amber-500/20"
                  >
                    <UIcon name="i-heroicons-flag" class="mr-1 text-xs" /> Signalée
                  </span>
                  <span
                    v-if="item.deleted"
                    class="text-[10px] font-extrabold uppercase tracking-widest font-display text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full"
                  >
                    Supprimée
                  </span>
                  <span
                    v-if="!isReported(item.reportings) && !item.deleted"
                    class="w-2 h-2 rounded-full bg-emerald-500 shadow-neon shadow-emerald-500/50"
                  ></span>
                </div>
              </td>
              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end items-center space-x-1">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="sm"
                    class="hover:bg-violet-600/20 hover:text-violet-400 rounded-lg"
                    @click="editItem(item)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    size="sm"
                    class="hover:bg-red-500/20 hover:text-red-400 rounded-lg"
                    @click="deleteItem(item)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="filteredQuestions.length === 0">
              <td
                :colspan="showResponse ? 6 : 5"
                class="text-center py-10 text-gray-500 font-medium"
              >
                Aucune question trouvée correspondant aux critères.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="filteredQuestions.length > itemsPerPage" #footer>
        <div
          class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-white/5 w-full"
        >
          <span class="text-xs text-gray-400 font-medium">
            Affichage de {{ (page - 1) * itemsPerPage + 1 }} à
            {{ Math.min(page * itemsPerPage, filteredQuestions.length) }} sur
            {{ filteredQuestions.length }} questions
          </span>
          <UPagination
            v-model:page="page"
            :total="filteredQuestions.length"
            :items-per-page="itemsPerPage"
            show-edges
            :sibling-count="1"
            color="neutral"
            active-color="primary"
          />
        </div>
      </template>
    </UCard>

    <!-- Question Modal Editor -->
    <AdminQuestionEditModal
      v-model="dialog"
      :question="editedItem"
      :themes="themes ?? []"
      @save="onQuestionSaved"
    />

    <!-- Delete Confirmation Modal -->
    <AdminQuestionDeleteModal
      v-model="dialogDelete"
      :question="editedItem"
      @deleted="onQuestionDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type {
  QuestionDataDTO,
  QuestionDTO,
  QuestionPropositionDTO,
  QuestionReportingDTO,
} from "~/models/question";
import type { Theme, ThemeDTO } from "~/models/theme";

// Define admin middleware if necessary
definePageMeta({
  middleware: "admin",
});

const textFilter = ref<string>("");
const dialog = ref(false);
const dialogDelete = ref(false);
const showResponse = ref(false);
const showDeleted = ref(false);
const showReportedQuestions = ref(false);
const editedIndex = ref(-1);

const page = ref(1);
const itemsPerPage = 10;

const editedItem = ref<QuestionDTO>({
  id: 0,
  difficulty: 0,
  source: "",
  createDate: new Date(),
  updateDate: new Date(),
  userCreate: "",
  userUpdate: "",
  deleted: false,
  themes: [],
  data: {
    type: "",
    difficulty: 0,
    theme: [],
    libelle: "",
    img: "",
    response: 0,
    propositions: [],
    commentaire: "",
    commentaireImg: "",
  },
  reportings: [],
});

const defaultItem = {
  id: 0,
  difficulty: 0,
  source: "",
  createDate: new Date(),
  updateDate: new Date(),
  userCreate: "",
  userUpdate: "",
  deleted: false,
  themes: [],
  data: {
    type: "",
    difficulty: 0,
    theme: [],
    libelle: "",
    img: "",
    response: 0,
    propositions: [],
    commentaire: "",
    commentaireImg: "",
  },
  reportings: [],
};

const { data: questions } = await useFetch<QuestionDTO[]>("/api/question/all");
const { data: themes } = (await useFetch<Theme[]>("/api/theme/all")) ?? [];
const selectedTheme = ref("");

const filteredQuestions = computed(() => {
  let filtered = questions?.value ?? [];

  if (showReportedQuestions.value) {
    filtered = filtered.filter((question) => question.reportings.some((report) => !report.closed));
  }

  if (!showDeleted.value) {
    filtered = filtered.filter((question) => !question.deleted);
  } else {
    filtered = filtered.filter((question) => question.deleted);
  }

  if (selectedTheme.value) {
    const selectedThemeSlug = themes?.value?.find((t) => t.name === selectedTheme.value)?.slug;
    if (selectedThemeSlug) {
      filtered = filtered.filter((question) => question.data?.theme?.includes(selectedThemeSlug));
    }
  }

  if (textFilter.value) {
    const filterText = textFilter.value.toLowerCase();
    filtered = filtered.filter(
      (question) =>
        (question.data?.libelle || "").toLowerCase().includes(filterText) ||
        (question.data?.propositions || []).some((proposition) =>
          (proposition.value || "").toLowerCase().includes(filterText),
        ),
    );
  }

  return filtered;
});

const paginatedQuestions = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredQuestions.value.slice(start, end);
});

const totalPages = computed(() => Math.ceil(filteredQuestions.value.length / itemsPerPage));

watch([textFilter, selectedTheme, showDeleted, showReportedQuestions], () => {
  page.value = 1;
});

watch(totalPages, (newVal) => {
  if (page.value > newVal && newVal > 0) {
    page.value = newVal;
  }
});

function getResponse(data: QuestionDataDTO) {
  if (!data || !data.propositions) return "Aucune réponse correcte définie";
  const selectedProposition = data.propositions.find(
    (proposition: QuestionPropositionDTO) => proposition.id === data.response,
  );
  return selectedProposition ? selectedProposition.value : "Aucune réponse correcte définie";
}

function getThemNames(slugs: string[]): string {
  if (!slugs) return "";
  const matchingThemes = themes?.value?.filter((t: ThemeDTO) => slugs.includes(t.slug));
  return matchingThemes?.map((theme) => theme.name).join(", ") ?? "";
}

function isReported(reportings: QuestionReportingDTO[]) {
  return reportings && reportings.some((report) => !report.closed);
}

function editItem(item: QuestionDTO) {
  editedIndex.value = questions?.value?.indexOf(item) ?? -1;
  const cloned = JSON.parse(JSON.stringify(item));

  if (!cloned.data) {
    cloned.data = {
      type: "choix",
      difficulty: cloned.difficulty || 0,
      theme: [],
      libelle: "",
      img: "",
      response: 0,
      propositions: [],
      commentaire: "",
      commentaireImg: "",
    };
  } else {
    if (!cloned.data.propositions) cloned.data.propositions = [];
    if (!cloned.data.theme) cloned.data.theme = [];
    if (!cloned.data.libelle) cloned.data.libelle = "";
    if (cloned.data.response === undefined || cloned.data.response === null)
      cloned.data.response = 0;
  }

  editedItem.value = cloned;
  dialog.value = true;
}

function deleteItem(item: QuestionDTO) {
  editedIndex.value = questions?.value?.indexOf(item) ?? -1;
  const cloned = JSON.parse(JSON.stringify(item));
  if (!cloned.data) {
    cloned.data = {
      type: "choix",
      difficulty: cloned.difficulty || 0,
      theme: [],
      libelle: "",
      img: "",
      response: 0,
      propositions: [],
      commentaire: "",
      commentaireImg: "",
    };
  }
  editedItem.value = cloned;
  dialogDelete.value = true;
}

function onQuestionSaved(savedQuestion: QuestionDTO) {
  if (editedIndex.value > -1) {
    if (questions?.value) {
      questions.value[editedIndex.value] = savedQuestion;
    }
  } else {
    questions?.value?.push(savedQuestion);
  }
}

function onQuestionDeleted(questionId: number) {
  if (questions?.value && editedIndex.value > -1) {
    questions.value.splice(editedIndex.value, 1);
  }
}

const recalculating = ref(false);

async function recalculateDifficulties() {
  if (
    !confirm(
      "Voulez-vous vraiment recalculer la difficulté de toutes les questions à partir des statistiques de jeu ?",
    )
  ) {
    return;
  }

  try {
    recalculating.value = true;
    const result = await $fetch<any>("/api/question/recalculate-difficulties", {
      method: "post",
    });
    alert(`Calcul terminé avec succès !\n${result.updatedCount} questions ont été mises à jour.`);

    // Recharger la liste des questions
    const refreshed = await $fetch<QuestionDTO[]>("/api/question/all");
    if (questions) {
      questions.value = refreshed;
    }
  } catch (e: any) {
    console.error("Erreur de calcul :", e);
    alert("Une erreur est survenue lors du recalcul : " + (e.statusMessage || e.message));
  } finally {
    recalculating.value = false;
  }
}

function getDifficultyLabel(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return "Débutant";
    case 2:
      return "Confirmé";
    case 3:
      return "Expert";
    case 4:
      return "Diabolique";
    case 5:
      return "Impossible";
    default:
      return `Niveau ${difficulty}`;
  }
}

function getDifficultyClass(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case 2:
      return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
    case 3:
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case 4:
      return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
    case 5:
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
  }
}
</script>

<style scoped>
/* Page-specific scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
