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
              label: {
                text: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
              },
            }"
          >
            <UInput
              v-model="textFilter"
              placeholder="Rechercher par libellé ou proposition..."
              icon="i-heroicons-magnifying-glass"
              class="w-full"
              :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <!-- Theme Selector -->
        <div>
          <UFormField
            label="Filtrer par thème"
            :ui="{
              label: {
                text: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display',
              },
            }"
          >
            <USelectMenu
              v-model="selectedTheme"
              :items="themes?.map((t) => t.name) ?? []"
              class="w-full"
              placeholder="Tous les thèmes"
              clearable
              :ui="{ background: 'bg-[#111827] border border-white/10 text-white' }"
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
            <USwitch v-model="showReportedQuestions" color="orange" id="switch-reported" />
            <label
              for="switch-reported"
              class="text-xs font-bold text-gray-400 font-display cursor-pointer select-none"
              >Signalées</label
            >
          </div>

          <div class="flex items-center space-x-2">
            <USwitch v-model="showDeleted" color="red" id="switch-deleted" />
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
      :ui="{ body: { padding: 'p-0' } }"
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
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-gray-200">
            <tr
              v-for="item in filteredQuestions"
              :key="item.id"
              class="hover:bg-white/5 transition-colors group"
              :class="item.deleted ? 'opacity-50 line-through bg-red-950/10' : ''"
            >
              <!-- Libelle -->
              <td class="px-6 py-4 font-semibold max-w-sm truncate">
                {{ item.data.libelle }}
              </td>
              <!-- Response (Conditionally Showed) -->
              <td v-if="showResponse" class="px-6 py-4 font-bold text-emerald-400 font-display">
                {{ getResponse(item.data) }}
              </td>
              <!-- Themes -->
              <td class="px-6 py-4 text-xs font-semibold text-violet-400 font-display">
                {{ getThemNames(item.data.theme) }}
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
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    size="sm"
                    class="hover:bg-violet-600/20 hover:text-violet-400 rounded-lg"
                    @click="editItem(item)"
                  />
                  <UButton
                    color="red"
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
                :colspan="showResponse ? 5 : 4"
                class="text-center py-10 text-gray-500 font-medium"
              >
                Aucune question trouvée correspondant aux critères.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Question Modal Editor -->
    <UModal v-model="dialog">
      <div
        class="p-6 bg-[#111827] border border-white/10 rounded-2xl shadow-glass space-y-6 text-gray-200 w-full max-w-3xl overflow-y-auto max-h-[90vh]"
      >
        <!-- Title -->
        <div class="border-b border-white/5 pb-4">
          <h3 class="text-xl font-black font-display text-white tracking-wide">
            {{ formTitle }}
          </h3>
          <p class="text-xs text-gray-400 mt-1">
            Modifiez ou complétez les données de la question.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Left Column: Libelle & Propositions -->
          <div class="space-y-4">
            <UFormField
              label="Libellé de la question"
              :ui="{
                label: {
                  text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                },
              }"
            >
              <UTextarea
                v-model="editedItem.data.libelle"
                placeholder="Entrez la question..."
                :rows="2"
                class="w-full"
                :ui="{ background: 'bg-white/5 border border-white/10 text-white font-medium' }"
              />
            </UFormField>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display"
                  >Propositions & Réponse correcte</span
                >
                <span class="text-[10px] text-gray-500 font-semibold font-display"
                  >Cochez le bouton vert pour la bonne réponse</span
                >
              </div>

              <!-- Propositions Grid -->
              <div class="space-y-3">
                <div
                  v-for="(proposition, index) in paddedPropositions"
                  :key="index"
                  class="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl p-2.5 transition-all"
                  :class="
                    editedItem.data.response === proposition.id && proposition.value.trim()
                      ? 'border-emerald-500/30 bg-emerald-500/5 shadow-neon-green'
                      : ''
                  "
                >
                  <UInput
                    v-model="proposition.value"
                    :placeholder="'Proposition ' + (index + 1)"
                    class="flex-1"
                    size="sm"
                    :ui="{ background: 'bg-transparent border-none text-white focus:ring-0 pl-0' }"
                    @blur="updateProposition(index, proposition.value)"
                  />
                  <!-- Standard HTML Radio input since standard custom radio is highly reliable -->
                  <input
                    type="radio"
                    :name="'question-response'"
                    :value="proposition.id"
                    v-model="editedItem.data.response"
                    :disabled="!proposition.value.trim()"
                    class="w-4 h-4 text-emerald-500 bg-slate-900 border-white/20 focus:ring-emerald-500 focus:ring-offset-slate-950 focus:ring-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Settings (Themes, Difficulty, Status, Image) -->
          <div class="space-y-4">
            <UFormField
              label="Sélectionner les thèmes"
              :ui="{
                label: {
                  text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                },
              }"
            >
              <USelectMenu
                v-model="selectedThemeNames"
                multiple
                :items="themes?.map((theme) => theme.name) ?? []"
                class="w-full"
                placeholder="Ajouter des thèmes..."
                :ui="{ background: 'bg-[#111827] border border-white/10 text-white' }"
              />
            </UFormField>

            <UFormField
              label="URL de l'image (optionnel)"
              :ui="{
                label: {
                  text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                },
              }"
            >
              <UInput
                v-model="editedItem.data.img"
                placeholder="Ex: https://image.com/pic.jpg"
                class="w-full"
                :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <UFormField
              label="Difficulté (1 à 5)"
              :ui="{
                label: {
                  text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                },
              }"
            >
              <UInput
                v-model="editedItem.difficulty"
                type="number"
                min="1"
                max="5"
                class="w-full"
                :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <div
              class="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            >
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-gray-300 font-display">Statut Supprimé</span>
                <p class="text-[10px] text-gray-500 font-medium">
                  Activer pour désactiver temporairement la question.
                </p>
              </div>
              <USwitch v-model="editedItem.deleted" color="red" />
            </div>
          </div>
        </div>

        <!-- Comment block -->
        <UFormField
          label="Commentaire de réponse (Explication)"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <UTextarea
            v-model="editedItem.data.commentaire"
            placeholder="Explication complémentaire affichée après avoir répondu..."
            :rows="2"
            class="w-full"
            :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
          />
        </UFormField>

        <!-- Flag / Reports Resolution Area -->
        <div
          v-if="editedItem.reportings && editedItem.reportings.length > 0"
          class="border-t border-white/10 pt-4 space-y-3"
        >
          <h4
            class="text-sm font-black font-display text-amber-400 uppercase tracking-wider flex items-center"
          >
            <UIcon name="i-heroicons-flag" class="mr-1.5 text-base" /> Signalements en cours
          </h4>
          <div class="space-y-3 max-h-36 overflow-y-auto pr-1">
            <div
              v-for="(reporting, index) in editedItem.reportings"
              :key="index"
              class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs text-amber-300/80 font-semibold font-display">
                  Raison du signalement :
                </p>
                <p class="text-xs text-gray-200 mt-1 truncate">
                  {{ reporting.commentaire || "Aucun commentaire" }}
                </p>
              </div>
              <div class="flex items-center space-x-2 flex-shrink-0">
                <USwitch v-model="reporting.closed" color="emerald" id="report-closed" />
                <label
                  for="report-closed"
                  class="text-xs font-bold text-gray-400 font-display select-none cursor-pointer"
                  >Clôturé</label
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
          <UButton
            variant="ghost"
            color="primary"
            class="font-bold font-display uppercase tracking-wider text-xs"
            @click="close"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon"
            :disabled="isSaveDisabled"
            @click="save"
          >
            Sauvegarder
          </UButton>
        </div>
      </div>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="dialogDelete">
      <div
        class="p-6 bg-[#111827] border border-white/10 rounded-2xl shadow-glass text-center space-y-6"
      >
        <div
          class="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl"
        >
          ⚠️
        </div>
        <div>
          <h3 class="text-lg font-black font-display text-white tracking-wide">
            Supprimer la question ?
          </h3>
          <p class="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            Êtes-vous sûr de vouloir supprimer cette question définitivement ? Cette action est
            irréversible.
          </p>
        </div>
        <div class="flex items-center justify-center space-x-3 pt-2">
          <UButton
            variant="ghost"
            color="primary"
            class="font-bold font-display uppercase tracking-wider text-xs"
            @click="closeDelete"
          >
            Annuler
          </UButton>
          <UButton
            color="red"
            class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon shadow-red-500/20"
            @click="deleteItemConfirm"
          >
            Supprimer
          </UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  QuestionDataDTO,
  QuestionDTO,
  QuestionPropositionDTO,
  QuestionReportingDTO,
} from "~/models/question";
import type { Theme, ThemeDTO } from "~/models/theme";

