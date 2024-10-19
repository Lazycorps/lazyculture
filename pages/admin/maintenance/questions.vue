<template>
  <v-card flat rounded class="my-auto mx-auto pa-5" style="max-width: 1500px; min-width: 800px;">
    <v-data-table :headers="computedHeaders" :items="filteredQuestions" :items-per-page="10" fixed-header height="100%"
      style="max-height: 650px;" class="fill-width">
      <template v-slot:top>
        <v-toolbar class="pt-4 pl-4">
          <v-text-field label="Filtre textuel" underlined density="compact" class="mr-10" width="200px"
            v-model="textFilter" />
          <v-combobox label="Thèmes" :items="themes?.map(theme => theme.name) ?? []" v-model="selectedTheme"
            density="compact" width="200px" class="mr-10" clearable></v-combobox>
          <v-switch v-model="showReportedQuestions" color="green" label="Questions Signalées" class="mr-10"></v-switch>
          <v-switch color="green" label="Afficher réponses" v-model="showResponse"></v-switch>
          <v-spacer></v-spacer>
          <v-btn icon @click="editItem(defaultItem)" :disabled="false" class="rounded-circle mr-6 mb-4"
            style="background-color: green; color: white;">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-toolbar>
      </template>
      <template v-slot:item.response="{ item }">
        <span>{{ getResponse(item.data) }}</span>
      </template>
      <template v-slot:item.themeNames="{ item }">
        <span>{{ getThemNames(item.data.theme) }}</span>
      </template>
      <template v-slot:item.reported="{ item }">
        <div class="d-flex align-center justify-center">
          <v-icon v-if="isReported(item.reportings)" color="orange-lighten-2" icon="mdi-flag" />
        </div>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon class="me-2" size="small" @click="editItem(item)">
          mdi-pencil
        </v-icon>
        <v-icon size="small" @click="deleteItem(item)" :disabled="true">
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>{{ formTitle }}</v-card-title>
        <v-card-text>
          <v-textarea v-model="editedItem.data.libelle" label="Libellé de la question" rows="2" auto-grow
            density="compact" />
          <v-row>
            <v-col cols="6">
              <v-radio-group v-model="editedItem.data.response">
                <div v-for="(proposition, index) in paddedPropositions" :key="index" class="d-flex align-center">
                  <v-text-field v-model="proposition.value" :label="'Proposition ' + (index + 1)"
                    class="flex-grow-1 mr-4" density="compact" width="260"
                    @blur="updateProposition(index, proposition.value)" />
                  <v-radio :value="proposition.id" :disabled="!proposition.value.trim()"
                    :style="{ color: editedItem.data.response === proposition.id ? 'green' : 'red' }" />
                </div>
              </v-radio-group>
            </v-col>
            <v-col cols="6">
              <v-combobox v-model="selectedThemeNames" :items="themes?.map(theme => theme.name) ?? []" label="Thèmes"
                multiple hide-selected chips closable-chips density="compact" />
              <v-text-field v-model="editedItem.data.img" label="URL de l'image" density="compact" />
            </v-col>
          </v-row>
          <v-textarea v-model="editedItem.data.commentaire" label="Commentaire" rows="2" auto-grow density="compact" />
          <v-divider class="my-1"></v-divider>
          <div v-if="editedItem.reportings.length">
            <h3>Signalements</h3>
            <div v-for="(reporting, index) in editedItem.reportings" :key="index" class="d-flex align-center mt-2">
              <v-text-field v-model="reporting.commentaire" :label="'Commentaire ' + (index + 1)" readonly
                class="flex-grow-1 mr-4" />
              <v-checkbox v-model="reporting.closed" label="Clôturé" />
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="close">Annuler</v-btn>
          <v-btn @click="save" :disabled="isSaveDisabled">Sauvegarder</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="dialogDelete" max-width="500px">
      <v-card>
        <v-card-title>Voulez-vous supprimer cette question ?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeDelete" color="orange-lighten-3">Annuler</v-btn>
          <v-btn color="error" @click="deleteItemConfirm">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
})
import { ref, computed } from 'vue';
import type { VDataTable } from 'vuetify/components'
import type { QuestionDataDTO, QuestionDTO, QuestionPropositionDTO, QuestionReportingDTO } from '~/models/question';
import type { Theme, ThemeDTO } from "~/models/theme";
type ReadonlyHeaders = VDataTable['$props']['headers']

const textFilter = ref<string>("");
const dialog = ref(false);
const dialogDelete = ref(false);
const showResponse = ref(false);
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
  reportings: []
});
const defaultItem = {
  id: 0,
  difficulty: 0,
  source: "",
  createDate: new Date(),
  updateDate: new Date(),
  userCreate: "",
  userUpdate: "",
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
  reportings: []
};

