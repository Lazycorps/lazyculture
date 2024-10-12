<template>
  <v-card flat rounded class="mx-auto my-auto pa-5">
    <QuestionSeries :question="route.params.id"></QuestionSeries>
  </v-card>
</template>
<script setup>
import { QuestionDTO } from "~/models/question";

const route = useRoute();
const question = ref(new QuestionDTO());
const { data: series } = await useFetch("/api/series/daily");
</script>
