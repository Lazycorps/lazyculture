<template>
  <UModal v-model:open="isOpen">
    <template #content>
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
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UTextarea
                v-model="editedItem.data.libelle"
                placeholder="Entrez la question..."
                :rows="2"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white font-medium' }"
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
                    :ui="{ base: 'bg-transparent border-none text-white focus:ring-0 pl-0' }"
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
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <USelectMenu
                v-model="selectedThemeNames"
                multiple
                :items="themes?.map((theme) => theme.name) ?? []"
                class="w-full"
                placeholder="Ajouter des thèmes..."
                :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
              />
            </UFormField>

            <UFormField
              label="URL de l'image (optionnel)"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="editedItem.data.img"
                placeholder="Ex: https://image.com/pic.jpg"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <UFormField
              label="Difficulté (1 à 5)"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="editedItem.difficulty"
                type="number"
                min="1"
                max="5"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
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
              <USwitch v-model="editedItem.deleted" color="error" />
            </div>
          </div>
        </div>

        <!-- Comment block -->
        <UFormField
          label="Commentaire de réponse (Explication)"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UTextarea
            v-model="editedItem.data.commentaire"
            placeholder="Explication complémentaire affichée après avoir répondu..."
            :rows="2"
            class="w-full"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
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
                <USwitch v-model="reporting.closed" color="success" id="report-closed" />
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
            @click="isOpen = false"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon"
            :disabled="isSaveDisabled"
            :loading="saving"
            @click="save"
          >
            Sauvegarder
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { QuestionDTO, QuestionPropositionDTO } from "#shared/question";
import type { Theme } from "#shared/theme";

const props = defineProps<{
  modelValue: boolean;
  question: QuestionDTO | null;
  themes: Theme[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", question: QuestionDTO): void;
}>();

const isOpen = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emit("update:modelValue", val);
  },
});

const saving = ref(false);

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

watch(
  () => props.question,
  (newQuestion) => {
    if (newQuestion) {
      const cloned = JSON.parse(JSON.stringify(newQuestion));
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
    } else {
      editedItem.value = {
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
    }
  },
  { immediate: true },
);

const formTitle = computed(() =>
  !editedItem.value || editedItem.value.id === 0
    ? "Nouvelle Question"
    : `Question #${editedItem.value.id}`,
);

const selectedThemeNames = computed({
  get() {
    return (editedItem.value.data?.theme || []).map((slug) => {
      const theme = props.themes?.find((t) => t.slug === slug);
      return theme ? theme.name : slug;
    });
  },
  set(newThemeNames) {
    if (!editedItem.value.data) {
      editedItem.value.data = {
        type: "choix",
        difficulty: editedItem.value.difficulty || 0,
        theme: [],
        libelle: "",
        img: "",
        response: 0,
        propositions: [],
        commentaire: "",
        commentaireImg: "",
      };
    }
    if (!editedItem.value.data.theme) {
      editedItem.value.data.theme = [];
    }
    const updatedSlugs = newThemeNames.map((name) => {
      const theme = props.themes?.find((t) => t.name === name);
      return theme ? theme.slug : name;
    });
    editedItem.value.data.theme = updatedSlugs;
  },
});

const paddedPropositions = computed(() => {
  const propositions = [...(editedItem.value.data?.propositions || [])];

  while (propositions.length < 4) {
    propositions.push({ id: propositions.length + 1, value: "", img: "" });
  }

  return propositions;
});

function updateProposition(index: number, value: string) {
  if (value.trim() === "") {
    return;
  }

  if (!editedItem.value.data) {
    editedItem.value.data = {
      type: "choix",
      difficulty: editedItem.value.difficulty || 0,
      theme: [],
      libelle: "",
      img: "",
      response: 0,
      propositions: [],
      commentaire: "",
      commentaireImg: "",
    };
  }
  if (!editedItem.value.data.propositions) {
    editedItem.value.data.propositions = [];
  }

  if (index < editedItem.value.data.propositions.length) {
    const prop = editedItem.value.data.propositions[index];
    if (prop) prop.value = value;
  } else {
    editedItem.value.data.propositions.push({ id: index + 1, value: value, img: "" });
  }
  if (editedItem.value.data.propositions.length > 4) {
    editedItem.value.data.propositions = editedItem.value.data.propositions.slice(0, 4);
  }
}

const isSaveDisabled = computed(() => {
  if (!editedItem.value || !editedItem.value.data) return true;
  const libelleValid = (editedItem.value.data.libelle || "").trim() !== "";
  const propositionsValid =
    (editedItem.value.data.propositions || []).filter((p) => (p.value || "").trim() !== "")
      .length >= 2;
  const radioSelected = (editedItem.value.data.response || 0) !== 0;

  return !(libelleValid && propositionsValid && radioSelected);
});

async function save() {
  try {
    saving.value = true;
    editedItem.value.data.difficulty = editedItem.value.difficulty = Number(
      editedItem.value.difficulty,
    );

    editedItem.value.data.theme = selectedThemeNames.value
      .map((themeName) => {
        const theme = props.themes?.find((t) => t.name === themeName);
        return theme ? theme.slug : null;
      })
      .filter((slug) => slug !== null) as string[];

    if (editedItem.value.data.theme.length === 0) {
      editedItem.value.data.theme = ["culture_generale"];
    }

    editedItem.value.data.type = "choix";

    let result: QuestionDTO;
    if (editedItem.value.id > 0) {
      result = await $fetch<QuestionDTO>("/api/question/update", {
        method: "put",
        body: { ...editedItem.value },
      });
    } else {
      result = await $fetch<QuestionDTO>("/api/question/create", {
        method: "post",
        body: { ...editedItem.value },
      });
    }
    emit("save", result);
    isOpen.value = false;
  } catch (err) {
    console.error("Failed to save question:", err);
  } finally {
    saving.value = false;
  }
}
</script>
