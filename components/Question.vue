<template>
  <div class="d-flex flex-column justify-center" style="max-width: 500px;">
    <h3>{{ question.data.libelle }}</h3>
    <v-item-group mandatory v-model="selectedResponse" class="mx-auto ma-5">
      <v-item v-for="proposition in question.data.propositions" v-slot="{ isSelected, toggle }">
        <v-btn style="width: 250px; margin-bottom: 5px; display: block" :value="proposition.id"
          :variant="isSelected ? 'tonal' : 'outlined'" :color="redResponse == proposition.id
            ? 'red'
            : greenResponse == proposition.id
              ? 'green'
              : isSelected
                ? 'green'
                : 'white'
            " @click="toggle(proposition.id)">
          {{ proposition.value }}
        </v-btn>
      </v-item>
    </v-item-group>
    <span class="mb-5">{{ commentaire }}</span>
    <v-btn v-if="commentaire" @click="NextQuestion()" :loading="loading" class="mx-auto" style="width: 250px"
      color="blue">
      Continuer
    </v-btn>
    <v-btn v-else @click="validateResponse()" class="mx-auto" style="width: 250px" color="green">
      Valider
    </v-btn>
  </div>
</template>
<script setup>
const { data: question } = await useAsyncData("question", getNewQuestion);
const commentaire = ref("");
const selectedResponse = ref();
const redResponse = ref();
const greenResponse = ref();
const loading = ref(false)

async function validateResponse() {
  commentaire.value = question.value.data.commentaire;
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
}
async function NextQuestion() {
  try {
    loading.value = true;
    question.value = await getNewQuestion();
    commentaire.value = "";
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
  } finally {
    loading.value = false;
  }
}

async function getNewQuestion() {
  return $fetch("/api/question/random");
}
</script>
