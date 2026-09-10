<template>
  <div class="w-full select-none space-y-4">
    <!-- Header of the Review Card -->
    <div class="flex items-center justify-between pb-2 border-b border-white/5">
      <div class="flex items-center space-x-2">
        <div
          class="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400"
        >
          <UIcon name="i-heroicons-document-magnifying-glass" class="text-lg" />
        </div>
        <div>
          <h3 class="text-sm sm:text-base font-black font-display text-white tracking-wide">
            Revue des questions
          </h3>
          <p class="text-[10px] sm:text-xs text-gray-400 font-medium font-display">
            Revoyez vos réponses et les explications détaillées
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <span
          v-if="reviewData"
          class="text-[10px] sm:text-xs font-black font-display px-2.5 py-0.5 rounded-full"
          :class="
            reviewData.score >= reviewData.totalQuestions / 2
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          "
        >
          {{ correctCount }}/{{ reviewData.totalQuestions }} Réussies
        </span>

        <button
          type="button"
          class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          :title="isOpen ? 'Replier la revue' : 'Déplier la revue'"
          @click="isOpen = !isOpen"
        >
          <UIcon
            :name="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="text-base block"
          />
        </button>
      </div>
    </div>

    <!-- Expandable Content -->
    <div v-show="isOpen" class="space-y-4">
      <!-- Loading State -->
      <div v-if="status === 'pending'" class="py-8 text-center space-y-3">
        <UIcon
          name="i-heroicons-arrow-path"
          class="text-2xl text-violet-400 animate-spin mx-auto"
        />
        <p class="text-xs text-gray-400 font-medium font-display">
          Chargement des questions et explications...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="py-4 px-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-2"
      >
        <p class="text-xs text-rose-300 font-medium">
          {{ error.data?.statusMessage || "Impossible de charger la revue des questions." }}
        </p>
        <UButton size="xs" color="error" variant="ghost" @click="() => refresh()">
          Réessayer
        </UButton>
      </div>

      <!-- Single Question Stepper View -->
      <template v-else-if="reviewData && currentQuestion">
        <!-- Top Navigation Bar: Question Buttons with Result Indicators (1..10) -->
        <div class="space-y-1.5">
          <div
            class="flex items-center justify-between text-[11px] font-display font-bold text-gray-400 px-0.5"
          >
            <span>Questions</span>
            <span class="text-gray-500 text-[10px]">Cliquez sur un numéro pour y accéder</span>
          </div>

          <div
            class="grid grid-cols-10 gap-1 sm:gap-1.5 p-1.5 bg-slate-950/60 rounded-xl border border-white/5"
          >
            <button
              v-for="(q, index) in reviewData.questions"
              :key="q.questionId"
              type="button"
              class="flex flex-col items-center justify-center py-1 sm:py-1.5 rounded-lg border text-[11px] font-black font-display transition-all duration-200 cursor-pointer"
              :class="[
                q.isCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/30',
                currentIndex === index
                  ? 'ring-2 ring-violet-400 scale-110 shadow-lg shadow-violet-500/30 z-10 brightness-125'
                  : 'opacity-85 hover:opacity-100',
              ]"
              :title="`Question ${q.order} : ${q.isCorrect ? 'Réussie' : 'Erreur'}`"
              @click="currentIndex = index"
            >
              <span>{{ q.order }}</span>
              <UIcon
                :name="q.isCorrect ? 'i-heroicons-check' : 'i-heroicons-x-mark'"
                class="text-[9px] mt-0.5"
              />
            </button>
          </div>
        </div>

        <!-- Single Question Card with Animated Transition -->
        <Transition name="fade-slide" mode="out-in">
          <div
            :key="currentQuestion.questionId"
            class="bg-slate-950/70 border rounded-xl overflow-hidden p-3.5 space-y-3 transition-all duration-200"
            :class="
              currentQuestion.isCorrect
                ? 'border-emerald-500/25 shadow-emerald-500/5'
                : 'border-rose-500/25 shadow-rose-500/5'
            "
          >
            <!-- Card Header (Meta, Themes, Status, Reporting) -->
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <!-- Order Badge -->
                  <span
                    class="text-[10px] font-black font-display px-2 py-0.5 rounded-md uppercase tracking-wider"
                    :class="
                      currentQuestion.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    "
                  >
                    Question {{ currentQuestion.order }} / {{ reviewData.totalQuestions }}
                  </span>

                  <!-- Status Pill -->
                  <span
                    class="text-[10px] font-black font-display px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1"
                    :class="
                      currentQuestion.isCorrect
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    "
                  >
                    <UIcon
                      :name="
                        currentQuestion.isCorrect
                          ? 'i-heroicons-check-circle'
                          : 'i-heroicons-x-circle'
                      "
                      class="text-xs"
                    />
                    {{ currentQuestion.isCorrect ? "Correct" : "Incorrect" }}
                  </span>

                  <!-- Themes -->
                  <span
                    v-for="theme in currentQuestion.themes"
                    :key="theme"
                    class="text-[9px] font-extrabold uppercase tracking-wider font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
                  >
                    {{ theme }}
                  </span>

                  <!-- Author attribution -->
                  <span
                    v-if="currentQuestion.authorName"
                    class="inline-flex items-center gap-1 text-[9px] font-medium text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
                  >
                    <UIcon name="i-heroicons-light-bulb" class="text-amber-400 text-xs shrink-0" />
                    <span>@{{ currentQuestion.authorName }}</span>
                  </span>
                </div>
              </div>

              <!-- Question Reporting Button -->
              <div class="shrink-0 -mr-1">
                <QuestionReporting :question-id="currentQuestion.questionId" />
              </div>
            </div>

            <!-- Question Libelle -->
            <p class="text-sm font-black font-display text-white tracking-wide leading-snug pt-0.5">
              {{ currentQuestion.libelle }}
            </p>

            <!-- Question Image (if any) -->
            <div
              v-if="currentQuestion.img"
              class="relative w-full max-h-48 overflow-hidden rounded-lg border border-white/10 bg-slate-950/80"
            >
              <img
                :src="currentQuestion.img"
                alt="Illustration question"
                class="w-full h-full object-contain mx-auto"
              />
            </div>

            <!-- Choices Grid -->
            <div class="space-y-1.5 pt-1">
              <div
                v-for="p in currentQuestion.propositions"
                :key="p.id"
                class="p-2 sm:p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all"
                :class="getPropositionClass(currentQuestion, p.id)"
              >
                <div class="flex items-center space-x-2 min-w-0 flex-1">
                  <!-- Icon Indicator -->
                  <UIcon
                    v-if="p.id === currentQuestion.correctResponseId"
                    name="i-heroicons-check-circle-20-solid"
                    class="text-emerald-400 text-sm shrink-0"
                  />
                  <UIcon
                    v-else-if="
                      p.id === currentQuestion.userResponseId && !currentQuestion.isCorrect
                    "
                    name="i-heroicons-x-circle-20-solid"
                    class="text-rose-400 text-sm shrink-0"
                  />
                  <div
                    v-else
                    class="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0 opacity-40"
                  ></div>

                  <span class="font-medium truncate">{{ p.value }}</span>
                </div>

                <!-- Badge Label -->
                <span
                  v-if="
                    p.id === currentQuestion.correctResponseId &&
                    p.id === currentQuestion.userResponseId
                  "
                  class="text-[9px] font-black font-display uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-500/30"
                >
                  Votre réponse ✓
                </span>
                <span
                  v-else-if="p.id === currentQuestion.correctResponseId"
                  class="text-[9px] font-black font-display uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-500/30"
                >
                  Bonne réponse
                </span>
                <span
                  v-else-if="p.id === currentQuestion.userResponseId"
                  class="text-[9px] font-black font-display uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 shrink-0 border border-rose-500/30"
                >
                  Votre réponse ✗
                </span>
              </div>
            </div>

            <!-- Explanation Box -->
            <div
              class="bg-gradient-to-br from-violet-950/50 to-indigo-950/40 border border-violet-500/25 rounded-xl p-3 sm:p-3.5 space-y-1.5 shadow-inner mt-2"
            >
              <div class="flex items-center space-x-1.5">
                <UIcon name="i-heroicons-light-bulb" class="text-amber-400 text-base" />
                <span
                  class="text-xs font-black font-display text-violet-200 tracking-wide uppercase"
                >
                  Explication
                </span>
              </div>

              <p class="text-xs text-gray-200 leading-relaxed font-normal select-text">
                {{
                  currentQuestion.commentaire ||
                  "Aucune explication détaillée n'a été ajoutée pour cette question."
                }}
              </p>

              <!-- Explanation Image (if any) -->
              <div
                v-if="currentQuestion.commentaireImg"
                class="relative w-full max-h-40 overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 mt-2"
              >
                <img
                  :src="currentQuestion.commentaireImg"
                  alt="Illustration explication"
                  class="w-full h-full object-contain mx-auto"
                />
              </div>
            </div>
          </div>
        </Transition>

        <!-- Bottom Navigation Controls: Précédent / Suivant -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chevron-left"
            :disabled="currentIndex <= 0"
            class="font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
            @click="goToPrevious"
          >
            Précédent
          </UButton>

          <span class="text-xs font-black font-display text-gray-400">
            {{ currentIndex + 1 }} / {{ reviewData.totalQuestions }}
          </span>

          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            trailing-icon="i-heroicons-chevron-right"
            :disabled="currentIndex >= reviewData.totalQuestions - 1"
            class="font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
            @click="goToNext"
          >
            Suivant
          </UButton>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailySeriesReviewDTO, DailyQuestionReviewDTO } from "#shared/DTO/dailyReviewDTO";

