<template>
  <v-card class="bg-grey pa-1 mb-2">
    <div class="bg-black rounded pa-4">
      <v-text-field dense label="Intitulé" v-model="question.libelle" />
      <img :src="question.img" alt="img question" v-if="question.img" />
      <span class="d-flex">
        <v-select
          dense
          label="Type"
          v-model="question.type"
          :options="questionTypes"
        />
        <v-select
          dense
          label="Difficulté"
          v-model="question.difficulty"
          :options="questionDifficulties"
        />
        <v-combobox
          dense
          multiple
          chips
          label="Thème(s)"
          v-model="question.theme"
        />
      </span>
      <span v-for="(prop, propIndex) in question.propositions" class="d-flex">
        <v-text-field
          :label="`Réponse ${propIndex + 1}`"
          :model-value="prop.value"
          :class="!hideAnswers && question.response == propIndex + 1 ? 'text-green' : ''"
        />
      </span>
      <v-text-field v-if="!hideAnswers" dense label="Commentaire" v-model="question.commentaire" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { QuestionDataDTO } from "~/models/question";

const questionTypes = ["choix", "boolean"];
const questionDifficulties = [1, 2, 3, 4, 5];

defineProps({
  question: {
    type: QuestionDataDTO,
    required: true,
  },
  hideAnswers: {
    type: Boolean,
    required: true,
    default: true,
  },
});
</script>
