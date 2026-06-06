<template>
  <div class="w-full max-w-4xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Import des Questions
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Collez vos données de questions au format JSON ci-dessous pour les importer dans
        l'application.
      </p>
    </div>

    <!-- JSON Source Box -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <div class="space-y-4">
        <UFormField
          label="Source JSON"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UTextarea
            v-model="sourceJson"
            placeholder='[{"libelle": "Question ?", "type": "choix", "difficulty": 2, "theme": ["culture_generale"], "response": 1, "propositions": [{"id": 1, "value": "Oui", "img": ""}], "commentaire": "Explication"}]'
            :rows="6"
            class="w-full"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white font-mono text-sm' }"
          />
        </UFormField>

        <div class="flex justify-end pt-2">
          <UButton
            color="primary"
            size="md"
            icon="i-heroicons-arrow-path"
            class="font-bold font-display uppercase tracking-wider px-6"
            @click="loadJsonIntoQuestions"
          >
            Charger les questions
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Questions Preview List -->
    <div v-if="questionsfromJson.length > 0" class="space-y-6">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur border border-white/5 p-4 rounded-xl"
      >
        <div class="flex items-center space-x-3">
          <span
            class="bg-violet-600/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-full font-display font-black text-sm"
          >
            {{ questionsfromJson.length }} questions
          </span>
          <span class="text-gray-300 text-sm font-semibold font-display"
            >détectées et prêtes à l'import</span
          >
        </div>

        <!-- Toggle options -->
        <div class="flex items-center space-x-3">
          <UCheckbox
            v-model="hideAnswers"
            label="Cacher les bonnes réponses et explications"
            :ui="{ label: 'text-xs font-bold text-gray-400 font-display' }"
          />
        </div>
      </div>

      <!-- Preview list -->
      <div class="space-y-4 max-h-[600px] overflow-y-auto pr-1">
        <div
          v-for="(question, index) in questionsfromJson"
          :key="index"
          class="relative bg-slate-950/20 rounded-2xl border border-white/5 p-4 space-y-4"
        >
          <!-- Top controls for this question -->
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="font-extrabold text-sm text-violet-400 font-display"
              >Question #{{ index + 1 }}</span
            >
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              class="font-semibold text-xs hover:bg-red-500/10"
              @click="removeFromQuestions(index)"
            >
              Supprimer
            </UButton>
          </div>

          <QuestionForm :question="question" :hide-answers="hideAnswers" />
        </div>
      </div>

      <!-- Import trigger button -->
      <div class="flex justify-end pt-4">
        <UButton
          color="success"
          size="lg"
          icon="i-heroicons-cloud-arrow-up"
          :loading="loading"
          class="font-black font-display uppercase tracking-widest px-8 shadow-neon-green"
          @click="sendToApi"
        >
          Importer {{ questionsfromJson.length }} questions
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { QuestionDataDTO } from "#shared/question";
import QuestionForm from "~/components/admin/importquestions/QuestionForm.vue";

// Define admin middleware if necessary
definePageMeta({
  middleware: "admin",
});

const hideAnswers = ref(true);
const loading = ref(false);
const sourceJson = ref("");
const questionsfromJson = ref<QuestionDataDTO[]>([]);

function loadJsonIntoQuestions() {
  if (!sourceJson.value.trim()) return;

  try {
    const json = JSON.parse(sourceJson.value);
    questionsfromJson.value = [];

    if (Array.isArray(json)) {
      for (const questionData of json) {
        questionsfromJson.value.push(questionData);
      }
    } else {
      // Single object
      questionsfromJson.value.push(json);
    }
  } catch (error) {
    console.error("Format JSON invalide :", error);
    alert("Le format JSON entré est invalide. Veuillez vérifier vos données.");
  }
}

function removeFromQuestions(index: number) {
  questionsfromJson.value.splice(index, 1);
}

async function sendToApi() {
  try {
    loading.value = true;
    if (questionsfromJson.value.length === 0) return;
    await $fetch("/api/import/importquestions", {
      method: "post",
      body: questionsfromJson.value,
    });
    // Success notification could be added here
    sourceJson.value = "";
    questionsfromJson.value = [];
  } catch (err) {
    console.error("Erreur lors de l'import :", err);
    alert("Une erreur s'est produite lors de l'importation.");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Scrollbar custom styles */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
