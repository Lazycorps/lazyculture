<template>
  <v-card flat rounded class="d-flex flex-column pa-5">
    <h2>Import des questions</h2>
    <v-textarea label="JSON source" rows="5" v-model="sourceJson" />
    <v-btn @click="loadJsonIntoQuestions">Charger</v-btn>
  </v-card>
</template>

<script setup lang="ts">
import { QuestionDataDTO } from "~/models/question";

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
</script>
