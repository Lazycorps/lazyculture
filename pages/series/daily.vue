<template>
  <v-card flat rounded class="mx-auto my-auto pa-5">
    {{ questionId }} / {{ nbrQuestion }}
    <template v-if="questionId != nbrQuestion">
      <QuestionSeries
        v-if="seriesStarted"
        :question="question"
        @validate-response="validateResponse"
        @next-question="nextQuestion"
      ></QuestionSeries>
      <v-btn v-else @click="startSeries" :loading="loading">Start</v-btn>
    </template>
    <template v-else> Daily end </template>
  </v-card>
</template>
<script setup lang="ts">
import type { ResponseDTO } from "~/models/DTO/responseDTO";
import type { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";
import { QuestionDTO } from "~/models/question";
import type { UserSeriesDTO } from "~/models/series";

const question = ref<QuestionDTO | null>(null);
const loading = ref(false);
const seriesStarted = ref(false);
const { data: userSeries } = await useFetch<UserSeriesDTO>("/api/series/daily");
const nbrQuestion = computed(() => {
  return userSeries.value?.series.data.questionsIds.length;
});
const questionId = computed(() => {
  return userSeries.value?.userResponse?.data?.responses?.length ?? 0;
});

async function startSeries() {
  try {
    loading.value = true;
    await nextQuestion();
  } finally {
    loading.value = false;
  }
}

async function nextQuestion() {
  try {
    loading.value = true;
    question.value = await $fetch<QuestionDTO>("/api/question", {
      query: {
        id: userSeries.value?.series.data.questionsIds[
          userSeries.value?.userResponse?.data?.responses?.length ?? 0
        ],
      },
    });
  } finally {
    loading.value = false;
    seriesStarted.value = true;
  }
}

async function validateResponse(response: ResponseDTO) {
  if (!userSeries.value) return;
  const seriesResponse = {
    seriesId: userSeries.value.series.id,
    questionId: response.questionId,
    userResponseId: response.userResponseId,
  } as SeriesResponseDTO;

  userSeries.value.userResponse = await $fetch("/api/series/response", {
    method: "post",
    body: seriesResponse,
  });
}
</script>
