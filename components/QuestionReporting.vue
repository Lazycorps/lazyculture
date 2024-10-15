<template>
  <v-icon @click="dialog = true" color="orange-lighten-2" :disabled="reported" icon="mdi-flag" />
  <v-dialog v-model="dialog" max-width="450" :opacity="0.5" scrim="black">
    <v-card class="pa-5">
      <form @submit.prevent="reportQuestion">
        <v-checkbox v-for="(reason, index) in defaultReasons" v-model="selectedReasons" :key="index" :label="reason"
          :value="reason" style="height: 50px;"></v-checkbox>
        <v-textarea class="mt-5" clearable label="Commentaire" v-model="comment" variant="outlined" :no-resize="true">
        </v-textarea>
        <div class="d-flex">
          <v-btn type="submit" :loading="loadingReporting" style="width: 250px" class="mx-auto" color="green">
            Envoyer
          </v-btn>
        </div>
      </form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ReportingDTO } from '~/models/DTO/reportingDTO';

const props = defineProps<{
  questionId: number;
}>();

const reported = ref(false);
const dialog = ref(false);
const comment = ref("");
const loadingReporting = ref(false);
const defaultReasons = ["Question imprécise", "Réponse incorrecte", "Image manquante"];
const selectedReasons = ref<string[]>([]); // Liste des raisons sélectionnées

async function reportQuestion() {
  try {
    loadingReporting.value = true;

    const reasonsText = selectedReasons.value.length > 0 ? selectedReasons.value.join(", ") : "";
    const reportingDto = new ReportingDTO();

    reportingDto.questionId = props.questionId;
    reportingDto.comment = comment.value || reasonsText ? `${comment.value} ${reasonsText}`.trim() : "Question à vérifier";

    await $fetch("/api/question/report", {
      method: "post",
      body: { ...reportingDto },
    });

    reported.value = true;
    comment.value = "";
    selectedReasons.value = [];
  }
  finally {
    loadingReporting.value = false;
    dialog.value = false;
  }
}

defineExpose({
  reported
});
</script>