<template>
  <div class="text-center py-6 px-4 space-y-6">
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

    <div
      class="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 max-w-xs mx-auto"
    >
      <UIcon name="i-heroicons-sparkles" class="text-violet-400 text-lg" />
      <span class="text-lg font-black font-display text-white">{{
        metaProgress?.knowledgePoints ?? 0
      }}</span>
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-display">
        Points de Savoir
      </span>
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
        to="/series/brainrun/talents"
        size="lg"
        variant="ghost"
        block
        icon="i-heroicons-academic-cap"
        class="font-black font-display uppercase tracking-wide py-3"
      >
        Arbre de talents
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
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
</script>
