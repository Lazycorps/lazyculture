<template>
  <div class="relative text-center py-6 px-4 space-y-6">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-heroicons-question-mark-circle"
      class="absolute top-2 right-2"
      aria-label="Aide"
      @click="showHelp = true"
    />
    <div
      class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto"
    >
      🧠
    </div>
    <div class="space-y-1">
      <h2 class="text-2xl font-black font-display text-white tracking-wide">Brainrun</h2>
      <p class="text-xs text-gray-400 max-w-sm mx-auto">
        Grimpez les 3 actes, affrontez les Elites et les Boss, et survivez le plus loin possible.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2.5 w-full max-w-sm mx-auto">
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
        <p class="text-lg font-black font-display text-white">{{ metaProgress?.totalRuns ?? 0 }}</p>
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5">
          Runs effectuées
        </p>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
        <p class="text-lg font-black font-display text-white">
          {{ bestRunLabel }}
        </p>
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5">
          Étage max atteint
        </p>
      </div>
    </div>

    <!-- Érudition : sélecteur de degré de difficulté. Tant qu'aucune run n'a été gagnée, on affiche
         quand même l'encart, verrouillé, pour que le joueur sache que l'échelle existe. -->
    <div
      class="w-full max-w-sm mx-auto bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2.5"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display">
          Érudition
        </p>
        <p class="text-xs font-black font-display text-white">
          {{ brainrunEruditionLabel(selectedErudition) }}
        </p>
      </div>
      <template v-if="maxEruditionUnlocked > 0">
        <input
          v-model.number="selectedErudition"
          type="range"
          min="0"
          :max="maxEruditionUnlocked"
          step="1"
          class="w-full accent-violet-400"
          aria-label="Niveau d'Érudition"
        />
        <ul class="space-y-1 text-left">
          <li
            v-for="step in activeEruditionSteps"
            :key="step.label"
            class="text-[10px] text-gray-400 flex gap-1.5"
          >
            <span class="text-violet-400">▪</span>
            <span>{{ step.label }}</span>
          </li>
          <li v-if="!activeEruditionSteps.length" class="text-[10px] text-gray-500">
            Équilibrage standard, sans modificateur.
          </li>
        </ul>
      </template>
      <p v-else class="text-[10px] text-gray-500 text-left">
        🔒 Gagnez une run pour débloquer l'Érudition I et corser vos parties suivantes.
      </p>
    </div>

    <div class="space-y-2.5 w-full max-w-sm mx-auto pt-1">
      <UButton
        v-if="hasRunInProgress"
        size="lg"
        color="primary"
        block
        :loading="loading"
        icon="i-heroicons-play"
        class="font-black font-display uppercase tracking-widest py-3.5"
        @click="$emit('resume')"
      >
        Reprendre la run en cours
      </UButton>
      <UButton
        size="lg"
        :color="hasRunInProgress ? 'neutral' : 'primary'"
        :variant="hasRunInProgress ? 'soft' : 'solid'"
        block
        :loading="loading"
        icon="i-heroicons-bolt"
        class="font-black font-display uppercase tracking-widest py-3.5"
        @click="$emit('start', selectedErudition)"
      >
        Nouvelle run
      </UButton>
      <UButton
        to="/brainrun/talents"
        size="lg"
        variant="ghost"
        block
        icon="i-heroicons-academic-cap"
        class="font-black font-display uppercase tracking-wide py-3"
      >
        Arbre de talents ({{ metaProgress?.knowledgePoints ?? 0 }}PS)
      </UButton>
      <UButton
        size="lg"
        variant="ghost"
        block
        icon="i-heroicons-book-open"
        class="font-black font-display uppercase tracking-wide py-3"
        @click="showGlossary = true"
      >
        Glossaire
      </UButton>
    </div>

    <BrainrunHelpModal v-model:open="showHelp" />
    <BrainrunGlossaryModal
      v-model:open="showGlossary"
      :discovered-relics="metaProgress?.discoveredRelics ?? []"
      :discovered-consumables="metaProgress?.discoveredConsumables ?? []"
    />
  </div>
</template>

<script setup lang="ts">
import { getBrainrunRoomsPerAct } from "#shared/brainrun";
import type { BrainrunMetaProgressDTO, BrainrunRunDTO } from "#shared/brainrun";
import { BRAINRUN_ERUDITION_LADDER, brainrunEruditionLabel } from "#shared/brainrunErudition";

const props = defineProps<{
  run: BrainrunRunDTO | null;
  metaProgress: BrainrunMetaProgressDTO | null;
  loading: boolean;
}>();

defineEmits<{
  start: [erudition: number];
  resume: [];
}>();

const hasRunInProgress = computed(() => props.run?.status === "IN_PROGRESS");
const showHelp = ref(false);
const showGlossary = ref(false);

const maxEruditionUnlocked = computed(() => props.metaProgress?.maxEruditionUnlocked ?? 0);
/** Présélectionne le plus haut niveau débloqué : un joueur qui a monté l'échelle ne veut pas
 * repartir de 0 à chaque run. Re-synchronisé quand la méta-progression arrive (fetch asynchrone) ou
 * qu'une victoire vient de débloquer un cran. */
const selectedErudition = ref(0);
watch(maxEruditionUnlocked, (max) => (selectedErudition.value = max), { immediate: true });

const activeEruditionSteps = computed(() =>
  BRAINRUN_ERUDITION_LADDER.slice(0, selectedErudition.value),
);

const bestRunLabel = computed(() => {
  const bestRun = props.metaProgress?.bestRun;
  if (!bestRun) return "—";
  return `A${bestRun.act} · ${bestRun.row}/${getBrainrunRoomsPerAct(bestRun.act)}`;
});
</script>
