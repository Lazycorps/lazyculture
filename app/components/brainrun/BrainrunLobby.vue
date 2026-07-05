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
        @click="$emit('start')"
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
import { BRAINRUN_ROOMS_PER_ACT } from "#shared/brainrun";
import type { BrainrunMetaProgressDTO, BrainrunRunDTO } from "#shared/brainrun";

const props = defineProps<{
  run: BrainrunRunDTO | null;
  metaProgress: BrainrunMetaProgressDTO | null;
  loading: boolean;
}>();

defineEmits<{
  start: [];
  resume: [];
}>();

const hasRunInProgress = computed(() => props.run?.status === "IN_PROGRESS");
const showHelp = ref(false);
const showGlossary = ref(false);

const bestRunLabel = computed(() => {
  const bestRun = props.metaProgress?.bestRun;
  if (!bestRun) return "—";
  return `A${bestRun.act} · ${bestRun.row}/${BRAINRUN_ROOMS_PER_ACT}`;
});
</script>
