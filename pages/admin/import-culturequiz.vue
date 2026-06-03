<template>
  <div class="w-full max-w-4xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Import CultureQuiz
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Saisissez l'URL d'un quiz de CultureQuiz pour extraire et importer automatiquement ses
        questions.
      </p>
    </div>

    <!-- Import Form Box -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
    >
      <form @submit.prevent="runImport" class="space-y-6">
        <!-- URL Input -->
        <UFormField
          label="URL du Quiz CultureQuiz"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UInput
            v-model="importUrl"
            placeholder="Ex: https://www.culturequizz.com/quizz/les-capitales-du-monde"
            class="w-full"
            icon="i-heroicons-globe-alt"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white font-medium pl-10' }"
            required
          />
          <template #hint>
            <span class="text-[10px] text-gray-500 font-medium"
              >Doit commencer par https://www.culturequizz.com/</span
            >
          </template>
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Themes Multi-select -->
          <UFormField
            label="Thèmes associés"
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            }"
          >
            <USelectMenu
              v-model="selectedThemeNames"
              multiple
              :items="themeNames"
              class="w-full"
              placeholder="Sélectionner un ou plusieurs thèmes..."
              :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
            />
          </UFormField>

          <!-- Difficulty Select -->
          <UFormField
            label="Difficulté par défaut"
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            }"
          >
            <USelectMenu
              v-model="difficultyLabel"
              :items="difficultyLabels"
              class="w-full"
              placeholder="Sélectionner la difficulté..."
              :ui="{ base: 'bg-[#111827] border border-white/10 text-white' }"
            />
          </UFormField>
        </div>

        <div class="flex justify-end pt-2">
          <UButton
            type="submit"
            color="primary"
            size="lg"
            icon="i-heroicons-cloud-arrow-up"
            :loading="loading"
            class="font-black font-display uppercase tracking-wider px-8 shadow-neon"
            :disabled="!isValidForm"
          >
            Lancer l'importation
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Success & Preview Section -->
    <div v-if="importedQuestions.length > 0" class="space-y-6">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-950/20 backdrop-blur border border-emerald-500/30 p-4 rounded-xl"
      >
        <div class="flex items-center space-x-3">
          <span
            class="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-display font-black text-sm shadow-neon-green"
          >
            {{ importedQuestions.length }} questions
          </span>
          <span class="text-gray-200 text-sm font-semibold font-display">
            importées avec succès dans l'application !
          </span>
        </div>

        <div class="flex items-center space-x-3">
          <UCheckbox
            v-model="hideAnswers"
            label="Cacher les réponses et explications"
            :ui="{ label: 'text-xs font-bold text-gray-400 font-display' }"
          />
        </div>
      </div>

      <!-- Preview list -->
      <div class="space-y-4 max-h-[600px] overflow-y-auto pr-1">
        <div
          v-for="(question, index) in importedQuestions"
          :key="question.id"
          class="relative bg-slate-950/20 rounded-2xl border border-white/5 p-4 space-y-4"
        >
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="font-extrabold text-sm text-violet-400 font-display">
              Question importée #{{ index + 1 }} (ID: {{ question.id }})
            </span>
          </div>

          <!-- Question preview using existing form -->
          <QuestionForm :question="question.data" :hide-answers="hideAnswers" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Theme } from "~/models/theme";
import QuestionForm from "~/components/admin/importquestions/QuestionForm.vue";

// Middleware admin
definePageMeta({
  middleware: "admin",
});

const importUrl = ref("");
const selectedThemeNames = ref<string[]>([]);
const difficultyLabel = ref("Confirmé");
const loading = ref(false);
const hideAnswers = ref(false);
const importedQuestions = ref<any[]>([]);

const difficultyLabels = ["Débutant", "Confirmé", "Expert", "Diabolique", "Impossible"];

const selectedDifficultyValue = computed(() => {
  return difficultyLabels.indexOf(difficultyLabel.value) + 1;
});

// Fetch themes list
const { data: themes } = await useFetch<Theme[]>("/api/theme/all");

const themeNames = computed(() => {
  return themes.value?.map((t) => t.name) ?? [];
});

const isValidForm = computed(() => {
  return (
    importUrl.value.trim().startsWith("https://www.culturequizz.com/") &&
    selectedThemeNames.value.length > 0 &&
    difficultyLabel.value
  );
});

async function runImport() {
  if (!isValidForm.value) return;

  try {
    loading.value = true;
    importedQuestions.value = [];

    // Map theme names to slugs
    const selectedThemeSlugs = selectedThemeNames.value
      .map((name) => {
        const t = themes.value?.find((theme) => theme.name === name);
        return t ? t.slug : null;
      })
      .filter((slug): slug is string => slug !== null);

    const payload = {
      url: importUrl.value.trim(),
      themes: selectedThemeSlugs,
      difficulty: selectedDifficultyValue.value,
    };

    const response = await $fetch<any[]>("/api/import/culturequizz", {
      method: "post",
      body: payload,
    });

    importedQuestions.value = response;
    importUrl.value = "";
  } catch (err: any) {
    console.error("Erreur lors de l'import :", err);
    alert(
      "Une erreur s'est produite lors de l'importation. Veuillez vérifier que l'URL est correcte et accessible.",
    );
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
