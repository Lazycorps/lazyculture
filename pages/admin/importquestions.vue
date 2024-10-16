<template>
  <v-card flat rounded class="d-flex flex-column pa-5">
    <h1>Import des questions</h1>
    <v-textarea label="JSON source" rows="5" v-model="sourceJson" />
    <span
      ><v-btn @click="loadJsonIntoQuestions">Charger</v-btn
      ><!-- <v-btn>Ajouter</v-btn> --></span
    >
    <h2>Questions</h2>
    <div v-for="(question, index) in questionsfromJson" style="overflow-y: scroll;">
      <h3>{{ index + 1 }}.</h3>
      <v-text-field label="Intitulé" v-model="question.libelle" />
      <span class="d-flex">
        <v-select label="Type" v-model="question.type" />
        <v-select label="Difficulté" v-model="question.difficulty" />
        <v-combobox multiple chips label="Thème(s)" v-model="question.theme" />
      </span>
      <span v-for="(prop, propIndex) in question.propositions" class="d-flex">        
        <v-text-field :label="`Réponse ${propIndex + 1}`" :model-value="prop.value" :class="question.response == propIndex + 1 ? 'text-green' : ''" />
      </span>
    </div>
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
