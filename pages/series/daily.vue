<template>
  <v-card flat rounded class="mx-auto my-auto pa-5">
    {{ series }}
    <v-btn @click="startSeries">Start</v-btn>
    <QuestionSeries v-if="question" :question="question"></QuestionSeries>
  </v-card>
</template>
<script setup lang="ts">
import { QuestionDTO } from "~/models/question";
import type { QuestionSeriesDTO } from "~/models/series";

const question = ref<QuestionDTO | null>(null);
const loading = ref(false);
const { data: series } = await useFetch<QuestionSeriesDTO>("/api/series/daily");

async function startSeries() {
  try {
    loading.value = true;
    question.value = await NextQuestion();
  } finally {
    loading.value = false;
  }
}

async function NextQuestion() {
  try {
    loading.value = true;
    return await $fetch<QuestionDTO>("/api/question/" + series.value?.data.questionsIds[0]);
  } finally {
    loading.value = false;
  }
}
</script>