// Define admin middleware if necessary
// definePageMeta({
//     middleware: 'admin'
// });

const textFilter = ref<string>("");
const dialog = ref(false);
const dialogDelete = ref(false);
const showResponse = ref(false);
const showDeleted = ref(false);
const showReportedQuestions = ref(false);
const editedIndex = ref(-1);

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
      filtered = filtered.filter((question) => question.data.theme.includes(selectedThemeSlug));
    }
  }

  if (textFilter.value) {
    const filterText = textFilter.value.toLowerCase();
    filtered = filtered.filter(
      (question) =>
        question.data.libelle.toLowerCase().includes(filterText) ||
        question.data.propositions.some((proposition) =>
          proposition.value.toLowerCase().includes(filterText),
        ),
    );
  }

  return filtered;
});

const selectedThemeNames = computed({
  get() {
    return editedItem.value.data.theme.map((slug) => {
      const theme = themes?.value?.find((t) => t.slug === slug);
      return theme ? theme.name : slug;
    });
  },
  set(newThemeNames) {
    const updatedSlugs = newThemeNames.map((name) => {
      const theme = themes?.value?.find((t) => t.name === name);
      return theme ? theme.slug : name;
    });
    editedItem.value.data.theme = updatedSlugs;
  },
});

const paddedPropositions = computed(() => {
  const propositions = [...editedItem.value.data.propositions];

  while (propositions.length < 4) {
    propositions.push({ id: propositions.length + 1, value: "", img: "" });
  }

  return propositions;
});

