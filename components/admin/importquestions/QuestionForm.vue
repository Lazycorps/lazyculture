<template>
  <UCard
    class="shadow-glass bg-[#111827]/60 border border-white/10 rounded-2xl p-4 mb-4 select-none"
    :ui="{ body: { padding: 'p-0' } }"
  >
    <div class="space-y-4">
      <!-- Title input -->
      <UFormField
        label="Intitulé de la question"
        :ui="{
          label: { text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display' },
        }"
      >
        <UInput
          v-model="question.libelle"
          placeholder="Entrez la question..."
          class="w-full"
          :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
        />
      </UFormField>

      <!-- Image Preview if there is one -->
      <div
        v-if="question.img"
        class="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 h-32 w-full flex items-center justify-center"
      >
        <img :src="question.img" alt="img question" class="max-h-full max-w-full object-contain" />
      </div>

      <!-- Select row: Type, Difficulty, Themes -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField
          label="Type"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <USelectMenu
            v-model="question.type"
            :items="questionTypes"
            class="w-full"
            placeholder="Type de question"
            :ui="{ background: 'bg-[#111827] border border-white/10 text-white' }"
          />
        </UFormField>

        <UFormField
          label="Difficulté"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <USelectMenu
            v-model="question.difficulty"
            :items="questionDifficulties"
            class="w-full"
            placeholder="Niveau"
            :ui="{ background: 'bg-[#111827] border border-white/10 text-white' }"
          />
        </UFormField>

        <UFormField
          label="Thème(s)"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <USelectMenu
            v-model="question.theme"
            multiple
            :items="themeItems"
            value-attribute="value"
            option-attribute="label"
            class="w-full"
            placeholder="Thèmes"
            :ui="{ background: 'bg-[#111827] border border-white/10 text-white' }"
          />
        </UFormField>
      </div>

      <!-- Responses / Propositions -->
      <div class="space-y-2">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display">
          Propositions de réponses
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(prop, propIndex) in question.propositions"
            :key="propIndex"
            class="relative flex items-center"
          >
            <div class="absolute left-3 text-xs font-bold text-gray-500 font-display">
              #{{ propIndex + 1 }}
            </div>
            <UInput
              v-model="prop.value"
              readonly
              class="w-full pl-8"
              :ui="{
                background:
                  !hideAnswers && question.response == propIndex + 1
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-neon-green'
                    : 'bg-white/5 border border-white/10 text-white/80',
              }"
            />
            <span
              v-if="!hideAnswers && question.response == propIndex + 1"
              class="absolute right-3 flex items-center text-emerald-400 text-xs font-bold font-display"
            >
              Correct
            </span>
          </div>
        </div>
      </div>

      <!-- Comment field -->
      <UFormField
        v-if="!hideAnswers"
        label="Commentaire"
        :ui="{
          label: { text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display' },
        }"
      >
        <UInput
          v-model="question.commentaire"
          placeholder="Explication ou commentaire sur la réponse..."
          class="w-full"
          :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
        />
      </UFormField>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { QuestionDataDTO } from "~/models/question";
import { computed } from "vue";

const questionTypes = ["choix", "boolean"];
const questionDifficulties = [1, 2, 3, 4, 5];

defineProps({
  question: {
    type: Object, // Changed to Object to avoid DTO runtime validation strictness if any
    required: true,
  },
  hideAnswers: {
    type: Boolean,
    required: true,
    default: true,
  },
});

// Fetch themes list to select from
const { data: themes } = await useFetch<any[]>("/api/theme/all");
const themeItems = computed(() => {
  return themes.value?.map((t: any) => ({ label: t.name, value: t.slug })) || [];
});
</script>

<style scoped>
/* Question Form custom styles */
</style>
