<template>
  <v-icon v-else @click="dialog = true" color="orange-lighten-2" :disabled="reported" icon="mdi-flag" />
  <v-dialog 
    v-model="dialog"
    class="d-flex flex-column justify-center" 
    style="max-width: 450px; max-height: 300px; background-color: black; color: white;">
    <form @submit.prevent="reportQuestion">
      <v-checkbox-group v-model="selectedReasons">
        <v-checkbox
          v-for="(reason, index) in defaultReasons"
          :key="index"
          :label="reason"
          :value="reason"
        ></v-checkbox>
      </v-checkbox-group>
      <v-textarea 
        clearable 
        label="Commentaire" 
        v-model="comment" 
        variant="underlined" 
        :no-resize="true">
      </v-textarea>
      <v-btn 
        type="submit" 
        :loading="loadingReporting" 
        style="width: 250px" 
        class="mx-auto" 
        color="green">
        Envoyer
      </v-btn>
    </form>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ questionId: number }>();

const reported = ref(false);
const dialog = ref(false);
const comment = ref("");
const loadingReporting = ref(false);
const defaultReasons = ["Question imprécise", "Réponse incorrecte", "Image manquante"];
const selectedReasons = ref<string[]>([]); // Liste des raisons sélectionnées

async function reportQuestion() {
  try {
    loadingReporting.value = true;

    const reasonsText = selectedReasons.value.length > 0 ? `Raisons : ${selectedReasons.value.join(", ")}.` : "";
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
</script>