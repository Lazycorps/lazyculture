<template>
  <pre>{{ question.data.libelle }}</pre>
  <v-item-group mandatory v-model="selectedResponse" class="ma-5">
    <v-item
      v-for="proposition in question.data.proposition"
      v-slot="{ isSelected, toggle }"
    >
      <v-btn
        style="width: 200px; margin-bottom: 5px; display: block"
        :value="proposition.id"
        :variant="isSelected ? 'tonal' : 'outlined'"
        :color="isSelected ? 'green' : 'blue'"
        @click="toggle(proposition.id)"
      >
        {{ proposition.value }}
      </v-btn>
    </v-item>
  </v-item-group>
  <v-btn
    @click="validateResponse()"
    class="ma-5"
    style="width: 200px"
    color="green"
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
  if (
    question.value.data.proposition[selectedResponse.value].id ==
    question.value.data.response
  )
    result.value = "Bravo !";
  else result.value = "Looser !";
}
</script>
