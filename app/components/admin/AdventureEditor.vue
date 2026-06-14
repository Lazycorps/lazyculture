<template>
  <div class="space-y-6">
    <!-- Top Action Header -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between bg-[#111827]/70 backdrop-blur-xl border border-white/10 p-6 rounded-2xl gap-4 shadow-glass"
    >
      <div class="flex-1 space-y-4">
        <h3
          class="text-2xl font-black font-display bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          {{ isEdit ? "Éditer l'Aventure" : "Créer une Nouvelle Aventure" }}
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Titre de l'Aventure"
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display mb-1.5',
            }"
          >
            <UInput
              v-model="form.title"
              placeholder="Ex: L'histoire de France, Niveau 1"
              color="primary"
              variant="outline"
              class="w-full text-white"
              required
            />
          </UFormField>

          <UFormField
            label="Thème de questions"
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display mb-1.5',
            }"
          >
            <USelectMenu
              v-model="selectedThemeName"
              :items="themes?.map((t) => t.name) ?? []"
              placeholder="Sélectionner un thème"
              color="primary"
              class="w-full text-white"
            />
          </UFormField>
        </div>
      </div>

      <div class="flex items-center space-x-3 self-end md:self-center">
        <UButton
          variant="ghost"
          color="primary"
          class="font-bold font-display text-xs"
          @click="goBack"
        >
          Annuler
        </UButton>
        <UButton
          color="primary"
          class="font-black font-display uppercase tracking-widest text-xs px-6 py-2.5 shadow-lg shadow-violet-600/20"
          :loading="saving"
          :disabled="!isFormValid"
          @click="saveAdventure"
        >
          Enregistrer
        </UButton>
      </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Stages List (1/3) -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl lg:col-span-1"
        :ui="{ body: 'p-4 flex flex-col h-[70vh]' }"
      >
        <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <h4 class="text-sm font-extrabold uppercase tracking-wider text-gray-300 font-display">
            🗺️ Chapitres & Étapes
          </h4>
          <span
            class="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full font-bold font-display"
          >
            {{ form.stages.length }} étapes
          </span>
        </div>

        <!-- Scrollable Stages List -->
        <div class="flex-1 overflow-y-auto space-y-3 pr-1">
          <div
            v-for="(stage, index) in form.stages"
            :key="index"
            class="p-3.5 rounded-xl border transition-all cursor-pointer group flex items-start space-x-3 relative"
            :class="
              activeStageIndex === index
                ? 'bg-violet-600/10 border-violet-500/50 shadow-neon-violet'
                : 'bg-white/5 border-white/5 hover:border-white/15'
            "
            @click="activeStageIndex = index"
          >
            <!-- Sequence Indicator -->
            <div
              class="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-black font-display"
              :class="
                activeStageIndex === index
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/10 text-gray-400'
              "
            >
              {{ index + 1 }}
            </div>

            <!-- Title & Type -->
            <div class="flex-1 space-y-1.5 min-w-0">
              <input
                v-model="stage.title"
                type="text"
                placeholder="Titre de l'étape"
                class="w-full bg-transparent border-none text-white font-bold font-display focus:ring-0 p-0 text-sm leading-tight focus:border-b focus:border-violet-500"
                @click.stop
              />
              <div class="flex items-center space-x-2">
                <span
                  class="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md font-display"
                  :class="getTypeBadgeClass(stage.type)"
                >
                  {{ getStageTypeLabel(stage.type) }}
                </span>
                <span
                  v-if="stage.type === 'STEP'"
                  class="text-[10px] text-gray-500 font-semibold font-display"
                >
                  {{ stage.questionIds.length }}/5 questions
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex items-center space-x-1 opacity-40 group-hover:opacity-100 transition-opacity"
            >
              <!-- Reorder Up -->
              <UButton
                variant="ghost"
                color="primary"
                size="xs"
                icon="i-heroicons-chevron-up"
                :disabled="index === 0"
                @click.stop="moveStageUp(index)"
                class="p-1"
              />
              <!-- Reorder Down -->
              <UButton
                variant="ghost"
                color="primary"
                size="xs"
                icon="i-heroicons-chevron-down"
                :disabled="index === form.stages.length - 1"
                @click.stop="moveStageDown(index)"
                class="p-1"
              />
              <!-- Delete Stage -->
              <UButton
                variant="ghost"
                color="error"
                size="xs"
                icon="i-heroicons-trash"
                @click.stop="deleteStage(index)"
                class="p-1 text-rose-500 hover:text-rose-400"
              />
            </div>
          </div>

          <div v-if="form.stages.length === 0" class="text-center py-8 text-sm text-gray-500">
            Aucun chapitre créé. Ajoutez-en un ci-dessous.
          </div>
        </div>

        <!-- Add Stage Controls -->
        <div class="border-t border-white/10 pt-4 mt-3 grid grid-cols-3 gap-2">
          <UButton
            color="primary"
            variant="subtle"
            size="xs"
            class="justify-center font-bold font-display text-[10px] uppercase py-2"
            @click="addStage('STEP')"
          >
            ➕ Étape
          </UButton>
          <UButton
            color="primary"
            variant="subtle"
            size="xs"
            class="justify-center font-bold font-display text-[10px] uppercase py-2"
            @click="addStage('CONTROL')"
          >
            📊 Contrôle
          </UButton>
          <UButton
            color="primary"
            variant="subtle"
            size="xs"
            class="justify-center font-bold font-display text-[10px] uppercase py-2"
            @click="addStage('EXAM')"
          >
            🏆 Examen
          </UButton>
        </div>
      </UCard>

      <!-- Right Column: Active Stage Details & Questions Selection (2/3) -->
      <div class="lg:col-span-2 space-y-6">
        <div v-if="activeStage" class="space-y-6">
          <!-- Stage Overview Card -->
          <UCard
            class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 class="text-lg font-black font-display text-white">
                    {{ activeStage.title || `Chapitre #${activeStageIndex + 1}` }}
                  </h4>
                  <p class="text-xs text-gray-400 font-medium">
                    Type d'étape : {{ getStageTypeLabel(activeStage.type) }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <span
                    class="text-xs font-black px-3 py-1 rounded-full font-display uppercase tracking-widest"
                    :class="getTypeBadgeClass(activeStage.type)"
                  >
                    {{ activeStage.type }}
                  </span>
                </div>
              </div>

              <!-- Content depending on type -->
              <div v-if="activeStage.type !== 'STEP'" class="py-6 text-center space-y-3">
                <span class="text-4xl">🤖</span>
                <h5 class="text-sm font-bold font-display text-gray-300">
                  Génération dynamique lors de la partie
                </h5>
                <p class="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  {{
                    activeStage.type === "CONTROL"
                      ? "Un contrôle pioche automatiquement 10 questions de manière aléatoire parmi les étapes (STEP) précédentes."
                      : "Un examen pioche automatiquement 20 questions de manière aléatoire parmi l'ensemble des étapes (STEP) précédentes du parcours."
                  }}
                </p>
              </div>

              <div v-else class="space-y-4">
                <div class="flex items-center justify-between">
                  <h5
                    class="text-xs font-black font-display uppercase tracking-wider text-gray-400"
                  >
                    Questions Sélectionnées ({{ activeStage.questionIds.length }}/5)
                  </h5>
                  <span class="text-[10px] text-gray-500 font-semibold font-display">
                    Exactement 5 questions sont recommandées par étape
                  </span>
                </div>

                <!-- Questions List (Static Slots) -->
                <div class="space-y-2">
                  <div
                    v-for="slotIdx in 5"
                    :key="slotIdx"
                    class="flex items-center justify-between p-3 rounded-xl border border-white/5 text-sm"
                    :class="
                      activeStage.questions[slotIdx - 1]
                        ? 'bg-white/5 border-white/10 text-white font-medium'
                        : 'bg-white/1 border-dashed border-white/5 text-gray-500 italic'
                    "
                  >
                    <div class="flex items-center space-x-3 truncate">
                      <span class="text-xs font-bold text-gray-600 font-display"
                        >Slot {{ slotIdx }}</span
                      >
                      <span
                        v-if="activeStage.questions[slotIdx - 1]"
                        class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-display border border-violet-500/20"
                      >
                        Diff. {{ activeStage.questions[slotIdx - 1].difficulty }}
                      </span>
                      <span class="truncate">
                        {{
                          activeStage.questions[slotIdx - 1]?.libelle ||
                          "Aucune question sélectionnée"
                        }}
                      </span>
                    </div>

                    <UButton
                      v-if="activeStage.questions[slotIdx - 1]"
                      variant="ghost"
                      color="error"
                      icon="i-heroicons-x-mark"
                      size="xs"
                      @click="removeQuestion(slotIdx - 1)"
                      class="text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Question Selector Card (only for STEP type) -->
          <UCard
            v-if="activeStage.type === 'STEP'"
            class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
            :ui="{ body: 'p-4 flex flex-col h-[45vh]' }"
          >
            <div
              class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4"
            >
              <h5
                class="text-sm font-extrabold uppercase tracking-wider text-gray-300 font-display flex items-center"
              >
                <span>🔍 Choisir des Questions</span>
              </h5>
              <div class="relative w-full md:max-w-xs">
                <UInput
                  v-model="searchQuery"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Rechercher une question..."
                  color="primary"
                  size="sm"
                  class="w-full text-white"
                />
              </div>
            </div>

            <!-- Available Theme Questions -->
            <div class="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <div v-if="loadingQuestions" class="flex items-center justify-center py-12">
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="text-2xl animate-spin text-violet-400"
                />
              </div>
              <div
                v-else-if="!form.themeSlug"
                class="text-center py-12 text-sm text-gray-500 italic font-display"
              >
                Veuillez sélectionner un thème de questions ci-dessus
              </div>
              <div
                v-else-if="filteredQuestions.length === 0"
                class="text-center py-12 text-sm text-gray-500 font-display"
              >
                Aucune question trouvée pour ce thème ou cette recherche
              </div>
              <div
                v-else
                v-for="q in filteredQuestions"
                :key="q.id"
                class="p-3 rounded-xl border border-white/5 hover:border-white/10 bg-white/3 flex items-center justify-between gap-4 transition-all hover:bg-white/5"
              >
                <div class="space-y-1 truncate min-w-0">
                  <div class="flex items-center space-x-2">
                    <span
                      class="text-[9px] font-black px-1.5 py-0.5 rounded font-display"
                      :class="getDifficultyBadgeClass(q.difficulty)"
                    >
                      D{{ q.difficulty }}
                    </span>
                    <span class="text-xs font-bold text-gray-500 font-display">ID: {{ q.id }}</span>
                    <!-- Duplicate Alert Badge -->
                    <span
                      v-if="usedQuestionsMap.has(q.id)"
                      class="text-[9px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-md font-display animate-pulse flex items-center"
                    >
                      ⚠️ Déjà utilisé dans : {{ usedQuestionsMap.get(q.id)?.stageTitle }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-200 truncate font-semibold">
                    {{ q.libelle }}
                  </p>
                </div>

                <div class="flex-shrink-0">
                  <!-- Toggle Button -->
                  <UButton
                    v-if="isQuestionSelectedInActiveStage(q.id)"
                    color="error"
                    variant="subtle"
                    size="xs"
                    icon="i-heroicons-minus"
                    @click="removeQuestionById(q.id)"
                    class="rounded-lg font-bold font-display"
                  >
                    Retirer
                  </UButton>
                  <UButton
                    v-else
                    color="primary"
                    variant="solid"
                    size="xs"
                    icon="i-heroicons-plus"
                    :disabled="activeStage.questionIds.length >= 5"
                    @click="addQuestionToActiveStage(q)"
                    class="rounded-lg font-bold font-display"
                  >
                    Ajouter
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Placeholder when no stage is selected -->
        <UCard
          v-else
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl h-[70vh] flex flex-col justify-center items-center text-center"
        >
          <span class="text-5xl mb-4">🗺️</span>
          <h4 class="text-lg font-bold text-gray-300 font-display">
            Sélectionnez un chapitre ou une étape
          </h4>
          <p class="text-xs text-gray-500 max-w-sm mt-2 leading-relaxed">
            Cliquez sur l'une des étapes de la colonne de gauche pour gérer son titre, son type ou
            associer des questions à ce chapitre.
          </p>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import type { Theme } from "#shared/theme";

interface QuestionBasic {
  id: number;
  difficulty: number;
  libelle: string;
}

interface Stage {
  id?: number;
  sequence: number;
  type: "STEP" | "CONTROL" | "EXAM";
  title: string;
  questionIds: number[];
  questions: QuestionBasic[];
}

const props = defineProps<{
  adventureId?: number;
  themes: Theme[];
}>();

const emit = defineEmits<{
  (e: "saved"): void;
  (e: "cancelled"): void;
}>();

const router = useRouter();

const isEdit = computed(() => !!props.adventureId);
const saving = ref(false);
const loadingQuestions = ref(false);
const selectedThemeName = ref<string | undefined>(undefined);
const questionsList = ref<QuestionBasic[]>([]);
const searchQuery = ref("");
const activeStageIndex = ref<number>(-1);

// Adventure Form State
const form = reactive<{
  title: string;
  themeSlug: string;
  stages: Stage[];
}>({
  title: "",
  themeSlug: "",
  stages: [],
});

// Computed active stage
const activeStage = computed(() => {
  if (activeStageIndex.value >= 0 && activeStageIndex.value < form.stages.length) {
    return form.stages[activeStageIndex.value];
  }
  return null;
});

// Computed map of all selected questions in this adventure across all stages
const usedQuestionsMap = computed(() => {
  const map = new Map<number, { stageTitle: string; stageIndex: number }>();
  form.stages.forEach((stage, sIdx) => {
    if (stage.questionIds) {
      stage.questionIds.forEach((qId) => {
        // Exclude the current stage from duplicate checks
        if (sIdx !== activeStageIndex.value) {
          map.set(qId, {
            stageTitle: stage.title || `Chapitre #${sIdx + 1}`,
            stageIndex: sIdx,
          });
        }
      });
    }
  });
  return map;
});

// Fetch detailed adventure if editing
onMounted(async () => {
  if (props.adventureId) {
    try {
      const data = await $fetch<any>(`/api/admin/adventures/${props.adventureId}`);
      form.title = data.title;
      form.themeSlug = data.themeSlug;
      form.stages = data.stages || [];

      // Find selected theme name
      const matchingTheme = props.themes.find((t) => t.slug === data.themeSlug);
      if (matchingTheme) {
        selectedThemeName.value = matchingTheme.name;
      }

      if (form.stages.length > 0) {
        activeStageIndex.value = 0;
      }
    } catch (error) {
      alert("Erreur lors de la récupération de l'aventure.");
      goBack();
    }
  } else {
    // Add default initial stage for creation
    addStage("STEP");
    activeStageIndex.value = 0;
  }
});

// Watch theme selection
watch(selectedThemeName, async (newThemeName) => {
  if (newThemeName) {
    const themeObj = props.themes.find((t) => t.name === newThemeName);
    if (themeObj) {
      // If changing theme with already selected questions, warn the user
      const hasQuestions = form.stages.some((s) => s.questionIds.length > 0);
      if (hasQuestions && form.themeSlug && themeObj.slug !== form.themeSlug) {
        const confirmChange = confirm(
          "Changer le thème réinitialisera toutes les questions sélectionnées dans vos chapitres. Continuer ?",
        );
        if (!confirmChange) {
          // Revert selection
          const prevTheme = props.themes.find((t) => t.slug === form.themeSlug);
          selectedThemeName.value = prevTheme?.name;
          return;
        } else {
          // Clear questions in stages
          form.stages.forEach((s) => {
            s.questionIds = [];
            s.questions = [];
          });
        }
      }

      form.themeSlug = themeObj.slug;
      await fetchThemeQuestions(themeObj.slug);
    }
  } else {
    form.themeSlug = "";
    questionsList.value = [];
  }
});

async function fetchThemeQuestions(themeSlug: string) {
  try {
    loadingQuestions.value = true;
    questionsList.value = await $fetch<QuestionBasic[]>(
      `/api/admin/adventures/questions?themeSlug=${themeSlug}`,
    );
  } catch (error) {
    console.error("Error fetching theme questions:", error);
  } finally {
    loadingQuestions.value = false;
  }
}

// Search and Filter Questions
const filteredQuestions = computed(() => {
  if (!searchQuery.value.trim()) {
    return questionsList.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return questionsList.value.filter(
    (q) => q.libelle.toLowerCase().includes(query) || q.id.toString() === query,
  );
});

// Validate Form
const isFormValid = computed(() => {
  if (!form.title.trim() || !form.themeSlug) return false;
  if (form.stages.length === 0) return false;

  // Verify all STEP stages have at least one question (ideally 5, but at least 1 is required for safety)
  return form.stages.every((stage) => {
    if (stage.type === "STEP") {
      return stage.questionIds.length > 0;
    }
    return true;
  });
});

// Add Stage
function addStage(type: "STEP" | "CONTROL" | "EXAM") {
  const steps = form.stages.filter((s) => s.type === "STEP").length;
  const controls = form.stages.filter((s) => s.type === "CONTROL").length;
  const exams = form.stages.filter((s) => s.type === "EXAM").length;

  let title = "";
  if (type === "STEP") {
    title = `Étape ${steps + 1}`;
  } else if (type === "CONTROL") {
    title = `Contrôle ${controls + 1}`;
  } else {
    title = `Examen ${exams + 1}`;
  }

  form.stages.push({
    sequence: form.stages.length + 1,
    type,
    title,
    questionIds: [],
    questions: [],
  });

  // Select the newly added stage
  activeStageIndex.value = form.stages.length - 1;
}

// Delete Stage
function deleteStage(index: number) {
  if (form.stages.length <= 1) {
    alert("Une aventure doit comporter au moins un chapitre/étape.");
    return;
  }

  form.stages.splice(index, 1);

  // Recalculate sequences
  form.stages.forEach((stage, idx) => {
    stage.sequence = idx + 1;
  });

  // Adjust active index
  if (activeStageIndex.value >= form.stages.length) {
    activeStageIndex.value = form.stages.length - 1;
  } else if (activeStageIndex.value === index) {
    activeStageIndex.value = Math.max(0, index - 1);
  }
}

// Reorder Stages
function moveStageUp(index: number) {
  if (index === 0) return;
  const item = form.stages[index]!;
  form.stages.splice(index, 1);
  form.stages.splice(index - 1, 0, item);

  // Re-sequence
  form.stages.forEach((stage, idx) => {
    stage.sequence = idx + 1;
  });

  // Keep focus on same item
  if (activeStageIndex.value === index) {
    activeStageIndex.value = index - 1;
  } else if (activeStageIndex.value === index - 1) {
    activeStageIndex.value = index;
  }
}

function moveStageDown(index: number) {
  if (index === form.stages.length - 1) return;
  const item = form.stages[index]!;
  form.stages.splice(index, 1);
  form.stages.splice(index + 1, 0, item);

  // Re-sequence
  form.stages.forEach((stage, idx) => {
    stage.sequence = idx + 1;
  });

  // Keep focus on same item
  if (activeStageIndex.value === index) {
    activeStageIndex.value = index + 1;
  } else if (activeStageIndex.value === index + 1) {
    activeStageIndex.value = index;
  }
}

// Question management in active stage
function isQuestionSelectedInActiveStage(qId: number): boolean {
  if (!activeStage.value) return false;
  return activeStage.value.questionIds.includes(qId);
}

function addQuestionToActiveStage(q: QuestionBasic) {
  if (!activeStage.value) return;
  if (activeStage.value.type !== "STEP") return;

  if (activeStage.value.questionIds.length >= 5) {
    alert("Une étape normale ne peut pas contenir plus de 5 questions.");
    return;
  }

  activeStage.value.questionIds.push(q.id);
  activeStage.value.questions.push({ ...q });
}

function removeQuestion(index: number) {
  if (!activeStage.value) return;
  activeStage.value.questionIds.splice(index, 1);
  activeStage.value.questions.splice(index, 1);
}

function removeQuestionById(qId: number) {
  if (!activeStage.value) return;
  const index = activeStage.value.questionIds.indexOf(qId);
  if (index !== -1) {
    removeQuestion(index);
  }
}

// Save Adventure
async function saveAdventure() {
  if (!isFormValid.value) return;

  try {
    saving.value = true;

    // Build payload to send
    const payload = {
      title: form.title,
      themeSlug: form.themeSlug,
      stages: form.stages.map((s) => ({
        sequence: s.sequence,
        type: s.type,
        title: s.title,
        questionIds: s.questionIds,
      })),
    };

    if (isEdit.value) {
      await $fetch(`/api/admin/adventures/${props.adventureId}`, {
        method: "put",
        body: payload,
      });
    } else {
      await $fetch("/api/admin/adventures/create", {
        method: "post",
        body: payload,
      });
    }

    emit("saved");
  } catch (error: any) {
    alert(error.data?.statusMessage || "Une erreur est survenue lors de l'enregistrement.");
  } finally {
    saving.value = false;
  }
}

function goBack() {
  emit("cancelled");
}

// Formatting helpers
function getStageTypeLabel(type: string) {
  if (type === "STEP") return "Étape";
  if (type === "CONTROL") return "Contrôle";
  if (type === "EXAM") return "Examen";
  return type;
}

function getTypeBadgeClass(type: string) {
  if (type === "STEP") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (type === "CONTROL") return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
  if (type === "EXAM") return "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20";
  return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
}

function getDifficultyBadgeClass(difficulty: number) {
  if (difficulty <= 1) return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
  if (difficulty === 2) return "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20";
  if (difficulty === 3) return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
  if (difficulty === 4) return "bg-orange-500/15 text-orange-400 border border-orange-500/20";
  return "bg-rose-500/15 text-rose-400 border border-rose-500/20";
}
</script>

<style scoped>
/* Smooth custom scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
