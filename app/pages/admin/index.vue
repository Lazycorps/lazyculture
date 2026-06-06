<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
      >
        Admin Control Center
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Bienvenue dans l'espace d'administration. Supervisez le contenu du jeu et gérez la base de
        questions.
      </p>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Questions Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group"
      >
        <div class="space-y-1">
          <p
            class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
          >
            Questions totales
          </p>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-white">{{ questions?.length ?? 0 }}</span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xl text-violet-400 group-hover:scale-110 transition-transform"
          >
            ❓
          </div>
        </div>
      </UCard>

      <!-- Total Themes Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group"
      >
        <div class="space-y-1">
          <p
            class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
          >
            Thèmes créés
          </p>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-white">{{ themes?.length ?? 0 }}</span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xl text-indigo-400 group-hover:scale-110 transition-transform"
          >
            📚
          </div>
        </div>
      </UCard>

      <!-- Reported Questions Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group"
      >
        <div class="space-y-1">
          <p
            class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
          >
            Signalements actifs
          </p>
          <div class="flex items-baseline space-x-2">
            <span
              class="text-3xl font-black"
              :class="reportedCount > 0 ? 'text-amber-400' : 'text-emerald-400'"
            >
              {{ reportedCount }}
            </span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-xl text-amber-400 group-hover:scale-110 transition-transform"
          >
            ⚠️
          </div>
        </div>
      </UCard>

      <!-- Deleted Questions Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group"
      >
        <div class="space-y-1">
          <p
            class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
          >
            Questions désactivées
          </p>
          <div class="flex items-baseline space-x-2">
            <span class="text-3xl font-black text-gray-400">{{ deletedCount }}</span>
          </div>
          <div
            class="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-xl text-red-400 group-hover:scale-110 transition-transform"
          >
            🗑️
          </div>
        </div>
      </UCard>
    </div>

    <!-- Navigation Shortcuts Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-black font-display text-white tracking-wide">
        Actions d'administration
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Maintenance Card -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
        >
          <div class="space-y-4">
            <h4
              class="text-sm font-extrabold uppercase tracking-wider text-violet-400 font-display"
            >
              🔧 Maintenance & Contenu
            </h4>
            <p class="text-xs text-gray-400 font-medium">
              Éditez la base de questions existante, gérez les signalements faits par la communauté,
              ou gérez les thèmes disponibles.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <UButton
                to="/admin/maintenance/questions"
                color="primary"
                icon="i-heroicons-question-mark-circle"
                class="flex-1 font-bold font-display text-xs justify-center py-2.5"
              >
                Gérer les questions
              </UButton>
              <UButton
                to="/admin/maintenance/themes"
                color="neutral"
                variant="subtle"
                icon="i-heroicons-book-open"
                class="flex-1 font-bold font-display text-xs justify-center py-2.5"
              >
                Gérer les thèmes
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Import Card -->
        <UCard
          class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
        >
          <div class="space-y-4">
            <h4 class="text-sm font-extrabold uppercase tracking-wider text-cyan-400 font-display">
              📥 Importation massive
            </h4>
            <p class="text-xs text-gray-400 font-medium">
              Ajoutez de nouvelles séries de questions en copiant-collant des structures JSON ou en
              ciblant des URL de quiz CultureQuiz.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <UButton
                to="/admin/importquestions"
                color="primary"
                icon="i-heroicons-arrow-up-tray"
                class="flex-1 font-bold font-display text-xs justify-center py-2.5"
              >
                Import JSON
              </UButton>
              <UButton
                to="/admin/import-culturequiz"
                color="neutral"
                variant="subtle"
                icon="i-heroicons-globe-alt"
                class="flex-1 font-bold font-display text-xs justify-center py-2.5"
              >
                Import CultureQuiz
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuestionDTO } from "#shared/question";
import type { Theme } from "#shared/theme";

definePageMeta({
  middleware: "admin",
});

// Fetch both datasets to calculate counts dynamically
const { data: questions } = await useFetch<QuestionDTO[]>("/api/question/all");
const { data: themes } = await useFetch<Theme[]>("/api/theme/all");

const reportedCount = computed(() => {
  return (questions.value ?? []).filter((q) => q.reportings.some((r) => !r.closed)).length;
});

const deletedCount = computed(() => {
  return (questions.value ?? []).filter((q) => q.deleted).length;
});
</script>
