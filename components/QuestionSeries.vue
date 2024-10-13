<template>
  <div class="d-flex flex-column justify-center" style="max-width: 500px">
    <div class="d-flex flex-row justify-center mb-5" style="max-width: 500px">
      <v-icon class="mr-2">mdi-help-box-multiple-outline</v-icon>
      {{ question?.themes.join(", ") }}
      <v-spacer></v-spacer>
      <v-progress-circular v-if="loadingReporting" indeterminate>
      </v-progress-circular>
      <v-icon
        v-else
        @click="reportQuestion()"
        color="orange-lighten-2"
        :disabled="reported"
        icon="mdi-flag"
        :loading="loadingReporting"
      >
      </v-icon>
    </div>
    <h3>{{ question?.data.libelle }}</h3>
    <v-item-group mandatory v-model="selectedResponse" class="mx-auto ma-5">
      <v-item
        v-for="proposition in question?.data.propositions"
        v-slot="{ isSelected, toggle }"
      >
        <v-btn
          style="min-width: 250px; margin-bottom: 5px; display: block"
          class="mx-auto"
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
      v-if="responded"
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
        <p v-if="showXP" class="xp-text" style="position: absolute; left: 85%">
          + {{ xpWin }} xp
        </p>
      </transition>
    </span>
    <v-btn
      v-if="!responded"
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
import { ReportingDTO } from "~/models/DTO/reportingDTO";
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDTO } from "~/models/question";

const props = defineProps<{ question?: QuestionDTO | null }>();
const loading = ref(true);
const loadingReporting = ref(false);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref();
const redResponse = ref();
const greenResponse = ref();
const xpWin = ref(0);
const showXP = ref(false);
const reported = ref(false);

const emit = defineEmits<{
  validateResponse: [response: ResponseDTO];
  nextQuestion: [];
}>();

async function validateResponse() {
  try {
    if (!props.question) return;
    loading.value = true;
    responded.value = true;
    commentaire.value = props.question?.data.commentaire;
    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = props.question?.id;
    reponseDTO.userResponseId = selectedResponse.value + 1;
    if (
      props.question.data.propositions[selectedResponse.value].id ==
      props.question.data.response
    ) {
      greenResponse.value = selectedResponse.value + 1;
      selectedResponse.value = null;
    } else {
      redResponse.value = selectedResponse.value + 1;
      selectedResponse.value = null;
      greenResponse.value = props.question.data.response;
    }

    const responseResult = await $fetch("/api/response/validate", {
      method: "post",
      body: { ...reponseDTO },
    });
    gainXP(responseResult?.xpEarned ?? 0);
    emit("validateResponse", reponseDTO);
  } finally {
    loading.value = false;
  }
}

async function NextQuestion() {
  try {
    loading.value = true;
    responded.value = false;
    commentaire.value = "";
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
    reported.value = false;
    loadingReporting.value = false;
    emit("nextQuestion");
  } finally {
    loading.value = false;
  }
}

async function reportQuestion() {
  try {
    if (!props.question) return;

    loadingReporting.value = true;
    const reportingDto = new ReportingDTO();
    reportingDto.questionId = props.question.id;
    await $fetch("/api/question/report", {
      method: "post",
      body: { ...reportingDto },
    });
    reported.value = true;
  } finally {
    loadingReporting.value = false;
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
  font-family: "Quicksand", sans-serif;
  /* Ou 'Quicksand', selon ta préférence */
  font-weight: 600;
  font-size: 1rem;
  /* Ajuste selon tes besoins */
  color: #ffcc00;
  /* Jaune or pour un effet de gain d'XP */
  text-align: center;
}
</style>