const formTitle = computed(() =>
  editedIndex.value === -1 ? "Nouvelle Question" : `Question #${editedItem.value.id}`,
);

function getResponse(data: QuestionDataDTO) {
  const selectedProposition = data.propositions.find(
    (proposition: QuestionPropositionDTO) => proposition.id === data.response,
  );
  return selectedProposition ? selectedProposition.value : "Aucune réponse correcte définie";
}

function getThemNames(slugs: string[]): string {
  const matchingThemes = themes?.value?.filter((t: ThemeDTO) => slugs.includes(t.slug));
  return matchingThemes?.map((theme) => theme.name).join(", ") ?? "";
}

function isReported(reportings: QuestionReportingDTO[]) {
  return reportings && reportings.some((report) => !report.closed);
}

function editItem(item: QuestionDTO) {
  editedIndex.value = questions?.value?.indexOf(item) ?? -1;
  editedItem.value = JSON.parse(JSON.stringify(item)); // deep clone to prevent instant mutations
  dialog.value = true;
}

function updateProposition(index: number, value: string) {
  if (value.trim() === "") {
    return;
  }

  if (index < editedItem.value.data.propositions.length) {
    editedItem.value.data.propositions[index].value = value;
  } else {
    editedItem.value.data.propositions.push({ id: index + 1, value: value, img: "" });
  }
  if (editedItem.value.data.propositions.length > 4) {
    editedItem.value.data.propositions = editedItem.value.data.propositions.slice(0, 4);
  }
}

function deleteItem(item: QuestionDTO) {
  editedIndex.value = questions?.value?.indexOf(item) ?? -1;
  editedItem.value = JSON.parse(JSON.stringify(item));
  dialogDelete.value = true;
}

async function deleteItemConfirm() {
  try {
    await $fetch("/api/question/delete?id=" + editedItem.value.id, {
      method: "delete",
    });
    if (questions?.value && editedIndex.value > -1) {
      questions.value.splice(editedIndex.value, 1);
    }
  } catch (err) {
    console.error("Failed to delete question :", err);
  } finally {
    closeDelete();
  }
}

function close() {
  dialog.value = false;
  editedItem.value = JSON.parse(JSON.stringify(defaultItem));
  editedIndex.value = -1;
}

function closeDelete() {
  dialogDelete.value = false;
  editedItem.value = JSON.parse(JSON.stringify(defaultItem));
  editedIndex.value = -1;
}

const isSaveDisabled = computed(() => {
  const libelleValid = editedItem.value.data.libelle.trim() !== "";
  const propositionsValid =
    editedItem.value.data.propositions.filter((p) => p.value.trim() !== "").length >= 2;
  const radioSelected = editedItem.value.data.response !== 0;

  return !(libelleValid && propositionsValid && radioSelected);
});

async function save() {
  editedItem.value.data.difficulty = editedItem.value.difficulty = Number(
    editedItem.value.difficulty,
  );

  editedItem.value.data.theme = selectedThemeNames.value
    .map((themeName) => {
      const theme = themes?.value?.find((t) => t.name === themeName);
      return theme ? theme.slug : null;
    })
    .filter((slug) => slug !== null) as string[];

  if (editedItem.value.data.theme.length === 0) editedItem.value.data.theme = ["culture_generale"];

  editedItem.value.data.type = "choix";

  if (editedIndex.value > -1) {
    const updated = await $fetch<QuestionDTO>("/api/question/update", {
      method: "put",
      body: { ...editedItem.value },
    });
    if (questions?.value) {
      questions.value[editedIndex.value] = updated;
    }
  } else {
    const created = await $fetch<QuestionDTO>("/api/question/create", {
      method: "post",
      body: { ...editedItem.value },
    });
    questions?.value?.push(created);
  }
  close();
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
