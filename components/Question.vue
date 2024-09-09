<template>
  <div class="d-flex flex-column justify-center" style="max-width: 500px">
    <h3>{{ question.data.libelle }}</h3>
    <v-item-group mandatory v-model="selectedResponse" class="mx-auto ma-5">
      <v-item
        v-for="proposition in question.data.propositions"
        v-slot="{ isSelected, toggle }"
      >
        <v-btn
          style="width: 250px; margin-bottom: 5px; display: block"
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
          @click="toggle"
        >
          {{ proposition.value }}
        </v-btn>
      </v-item>
    </v-item-group>
    <span class="mb-5">{{ commentaire }}</span>
    <span
      v-if="commentaire"
      class="d-flex justify-center align-center"
      style="position: relative"
    >
      <v-btn
        @click="NextQuestion()"
        :loading="loading"
        class="mx-auto"
        style="width: 250px"
        color="blue"
      >
        Continuer
      </v-btn>
      <transition name="fade">
        <p v-if="showXP" class="xp-text" style="position: absolute; left: 80%">
          + {{ xpWin }} xp
        </p>
      </transition>
    </span>
    <v-btn
      v-if="!commentaire"
      @click="validateResponse()"
      style="width: 250px"
      class="mx-auto"
      color="green"
      :disabled="selectedResponse == null"
    >
      Valider
    </v-btn>
  </div>
</template>
<script setup lang="ts">
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDTO } from "~/models/question";

const props = defineProps<{ theme?: string }>();
//const { data: question } = await useAsyncData("question", getNewQuestion);
const commentaire = ref("");
const selectedResponse = ref();
const redResponse = ref();
const greenResponse = ref();
const xpWin = ref(0);
const showXP = ref(false);
const loading = ref(false);
const question = ref(new QuestionDTO());

onMounted(() => {
  try {
    NextQuestion();
  } catch (err) {}
});

async function validateResponse() {
  try {
    loading.value = true;
    commentaire.value = question.value.data.commentaire;

    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = question.value.id;
    reponseDTO.userResponseId = selectedResponse.value + 1;
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

    const responseResult = await $fetch("/api/response/validate", {
      method: "post",
      body: { ...reponseDTO },
    });
    gainXP(responseResult?.xpEarned ?? 0);
  } finally {
    loading.value = false;
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

function gainXP(amount: number) {
  if (amount == 0) return;

  xpWin.value = amount;
  showXP.value = true;

  // Cache le texte après 2 secondes
  setTimeout(() => {
    showXP.value = false;
  }, 1000);
}

async function getNewQuestion() {
  if (props.theme)
    return $fetch<QuestionDTO>("/api/question/random?theme=" + props.theme);
  else return $fetch<QuestionDTO>("/api/question/random");
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.xp-text {
  font-family: "Quicksand", sans-serif; /* Ou 'Quicksand', selon ta préférence */
  font-weight: 600;
  font-size: 1rem; /* Ajuste selon tes besoins */
  color: #ffcc00; /* Jaune or pour un effet de gain d'XP */
  text-align: center;
}
</style>
