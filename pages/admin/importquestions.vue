<template>
  <v-card flat rounded class="d-flex flex-column pa-5">
    <h1>Import des questions</h1>
    <v-textarea label="JSON source" rows="5" v-model="sourceJson" />
    <span
      ><v-btn @click="loadJsonIntoQuestions">Charger</v-btn
      ><!-- <v-btn>Ajouter</v-btn> --></span
    >
    <div
      v-if="questionsfromJson.length > 0"
      style="overflow-y: scroll"
      class="d-flex flex-shrink-1 flex-column"
    >
      <h2>{{ questionsfromJson.length }} questions</h2>
      <v-checkbox v-model="hideAnswers" label="Cacher la bonne réponse" />
      <div v-for="(question, index) in questionsfromJson">
        <span class="d-flex justify-space-between"
          ><h3>{{ index + 1 }}.</h3>
          <v-btn
            density="compact"
            @click="removeFromQuestions(index)"
            color="red"
            text="Supprimer"
        /></span>
        <QuestionForm :question="question" :hide-answers="hideAnswers" />
      </div>
      <v-btn color="blue" text="Importer les questions" @click="sendToApi" />
    </div>

  </v-card>
</template>

<script setup lang="ts">
import { QuestionDataDTO } from "~/models/question";
import QuestionForm from "~/components/admin/importquestions/QuestionForm.vue";

const hideAnswers = ref(true);
const loading = ref(false);
const sourceJson = ref("");

const questionsfromJson = ref<QuestionDataDTO[]>([]);

function loadJsonIntoQuestions() {
  const json: QuestionDataDTO[] = JSON.parse(sourceJson.value);

  questionsfromJson.value = [];

  for (var key in Object.keys(json)) {
    const questionData = json[key];
    questionsfromJson.value.push(questionData);
  }
}

function removeFromQuestions(index: number) {
  questionsfromJson.value.splice(index, 1);
}

async function sendToApi() {
  try {
    loading.value = true;
    if (questionsfromJson.value.length == 0) return;
    await $fetch("/api/import/chatgpt", {
      method: "post",
      body: questionsfromJson.value      
    });
  } finally {
    // sourceJson.value = "";
    // questionsfromJson.value = [];
    loading.value = false;
  }
}
</script>
