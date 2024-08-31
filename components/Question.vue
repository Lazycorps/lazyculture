<template>
  <div class="d-flex flex-column justify-center">
    <h3>{{ question.data.libelle }}</h3>
    <v-item-group mandatory v-model="selectedResponse" class="mx-auto ma-5">
      <v-item
        v-for="proposition in question.data.propositions"
        v-slot="{ isSelected, toggle }"
      >
        <v-btn
          style="width: 200px; margin-bottom: 5px; display: block"
          :value="proposition.id"
          :variant="isSelected ? 'tonal' : 'outlined'"
          :color="
            redResponse == proposition.id
              ? 'red'
              : greenResponse == proposition.id
              ? 'green'
              : isSelected
              ? 'green'
              : 'white'
          "
          @click="toggle(proposition.id)"
        >
          {{ proposition.value }}
        </v-btn>
      </v-item>
    </v-item-group>
    <v-btn
      @click="validateResponse()"
      class="mx-auto"
      style="width: 200px"
      color="green"
    >
      Valider
    </v-btn>
    {{ result }}
  </div>
</template>
<script setup>
const { data: question } = await useAsyncData("question", getNewQuestion);
const result = ref("");
const selectedResponse = ref();
const redResponse = ref();
const greenResponse = ref();

async function validateResponse() {
  if (
    question.value.data.propositions[selectedResponse.value].id ==
    question.value.data.response
  ) {
    greenResponse.value = selectedResponse.value + 1;
    selectedResponse.value = null;
  } else {
    redResponse.value = selectedResponse.value + 1;
    selectedResponse.value = null;
    greenResponse.value = question.value.data.response;
  }

  setTimeout(async () => {
    question.value = await getNewQuestion();
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
  }, 2000);
}

async function getNewQuestion() {
  return $fetch("/api/question/question");
}
</script>
