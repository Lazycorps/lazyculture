<template>
  <v-card flat rounded class="mx-auto my-auto pa-5">
    <div class="d-flex flex-column" style="min-width: 300px; max-width: 500px">
      <template v-if="!user">
        <h2>Ascent Quizz</h2>
        <v-divider class="my-5"></v-divider>
        <v-btn @click="router.push('/login')" color="primary"
          >Please login to play</v-btn
        >
      </template>
      <template v-else>
        <div class="d-flex justify-space-between align-center">
          <h2>{{ userSeries?.series.title }}</h2>
          <div>
            <v-icon
              v-for="health in seriesHealthPoint"
              class="ml-2"
              icon="mdi-heart"
              :color="health > userHealthPoint ? 'grey' : 'pink'"
            >
            </v-icon>
          </div>
        </div>
        <div class="d-flex align-center">
          <v-progress-linear
            :indeterminate="loading"
            :model-value="questionId"
            :max="nbrQuestion"
            min="0"
            color="green"
            height="10"
            rounded
          ></v-progress-linear>
          <div style="min-width: 60px" class="ml-5">
            {{ questionId }} / {{ nbrQuestion }}
          </div>
        </div>
        <v-divider class="my-5"></v-divider>
        <template v-if="!userSeries?.userResponse?.data?.ended">
          <QuestionSeries
            v-if="seriesStarted"
            :question="question"
            :parentLoading="loading"
            @validate-response="validateResponse"
            @next-question="nextQuestion"
          ></QuestionSeries>
          <v-btn v-else @click="startSeries" color="green" :loading="loading"
            >{{ questionId > 0 ? "Reprendre" : "Démarer" }} l'ascension</v-btn
          >
        </template>
        <template v-else>
          <div class="d-flex flex-column align-center">
            <v-icon
              color="green"
              icon="mdi-image-filter-hdr"
              size="120"
            ></v-icon>
            <div>
              Résultat :
              {{ userSeries?.userResponse?.data?.responses?.length }} /
              {{ userSeries?.series?.data?.questionsIds?.length }}
            </div>
            <div>
              Expérience gagnée :
              {{ userSeries?.userResponse?.data?.xpEarned }}
            </div>
            <v-btn
              @click="startNewSeries"
              class="mt-5"
              color="primary"
              :loading="loading"
              >Nouvelle ascension</v-btn
            >
          </div>
        </template>
      </template>
    </div>
  </v-card>
</template>
<script setup lang="ts">
import type { ResponseDTO } from "~/models/DTO/responseDTO";
import type { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";
import { QuestionDTO } from "~/models/question";
import type { UserAscentSeriesDTO } from "~/models/series/seriesAscension";

const supabase = useSupabaseClient();
const {
  data: { user },
} = await supabase.auth.getUser();
const router = useRouter();
const question = ref<QuestionDTO | null>(null);
const loading = ref(false);
const seriesStarted = ref(false);
const { data: userSeries } = await useFetch<UserAscentSeriesDTO>(
  "/api/series/ascent"
);

const seriesHealthPoint = computed(() => {
  return userSeries.value?.series?.data?.healthPoint ?? 1;
});
const userHealthPoint = computed(() => {
  return (
    userSeries.value?.userResponse?.data?.healthPoint ?? seriesHealthPoint.value
  );
});
const nbrQuestion = computed(() => {
  return userSeries.value?.series?.data?.questionsIds.length;
});
const questionId = computed(() => {
  return userSeries.value?.userResponse?.data?.responses?.length ?? 0;
});

async function startNewSeries() {
  try {
    loading.value = true;
    userSeries.value = await $fetch<UserAscentSeriesDTO>("/api/series/ascent");
  } finally {
    loading.value = false;
  }
}

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
    const nexQuestion =
      userSeries.value?.userResponse?.data?.nextQuestion ??
      userSeries.value?.series?.data?.questionsIds[0];
    question.value = await $fetch<QuestionDTO>("/api/question", {
      query: {
        id: nexQuestion,
      },
    });
  } finally {
    loading.value = false;
    seriesStarted.value = true;
  }
}

async function validateResponse(response: ResponseDTO) {
  try {
    loading.value = true;
    if (!userSeries.value) return;
    const seriesResponse = {
      seriesId: userSeries.value.series.id,
      questionId: response.questionId,
      userResponseId: response.userResponseId,
    } as SeriesResponseDTO;

    userSeries.value.userResponse = await $fetch(
      "/api/series/ascent/response",
      {
        method: "post",
        body: seriesResponse,
      }
    );
  } finally {
    loading.value = false;
  }
}
</script>
