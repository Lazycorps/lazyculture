<template>
  <pre>{{ question.data.libelle }}</pre>
  <v-btn-toggle v-model="selectedResponse" divided class="d-flex">
    <v-btn
      v-for="proposition in question.data.proposition"
      style="width: 200px; margin-bottom: 5px; display: block"
      :value="proposition.id"
      variant="outlined"
    >
      {{ proposition.value }}
    </v-btn>
  </v-btn-toggle>
  <v-btn
    @click="validateResponse()"
    style="width: 200px; margin-bottom: 5px"
    variant="outlined"
  >
    Valider
  </v-btn>
  {{ result }}
</template>
<script setup>
const { data: question } = await useFetch("/api/question/question");
const result = ref("");
const selectedResponse = ref();

function validateResponse() {
  if (selectedResponse.value == question.value.data.response)
    result.value = "Bravo !";
  else result.value = "Looser !";
}
</script>
