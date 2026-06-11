<template>
  <div
    class="fixed inset-0 z-50 bg-[#070a13]/90 backdrop-blur-md flex items-center justify-center p-4"
  >
    <div
      class="w-full max-w-md bg-[#111827]/85 border backdrop-blur-2xl rounded-2xl p-6 shadow-2xl space-y-5 animate-slide-up"
      :class="
        isCorrect
          ? 'border-emerald-500/30'
          : myLivesAfter === 0
            ? 'border-red-500/30'
            : 'border-white/10'
      "
    >
      <!-- Header status -->
      <div class="text-center space-y-1">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto shadow-neon"
          :class="statusColors"
        >
          <UIcon :name="statusIcon" />
        </div>
        <h3 class="text-xl font-black font-display tracking-wide" :class="statusTextClass">
          {{ statusTitle }}
        </h3>
        <p class="text-xs text-gray-400">Correction du Round {{ round }}</p>
      </div>

      <!-- Correction Display -->
      <div class="bg-white/5 border border-white/15 rounded-xl p-3.5 space-y-2">
        <div class="flex items-center text-xs font-bold text-emerald-400">
          <UIcon name="i-heroicons-check-circle" class="mr-1 text-base" />
          Bonne réponse :
        </div>
        <p class="text-sm font-black text-white leading-relaxed">
          {{ correctAnswerText }}
        </p>
        <hr v-if="commentaire" class="border-white/5 my-2" />
        <div
          v-if="commentaire"
          class="max-h-24 overflow-y-auto pr-1 text-xs text-gray-300 leading-relaxed custom-scrollbar"
        >
          {{ commentaire }}
        </div>
      </div>

      <!-- Elimination / Survivorship Live Feed -->
      <div class="space-y-2">
        <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider">
          Activité de l'Arène
        </h4>
        <div
          class="bg-slate-950/60 border border-white/5 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar"
        >
          <div
            v-for="res in results"
            :key="res.userId"
            class="flex items-center justify-between text-xs py-0.5"
            :class="res.userId === myUserId ? 'font-bold' : ''"
          >
            <div class="flex items-center space-x-2">
              <span>{{ res.userId === myUserId ? "👉" : "👤" }}</span>
              <span class="text-white truncate max-w-[120px]">{{ res.name }}</span>
            </div>

            <div class="flex items-center space-x-2">
              <!-- Result pill -->
              <span
                v-if="res.correct"
                class="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded"
              >
                Correct
              </span>
              <span
                v-else
                class="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded"
              >
                {{ res.answered ? "Incorrect" : "Temps écoulé" }}
              </span>

              <!-- Heart change -->
              <div class="flex items-center">
                <UIcon name="i-heroicons-heart-solid" class="text-rose-500 text-xs" />
                <span class="text-slate-400 ml-0.5 text-[10px]">
                  {{ res.livesBefore }} → {{ res.livesAfter }}
                </span>
                <span v-if="res.eliminated" class="text-[10px] text-red-500 font-extrabold ml-1">
                  💀
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto close info -->
      <div
        class="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse"
      >
        Lancement du prochain round sous peu...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RoundResult {
  userId: string;
  name: string;
  livesBefore: number;
  livesAfter: number;
  answered: boolean;
  correct: boolean;
  eliminated: boolean;
}

interface Proposition {
  id: number;
  value: string;
}

interface QuestionData {
  propositions: Proposition[];
}

const props = defineProps<{
  round: number;
  correctAnswerId: number;
  commentaire: string;
  results: RoundResult[];
  question: QuestionData;
  myUserId: string;
}>();

// Trouver le résultat de l'utilisateur connecté
const myResult = computed(() => {
  return props.results.find((r) => r.userId === props.myUserId);
});

const isSpectator = computed(() => {
  return !myResult.value;
});

const isCorrect = computed(() => {
  return myResult.value?.correct ?? false;
});

const myLivesAfter = computed(() => {
  return myResult.value?.livesAfter ?? 0;
});

const correctAnswerText = computed(() => {
  const prop = props.question.propositions.find((p) => p.id === props.correctAnswerId);
  return prop ? prop.value : "Option correcte";
});

// UI Computeds depending on correct/incorrect/spectator
const statusColors = computed(() => {
  if (isSpectator.value) {
    return "bg-slate-800/20 text-slate-400 border border-slate-500/30";
  }
  if (isCorrect.value) {
    return "bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 shadow-emerald-500/10";
  }
  if (myLivesAfter.value === 0) {
    return "bg-rose-950/40 text-red-500 border border-red-500/40 shadow-rose-900/10";
  }
  return "bg-rose-500/10 text-rose-400 border border-rose-400/20 shadow-neon-red";
});

const statusIcon = computed(() => {
  if (isSpectator.value) return "i-heroicons-information-circle";
  if (isCorrect.value) return "i-heroicons-check-circle-20-solid";
  if (myLivesAfter.value === 0) return "i-heroicons-exclamation-triangle-20-solid";
  return "i-heroicons-x-circle-20-solid";
});

const statusTitle = computed(() => {
  if (isSpectator.value) return "Fin du Round";
  if (isCorrect.value) return "Bien joué !";
  if (myLivesAfter.value === 0) return "Éliminé !";
  return "Ouch, cœur perdu !";
});

const statusTextClass = computed(() => {
  if (isSpectator.value) return "text-slate-300";
  if (isCorrect.value) return "text-emerald-400";
  if (myLivesAfter.value === 0) return "text-red-500 animate-bounce";
  return "text-rose-400";
});

onMounted(() => {
  if (isCorrect.value) {
    const { playSound } = useAudio();
    playSound("response-success");
  }
});
</script>

<style scoped>
/* Animations */
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
