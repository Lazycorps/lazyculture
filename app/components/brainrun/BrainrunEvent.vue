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

    <!-- Résultat de l'option choisie (salle CLEARED) : remplace les boutons de choix par une
         phrase expliquant ce qu'il s'est passé, plutôt que le récap générique or/PV. -->
    <div v-if="status === 'CLEARED' && outcome" class="space-y-5">
      <p class="text-sm text-gray-200 max-w-sm mx-auto leading-relaxed">
        {{ outcomeText }}
      </p>
      <UButton
        size="lg"
        color="primary"
        block
        :loading="loading"
        class="font-black font-display uppercase tracking-widest py-3.5 max-w-sm mx-auto"
        @click="$emit('continue')"
      >
        Continuer
      </UButton>
    </div>
    <div v-else class="space-y-3">
      <button
        v-for="(option, index) in event.options"
        :key="index"
        type="button"
        :disabled="loading || !canAfford(option)"
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
  BRAINRUN_RELICS,
  type BrainrunEventOption,
} from "#shared/brainrunItems";
import type { BrainrunEventOutcomeDTO, BrainrunRoomStatus } from "#shared/brainrun";

const props = defineProps<{
  eventId: string | null;
  status: BrainrunRoomStatus;
  outcome: BrainrunEventOutcomeDTO | null;
  loading: boolean;
  gold: number;
}>();

defineEmits<{
  choose: [index: number];
  continue: [];
}>();

const event = computed(() => (props.eventId ? BRAINRUN_EVENTS[props.eventId] : null));

function canAfford(option: BrainrunEventOption): boolean {
  return !option.cost?.gold || option.cost.gold <= props.gold;
}

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

// Phrase au passé décrivant ce qui a été réellement appliqué (cf. BrainrunService.resolveEvent) :
// certains tirages sont aléatoires (relique/consommable "RANDOM", sacrifice "RANDOM_OWNED") ou
// modifiés par le Bouclier, donc le résultat ne peut pas se déduire de l'option seule.
const outcomeText = computed(() => {
  const o = props.outcome;
  if (!o) return "";
  const parts: string[] = [];
  if (o.hpDelta > 0) parts.push(`récupéré ${o.hpDelta} PV`);
  if (o.hpDelta < 0) parts.push(`perdu ${-o.hpDelta} PV`);
  if (o.shieldConsumed) parts.push("évité une perte de PV grâce au Bouclier");
  if (o.goldDelta > 0) parts.push(`gagné ${o.goldDelta} or`);
  if (o.goldDelta < 0) parts.push(`dépensé ${-o.goldDelta} or`);
  if (o.relicLost) parts.push(`sacrifié la relique ${BRAINRUN_RELICS[o.relicLost].name}`);
  if (o.relicGranted) parts.push(`obtenu la relique ${BRAINRUN_RELICS[o.relicGranted].name}`);
  for (const grant of o.consumablesGranted) {
    parts.push(`obtenu ${grant.amount}x ${BRAINRUN_CONSUMABLES[grant.id].name}`);
  }
  if (parts.length === 0) return "Vous poursuivez votre chemin sans rien faire.";
  return `Vous avez ${parts.join(", ")}.`;
});
</script>
