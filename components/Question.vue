<template>
  <v-skeleton-loader
    :loading="firstLoading"
    type="article, list-item,list-item,list-item,list-item, actions"
    width="500"
  >
    <div class="d-flex flex-column justify-center" style="max-width: 500px">
      <div class="d-flex flex-row justify-center mb-5" style="max-width: 500px">
        <v-icon class="mr-2">mdi-help-box-multiple-outline</v-icon>
        {{ question.themes.join(", ") }}
        <v-spacer></v-spacer>
        <QuestionReporting ref="questionReporting" :questionId="question.id" />
      </div>
      <h3>{{ question.data.libelle }}</h3>
      <v-img
        v-if="question.data.img"
        :src="question.data.img"
        height="200"
      ></v-img>
      <v-item-group mandatory v-model="selectedResponse" class="mx-auto ma-5">
        <v-item
          v-for="proposition in question.data.propositions"
          v-slot="{ isSelected, toggle }"
          :value="proposition.id"
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
          <p
            v-if="showXP"
            class="xp-text"
            style="position: absolute; left: 85%"
          >
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
  </v-skeleton-loader>
</template>
<script setup lang="ts">
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDTO } from "~/models/question";
import QuestionReporting from "./QuestionReporting.vue";

const props = defineProps<{ theme?: string }>();
const firstLoading = ref(true);
const loading = ref(true);
const commentaire = ref("");
const responded = ref(false);
const selectedResponse = ref();
const redResponse = ref();
const greenResponse = ref();
const xpWin = ref(0);
const showXP = ref(false);
const question = ref(new QuestionDTO());
const questionReporting = ref<InstanceType<typeof QuestionReporting> | null>(
  null
);

onMounted(() => {
  try {
    NextQuestion();
  } catch (err) {}
});

async function validateResponse() {
  try {
    loading.value = true;
    responded.value = true;
    commentaire.value = question.value.data.commentaire;
    const reponseDTO = new ResponseDTO();
    reponseDTO.questionId = question.value.id;
    reponseDTO.userResponseId = selectedResponse.value;
    if (selectedResponse.value == question.value.data.response) {
      greenResponse.value = selectedResponse.value;
      selectedResponse.value = null;
    } else {
      redResponse.value = selectedResponse.value;
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
    const newQuestion = await getNewQuestion();

    if (questionReporting.value) {
      questionReporting.value.reported = false;
    }

    responded.value = false;
    question.value = newQuestion;
    commentaire.value = "";
    selectedResponse.value = null;
    redResponse.value = null;
    greenResponse.value = null;
  } finally {
    loading.value = false;
    firstLoading.value = false;
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