const props = defineProps<{
  seriesId?: number;
}>();

const isOpen = ref(true);
const currentIndex = ref(0);

// Fetch daily review lazily or reactively
const {
  data: reviewData,
  status,
  error,
  refresh,
} = await useFetch<DailySeriesReviewDTO>("/api/series/daily/review", {
  query: computed(() => (props.seriesId ? { seriesId: props.seriesId } : {})),
  immediate: true,
});

const correctCount = computed(() => {
  return reviewData.value?.questions.filter((q) => q.isCorrect).length ?? 0;
});

const currentQuestion = computed<DailyQuestionReviewDTO | null>(() => {
  if (!reviewData.value || !reviewData.value.questions.length) return null;
  return reviewData.value.questions[currentIndex.value] || null;
});

function goToPrevious() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

function goToNext() {
  if (reviewData.value && currentIndex.value < reviewData.value.totalQuestions - 1) {
    currentIndex.value++;
  }
}

function getPropositionClass(q: DailyQuestionReviewDTO, propId: number): string {
  if (propId === q.correctResponseId) {
    return "bg-emerald-950/50 border-emerald-500/40 text-emerald-200 font-semibold shadow-sm";
  }
  if (propId === q.userResponseId && !q.isCorrect) {
    return "bg-rose-950/50 border-rose-500/40 text-rose-200 font-semibold shadow-sm";
  }
  return "bg-slate-900/40 border-white/5 text-gray-400 opacity-65";
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease-in-out;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
