<template>
  <div class="w-full max-w-4xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Import QuipoQuiz
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Copiez-collez la sortie JSON de l'API QuipoQuiz ci-dessous pour extraire et importer
        automatiquement ses questions.
      </p>
    </div>

    <!-- Import Form Box -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
    >
      <form @submit.prevent="runImport" class="space-y-6">
        <!-- JSON Input -->
        <UFormField
          label="Données JSON de QuipoQuiz"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UTextarea
            v-model="sourceJson"
            placeholder='Collez le JSON ici (contenant "quizEntries" ou "questions_true_or_false")...'
            :rows="8"
            class="w-full font-mono text-xs"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            required
          />
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
    <div v-if="importedQuestions.length > 0 || skippedDuplicates.length > 0" class="space-y-6">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border"
        :class="
          importedQuestions.length > 0
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-slate-900/50 border-white/5'
        "
      >
        <div class="flex flex-wrap items-center gap-3">
          <span
            v-if="importedQuestions.length > 0"
            class="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-display font-black text-sm shadow-neon-green"
          >
            {{ importedQuestions.length }} importée(s)
          </span>
          <span
            v-if="skippedDuplicates.length > 0"
            class="bg-amber-600/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-display font-black text-sm"
          >
            {{ skippedDuplicates.length }} doublon(s) ignoré(s)
          </span>
          <span class="text-gray-200 text-sm font-semibold font-display">
            traitement terminé avec succès !
          </span>
        </div>

        <div class="flex items-center space-x-3" v-if="importedQuestions.length > 0">
          <UCheckbox
            v-model="hideAnswers"
            label="Cacher les réponses et explications"
            :ui="{ label: 'text-xs font-bold text-gray-400 font-display' }"
          />
        </div>
      </div>

      <!-- Preview list of imported questions -->
      <div v-if="importedQuestions.length > 0" class="space-y-4">
        <h3 class="text-sm font-extrabold text-gray-400 uppercase tracking-wider font-display">
          Questions Importées
        </h3>
        <div class="space-y-4 max-h-[500px] overflow-y-auto pr-1">
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

      <!-- Preview list of skipped duplicates -->
      <div v-if="skippedDuplicates.length > 0" class="space-y-4">
        <h3 class="text-sm font-extrabold text-gray-400 uppercase tracking-wider font-display">
          Doublons ignorés
        </h3>
        <div class="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          <div
            v-for="(title, index) in skippedDuplicates"
            :key="index"
            class="bg-amber-950/10 text-amber-200/80 border border-amber-500/10 rounded-xl px-4 py-2 text-xs font-medium"
          >
            {{ title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Theme } from "#shared/theme";
import QuestionForm from "~/components/admin/importquestions/QuestionForm.vue";

// Middleware admin
definePageMeta({
  middleware: "admin",
});

const sourceJson = ref("");
const selectedThemeNames = ref<string[]>([]);
const difficultyLabel = ref("Confirmé");
const loading = ref(false);
const hideAnswers = ref(false);
const importedQuestions = ref<any[]>([]);
const skippedDuplicates = ref<string[]>([]);

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
  if (!sourceJson.value.trim()) return false;
  try {
    JSON.parse(sourceJson.value);
  } catch {
    return false;
  }
  return selectedThemeNames.value.length > 0 && !!difficultyLabel.value;
});

async function runImport() {
  if (!isValidForm.value) return;

  try {
    loading.value = true;
    importedQuestions.value = [];
    skippedDuplicates.value = [];

    // Map theme names to slugs
    const selectedThemeSlugs = selectedThemeNames.value
      .map((name) => {
        const t = themes.value?.find((theme) => theme.name === name);
        return t ? t.slug : null;
      })
      .filter((slug): slug is string => slug !== null);

    const parsedJson = JSON.parse(sourceJson.value);

    const payload = {
      body: parsedJson,
      themes: selectedThemeSlugs,
      difficulty: selectedDifficultyValue.value,
    };

    const response = await $fetch<any>("/api/import/quipoquiz", {
      method: "post",
      body: payload,
    });

    if (response.success) {
      importedQuestions.value = response.questions || [];
      skippedDuplicates.value = response.duplicates || [];
      sourceJson.value = "";
    }
  } catch (err: any) {
    console.error("Erreur lors de l'import :", err);
    alert(
      "Une erreur s'est produite lors de l'importation. Veuillez vérifier que le JSON est valide.",
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
