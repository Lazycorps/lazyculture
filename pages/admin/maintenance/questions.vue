<template>
  <v-card flat rounded class="my-auto mx-auto pa-5" style="max-width: 1500px; min-width: 800px;">
    <v-data-table :headers="computedHeaders" :items="filteredQuestions" :items-per-page="10" fixed-header height="100%"
      style="max-height: 650px;" class="fill-width">

      <template v-slot:top>
        <v-toolbar class="pt-4 pl-4">
          <v-text-field label="Filtre textuel" underlined density="compact" class="mr-10" width="200px"
            v-model="textFilter" />
          <v-combobox label="Thèmes" :items="themes?.map(theme => theme.name) ?? []" v-model="selectedTheme"
            density="compact" width="200px" class="mr-10"></v-combobox>
          <v-switch v-model="showReportedQuestions" color="green" label="Questions Signalées" class="mr-10"></v-switch>
          <v-switch color="green" label="Afficher réponses" v-model="showResponse"></v-switch>
          <v-spacer></v-spacer>
          <v-btn icon @click="editItem(defaultItem)" :disabled="true" class="rounded-circle mr-6 mb-4"
            style="background-color: green; color: white;">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-toolbar>
      </template>

      <!-- Slots for table columns -->
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

    <!-- Dialog for editing -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>{{ formTitle }}</v-card-title>

        <v-card-text>
          <!-- Textarea pour question.data.libelle -->
          <v-textarea v-model="editedItem.data.libelle" label="Libellé de la question" rows="2" auto-grow
            density="compact" />

          <!-- Champs éditables pour chaque proposition avec boutons radio -->
          <v-radio-group v-model="editedItem.data.response">
            <div v-for="(proposition, index) in editedItem.data.propositions" :key="index" class="d-flex align-center">
              <!-- TextField compact pour les propositions -->
              <v-text-field v-model="proposition.value" :label="'Proposition ' + (index + 1)" class="flex-grow-1 mr-4"
                density="compact" />
              <!-- Boutons radio avec couleurs rouge/vert -->
              <v-radio :value="proposition.id"
                :style="{ color: editedItem.data.response === proposition.id ? 'green' : 'red' }" />
            </div>
          </v-radio-group>
          <v-textarea v-model="editedItem.data.commentaire" label="Commentaire" rows="2" auto-grow density="compact" />
          <!-- Champs non éditables pour chaque commentaire dans reportings avec checkbox pour reporting.closed -->
          <v-divider class="my-1"></v-divider>
          <div v-if="editedItem.reportings.length">
            <h3>Signalements</h3>
            <div v-for="(reporting, index) in editedItem.reportings" :key="index" class="d-flex align-center mt-2">
              <!-- Textfield non éditable pour commentaire -->
              <v-text-field v-model="reporting.commentaire" :label="'Commentaire ' + (index + 1)" readonly
                class="flex-grow-1 mr-4" />
              <!-- Combobox (checkbox) pour closed -->
              <v-checkbox v-model="reporting.closed" label="Clôturé" />
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="close">Annuler</v-btn>
          <v-btn @click="save">Sauvegarder</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog for delete confirmation -->
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
    theme: ["culture_generale"],
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
    theme: ["culture_generale"],
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

  // Filtrer par questions signalées
  if (showReportedQuestions.value) {
    filtered = filtered.filter(question =>
      question.reportings.some(report => !report.closed)
    );
  }

  // Filtrer par thème sélectionné
  if (selectedTheme.value) {
    const selectedThemeSlug = themes?.value?.find(t => t.name === selectedTheme.value)?.slug;
    if (selectedThemeSlug) {
      filtered = filtered.filter(question =>
        question.data.theme.includes(selectedThemeSlug)
      );
    }
  }
  // Filtrer par texte
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
  // Si le switch est activé, on inclut la colonne "Réponse"
  if (showResponse.value) {
    return headers;
  } else {
    // Sinon, on filtre les headers pour exclure la colonne "Réponse"
    return headers?.filter(header => header.value !== 'response') ?? [];
  }
});
const { data: questions } = await useFetch<QuestionDTO[]>("/api/question/all");
const { data: themes } = await useFetch<Theme[]>("/api/theme/all");

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

async function save() {
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
    questions?.value?.push({ ...editedItem.value });
  }
  close();
}

</script>

<style scoped></style>