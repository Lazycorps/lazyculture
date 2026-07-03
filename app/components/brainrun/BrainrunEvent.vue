<template>
  <div v-if="event" class="text-center py-6 px-2 space-y-6">
    <div class="space-y-2">
      <div
        class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto"
      >
        <UIcon name="i-heroicons-question-mark-circle" class="text-violet-400" />
      </div>
      <h3 class="text-lg font-black font-display text-white tracking-wide">{{ event.title }}</h3>
      <p class="text-xs text-gray-400 max-w-sm mx-auto">{{ event.description }}</p>
    </div>

    <div class="space-y-3">
      <button
        v-for="(option, index) in event.options"
        :key="index"
        type="button"
        :disabled="loading"
        class="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors disabled:opacity-50"
        @click="$emit('choose', index)"
      >
        <p class="font-black font-display text-sm text-white tracking-wide">{{ option.label }}</p>
        <p v-if="summarize(option)" class="text-[11px] text-gray-400 mt-1">
          {{ summarize(option) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  BRAINRUN_CONSUMABLES,
  BRAINRUN_EVENTS,
  type BrainrunEventOption,
} from "#shared/brainrunItems";

const props = defineProps<{
  eventId: string | null;
  loading: boolean;
}>();

defineEmits<{
  choose: [index: number];
}>();

const event = computed(() => (props.eventId ? BRAINRUN_EVENTS[props.eventId] : null));

function summarize(option: BrainrunEventOption): string {
  const parts: string[] = [];
  if (option.cost?.hp) parts.push(`-${option.cost.hp} PV`);
  if (option.cost?.gold) parts.push(`-${option.cost.gold} or`);
  if (option.cost?.relic === "RANDOM_OWNED") parts.push("-1 relique possédée (au hasard)");
  if (option.reward?.hp) parts.push(`+${option.reward.hp} PV`);
  if (option.reward?.gold) parts.push(`+${option.reward.gold} or`);
  if (option.reward?.relic === "RANDOM") parts.push("relique aléatoire");
  for (const grant of option.reward?.consumables ?? []) {
    const name =
      grant.id === "RANDOM" ? "consommable aléatoire" : BRAINRUN_CONSUMABLES[grant.id].name;
    parts.push(`${grant.amount}x ${name}`);
  }
  return parts.join(" · ");
}
</script>
