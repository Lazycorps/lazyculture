<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none">
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <!-- Non-authenticated user view -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto animate-pulse"
          >
            🔒
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">
              Défi Quotidien
            </h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Testez votre culture générale chaque jour avec une série spéciale de questions et
              grimpez dans le classement.
            </p>
          </div>
          <UButton
            to="/login"
            color="primary"
            size="lg"
            block
            icon="i-heroicons-key"
            class="font-extrabold uppercase font-display tracking-wider py-3"
          >
            Se connecter et jouer
          </UButton>
        </div>
      </template>

      <!-- Authenticated player view -->
      <template v-else>
        <!-- Game Header (Title & Progress Bar) -->
        <div class="flex flex-col space-y-4 mb-6">
          <h2 class="text-xl font-black font-display text-white tracking-wide flex items-center">
            <UIcon
              name="i-heroicons-calendar"
              class="mr-2 text-violet-400 text-2xl animate-pulse"
            />
            {{ userSeries?.series.title }}
          </h2>

          <div class="space-y-1.5">
            <!-- Custom Premium Glass Progress Bar -->
            <div
              class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
            >
              <div
                class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                :style="{ width: `${nbrQuestion > 0 ? (questionId / nbrQuestion) * 100 : 0}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-xs font-bold font-display text-gray-400">
              <span>Série quotidienne en cours</span>
              <span>{{ questionId }} / {{ nbrQuestion }}</span>
            </div>
          </div>
        </div>

        <hr class="border-white/5 my-5" />

        <!-- Quiz Runner Section -->
        <template v-if="questionId != nbrQuestion">
          <div class="py-4">
            <QuestionSeries
              v-if="seriesStarted"
              :question="question"
              :parentLoading="loading"
              @validate-response="validateResponse"
              @next-question="nextQuestion"
            />

            <!-- Start/Resume button -->
            <div v-else class="text-center py-6">
              <UButton
                size="lg"
                color="primary"
                :loading="loading"
                class="font-black font-display uppercase tracking-widest px-8 py-3.5"
                icon="i-heroicons-play-solid"
                @click="startSeries"
              >
                {{ questionId > 0 ? "Reprendre" : "Démarrer" }} la série
              </UButton>
            </div>
          </div>
        </template>

        <!-- Completion End Screen -->
        <template v-else>
          <div class="text-center py-4 md:py-6 px-4 space-y-4 flex flex-col items-center">
            <!-- Glowing Success Badge -->
            <div class="relative">
              <div class="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-125"></div>
              <div
                class="relative w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl text-emerald-400"
              >
                ⭐
              </div>
            </div>

            <div class="space-y-1">
              <h3 class="text-xl font-black font-display text-white tracking-wide">
                Défi du Jour Réussi !
              </h3>
              <p class="text-xs text-gray-400 max-w-sm">
                Excellent travail ! Vous avez complété votre série quotidienne avec succès.
              </p>
            </div>

            <!-- Stats Recap Grid -->
            <div class="grid grid-cols-2 gap-3 w-full max-w-sm pt-2">
              <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p class="text-xl font-black font-display text-emerald-400">
                  {{ userSeries?.userResponse.data.score }} /
                  {{ userSeries?.series.data.questionsIds.length }}
                </p>
                <p
                  class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                >
                  Score obtenu
                </p>
              </div>
              <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p class="text-xl font-black font-display text-amber-400">
                  +{{ userSeries?.userResponse.data.xpEarned }} XP
                </p>
                <p
                  class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                >
                  Expérience
                </p>
              </div>
            </div>

            <b
              class="text-[11px] text-violet-400 font-bold uppercase tracking-wider font-display pt-1"
              >Revenez demain pour un nouveau quiz !</b
            >

            <!-- Leaderboard Redirect Button -->
            <div class="pt-2 w-full max-w-sm">
              <UButton
                size="lg"
                color="primary"
                block
                icon="i-heroicons-chart-bar"
                class="font-black font-display uppercase tracking-widest py-3.5"
                @click="router.push('/ranking/daily')"
              >
                Classement du Jour
              </UButton>
            </div>
          </div>
        </template>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ResponseDTO } from "~/models/DTO/responseDTO";
import type { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";
import { QuestionDTO } from "~/models/question";
import type { UserSeriesDTO } from "~/models/series";

const supabase = useSupabaseClient();
const achievementStore = useAchievementStore();
const {
  data: { user },
} = await supabase.auth.getUser();
const router = useRouter();
const question = ref<QuestionDTO | null>(null);
const loading = ref(false);
const seriesStarted = ref(false);
const { data: userSeries } = await useFetch<UserSeriesDTO>("/api/series/daily");
const nbrQuestion = computed(() => {
  return userSeries.value?.series.data.questionsIds.length;
});
const questionId = computed(() => {
  return userSeries.value?.userResponse?.data?.responses?.length ?? 0;
});

async function startSeries() {
  try {
    loading.value = true;
    await nextQuestion();
  } catch (e) {
    console.error("Failed to start daily series:", e);
  } finally {
    loading.value = false;
  }
}

async function nextQuestion() {
  try {
    loading.value = true;
    const nexQuestion =
      userSeries.value?.userResponse?.data?.nextQuestion ??
      userSeries.value?.series.data.questionsIds[0];
    question.value = await $fetch<QuestionDTO>("/api/question", {
      query: {
        id: nexQuestion,
      },
    });
  } catch (e) {
    console.error("Failed to load next question in daily:", e);
  } finally {
    loading.value = false;
    seriesStarted.value = true;
  }
}

async function validateResponse(response: ResponseDTO) {
  try {
    loading.value = true;
    if (!userSeries.value) return;
    const seriesResponse = {
      seriesId: userSeries.value.series.id,
      questionId: response.questionId,
      userResponseId: response.userResponseId,
    } as SeriesResponseDTO;

    userSeries.value.userResponse = await $fetch("/api/series/response", {
      method: "post",
      body: seriesResponse,
    });
    achievementStore.answerDailyQuestion();
  } catch (e) {
    console.error("Failed to validate response in daily:", e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Page-specific styling if any */
</style>
