<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6"
    >
      <!-- Top Progress Bar Row (Shown during load & gameplay) -->
      <div v-if="!isFinished" class="w-full flex items-center space-x-3 mb-6">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark"
          class="hover:bg-white/5 text-gray-400 hover:text-white rounded-full p-1.5"
          @click="confirmExit"
        />
        <!-- Progress Bar -->
        <div
          class="flex-1 h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative"
        >
          <div
            class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <span class="text-[11px] font-extrabold font-display text-gray-400 whitespace-nowrap">
          {{ currentIndex + 1 }} / {{ questions.length }}
        </span>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading" class="w-full p-4 space-y-4 animate-pulse">
        <div class="h-4 bg-white/10 rounded w-1/3"></div>
        <div class="h-6 bg-white/10 rounded w-3/4"></div>
        <div class="h-40 bg-white/5 rounded-xl"></div>
        <div class="space-y-2">
          <div class="h-10 bg-white/10 rounded-xl"></div>
          <div class="h-10 bg-white/10 rounded-xl"></div>
          <div class="h-10 bg-white/10 rounded-xl"></div>
        </div>
      </div>

      <!-- Gameplay Area (Reusing Unified QuestionSeries Component) -->
      <div v-else-if="currentQuestion && !isFinished" class="w-full">
        <QuestionSeries
          :question="currentQuestion"
          :parentLoading="validating"
          @validate-response="handleValidateResponse"
          @next-question="nextQuestion"
        />
      </div>

      <!-- Final Score / Success / Failure Dashboard Screen -->
      <div
        v-else-if="isFinished"
        class="w-full flex flex-col justify-center items-center text-center space-y-6 py-4"
      >
        <!-- Icon representation -->
        <div class="relative">
          <div
            class="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl"
            :class="
              isStagePassed
                ? 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 shadow-emerald-500/10'
                : 'bg-rose-500/10 border-2 border-rose-500 text-rose-400 shadow-rose-500/10'
            "
          >
            <span v-if="isStagePassed">🏆</span>
            <span v-else>⚠️</span>
          </div>
        </div>

        <!-- Title / Summary -->
        <div class="space-y-2">
          <h2 class="text-2xl font-black font-display text-white">
            {{ isStagePassed ? "Étape Validée !" : "Étape non validée" }}
          </h2>
          <p class="text-sm text-gray-400 font-medium">
            {{
              isStagePassed
                ? "Félicitations, vous avez réussi cette étape !"
                : "Vous n'avez pas atteint le seuil requis de 80%."
            }}
          </p>
        </div>

        <!-- Score details -->
        <div
          class="bg-white/5 border border-white/5 rounded-2xl p-5 w-full grid grid-cols-2 gap-4 font-semibold font-display text-gray-300"
        >
          <div class="space-y-1 text-center border-r border-white/5">
            <p class="text-[10px] text-gray-400 uppercase tracking-wider">Score Final</p>
            <p class="text-2xl font-black text-white">{{ userScore }} / {{ questions.length }}</p>
            <p class="text-[10px]" :class="isStagePassed ? 'text-emerald-400' : 'text-rose-400'">
              ({{ Math.round((userScore / questions.length) * 100) }}% obtenus)
            </p>
          </div>

          <div class="space-y-1 text-center">
            <p class="text-[10px] text-gray-400 uppercase tracking-wider">XP Gagnés</p>
            <p class="text-2xl font-black text-amber-400">+{{ xpEarnedTotal + bonusXp }} XP</p>
            <p class="text-[10px] text-amber-500/80">(dont +{{ bonusXp }} XP bonus)</p>
          </div>
        </div>

        <!-- Warning info for replaying failures -->
        <div
          v-if="!isStagePassed && isReplay"
          class="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-gray-400 leading-relaxed"
        >
          * Vous rejouez une étape déjà validée. Votre progression générale reste intacte.
        </div>

        <!-- Action Buttons -->
        <div class="w-full space-y-3 pt-4">
          <!-- Next / Return -->
          <UButton
            v-if="isStagePassed || isReplay"
            color="primary"
            block
            size="lg"
            class="font-black font-display uppercase tracking-widest py-3 justify-center rounded-xl shadow-lg shadow-violet-600/20"
            @click="returnToMap"
          >
            Continuer
          </UButton>

          <!-- Retry -->
          <UButton
            v-if="!isStagePassed"
            color="neutral"
            variant="solid"
            block
            size="lg"
            class="font-black font-display uppercase tracking-widest py-3 justify-center rounded-xl hover:bg-white/10"
            :loading="submittingComplete"
            @click="retryStage"
          >
            Réessayer
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import QuestionSeries from "@/components/QuestionSeries.vue";

const route = useRoute();
const router = useRouter();

const pathId = Number(route.params.id);
const sequence = Number(route.params.sequence);

const showBottomNav = useState("showBottomNav", () => true);

const loading = ref(true);
const validating = ref(false);
const submittingComplete = ref(false);

const questions = ref<any[]>([]);
const currentIndex = ref(0);

// Completed stage score state
const userAnswers = ref<Record<number, number>>({});
const isFinished = ref(false);
const userScore = ref(0);
const isStagePassed = ref(false);
const isReplay = ref(false);
const xpEarnedTotal = ref(0);
const bonusXp = ref(0);

const currentQuestion = computed(() => {
  return questions.value[currentIndex.value] || null;
});

const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0;
  return (currentIndex.value / questions.value.length) * 100;
});

onMounted(async () => {
  showBottomNav.value = false;
  try {
    // Fetch randomized questions for this stage
    questions.value = await $fetch<any[]>(`/api/adventures/${pathId}/stage/${sequence}`);
  } catch (e: any) {
    alert(e.data?.statusMessage || "Impossible de charger cette étape.");
    router.push(`/adventure/${pathId}/map`);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  showBottomNav.value = true;
});

function confirmExit() {
  if (confirm("Voulez-vous vraiment quitter l'étape ? Votre progression sera perdue.")) {
    router.push(`/adventure/${pathId}/map`);
  }
}

function handleValidateResponse(response: any) {
  // Save answer locally to submit at the end
  userAnswers.value[response.questionId] = response.userResponseId;
}

function nextQuestion() {
  // Move to next question or complete the stage
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
  } else {
    // End of stage reached, submit results to final validation endpoint
    submitComplete();
  }
}

async function submitComplete() {
  try {
    submittingComplete.value = true;
    const result = await $fetch<any>(`/api/adventures/${pathId}/stage/${sequence}/complete`, {
      method: "post",
      body: { answers: userAnswers.value },
    });

    userScore.value = result.score;
    isStagePassed.value = result.success;
    isReplay.value = result.isReplay || false;
    bonusXp.value = result.bonusXp || 0;
    isFinished.value = true;
  } catch (e: any) {
    alert(e.data?.statusMessage || "Erreur lors de la validation finale de l'étape.");
  } finally {
    submittingComplete.value = false;
  }
}

function returnToMap() {
  router.push(`/adventure/${pathId}/map`);
}

function retryStage() {
  // Reload questions and reset index
  loading.value = true;
  isFinished.value = false;
  currentIndex.value = 0;
  userAnswers.value = {};
  xpEarnedTotal.value = 0;
  bonusXp.value = 0;

  $fetch<any[]>(`/api/adventures/${pathId}/stage/${sequence}`)
    .then((data) => {
      questions.value = data;
    })
    .catch((e) => {
      alert("Erreur lors du rechargement de l'étape.");
      router.push(`/adventure/${pathId}/map`);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