const filteredQuestions = computed(() => {
  let filtered = questions?.value ?? [];

  if (showReportedQuestions.value) {
    filtered = filtered.filter(question =>
      question.reportings.some(report => !report.closed)
    );
  }

  if (selectedTheme.value) {
    const selectedThemeSlug = themes?.value?.find(t => t.name === selectedTheme.value)?.slug;
    if (selectedThemeSlug) {
      filtered = filtered.filter(question =>
        question.data.theme.includes(selectedThemeSlug)
      );
    }
  }

  if (textFilter.value) {
    const filterText = textFilter.value.toLowerCase();
    filtered = filtered.filter(question =>
      question.data.libelle.toLowerCase().includes(filterText) ||
      question.data.propositions.some(proposition =>
        proposition.value.toLowerCase().includes(filterText)
      )
    );
  }

  return filtered;
});
const computedHeaders = computed(() => {
  if (showResponse.value) {
    return headers;
  } else {
    return headers?.filter(header => header.value !== 'response') ?? [];
  }
});
const selectedThemeNames = computed({
  get() {
    return editedItem.value.data.theme.map(slug => {
      const theme = themes?.value?.find(t => t.slug === slug);
      return theme ? theme.name : slug;
    });
  },
  set(newThemeNames) {
    const updatedSlugs = newThemeNames.map(name => {
      const theme = themes?.value?.find(t => t.name === name);
      return theme ? theme.slug : name;
    });
    editedItem.value.data.theme = updatedSlugs;
  }
});
const paddedPropositions = computed(() => {
  const propositions = [...editedItem.value.data.propositions];

  while (propositions.length < 4) {
    propositions.push({ id: 0, value: "", img: "" });
  }

  return propositions;
});
const { data: questions } = await useFetch<QuestionDTO[]>("/api/question/all");
const { data: themes } = await useFetch<Theme[]>("/api/theme/all") ?? [];

const selectedTheme = ref("");

const formTitle = computed(() => (editedIndex.value === -1 ? 'Nouvelle Question' : `Question ${editedItem.value.id}`));
const headers: ReadonlyHeaders = [
  { title: 'Question', value: 'data.libelle', align: 'start', sortable: true },
  { title: 'Réponse', value: 'response' },
  { title: 'Thèmes', value: 'themeNames' },
  { title: 'Signalée', value: 'reported' },
  { title: 'Actions', value: 'actions' },
];

function getResponse(data: QuestionDataDTO) {
  const selectedProposition = data.propositions.find(
    (proposition: QuestionPropositionDTO) => proposition.id === data.response
  );
  return selectedProposition ? selectedProposition.value : 'No match found';
}

function getThemNames(slugs: string[]): string {
  const matchingThemes = themes?.value?.filter((t: ThemeDTO) => slugs.includes(t.slug));
  return matchingThemes?.map(theme => theme.name).join(',') ?? "";
}

function isReported(reportings: QuestionReportingDTO[]) {
  return reportings && reportings.some(report => !report.closed); // Vérifie s'il y a un report non clôturé
}

function editItem(item: QuestionDTO) {
  editedIndex.value = questions?.value?.indexOf(item) ?? -1;
  editedItem.value = { ...item };
  dialog.value = true;
};

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
  editedItem.value = { ...item };
  dialogDelete.value = true;
};

async function deleteItemConfirm() {
  await $fetch("/api/question/delete?id=" + editedItem.value.id, {
    method: "delete"
  });
  questions?.value?.splice(editedIndex.value, 1);
  closeDelete();
};

function close() {
  dialog.value = false;
  editedItem.value = { ...defaultItem };
  editedIndex.value = -1;
};

function closeDelete() {
  dialogDelete.value = false;
  editedItem.value = { ...defaultItem };
  editedIndex.value = -1;
};

const isSaveDisabled = computed(() => {
  const libelleValid = editedItem.value.data.libelle.trim() !== "";
  const propositionsValid = editedItem.value.data.propositions.filter(p => p.value.trim() !== "").length >= 2;
  const radioSelected = editedItem.value.data.response !== 0;

  return !(libelleValid && propositionsValid && radioSelected);
});

async function save() {
  editedItem.value.data.theme = selectedThemeNames.value.map(themeName => {
    const theme = themes?.value?.find(t => t.name === themeName);
    return theme ? theme.slug : null;
  }).filter(slug => slug !== null);

  if (editedIndex.value > -1) {
    Object.assign(questions?.value ? [editedIndex.value] : defaultItem, editedItem.value);
    {
      const updatedQuestion = {
        ...editedItem.value,
        data: {
          ...editedItem.value.data,
        }
      };

      await $fetch("/api/question/update", {
        method: "put",
        body: { ...updatedQuestion },
      });
    }
  } else {
    const newQuestion = {
      ...editedItem.value,
      data: {
        ...editedItem.value.data,
      }
    };
    await $fetch("/api/question/create", {
      method: "post",
      body: { ...newQuestion },
    });
    questions?.value?.push({ ...editedItem.value });
  }
  close();
}

</script>

<style scoped></style>