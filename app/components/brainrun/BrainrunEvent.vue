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

    <!-- Résultat de l'option choisie (salle CLEARED) : le lore du tirage masqué (resultText) puis le
         détail visuel de ce qui a réellement été gagné/perdu. -->
    <div v-if="status === 'CLEARED' && outcome" class="space-y-5">
      <p class="text-sm text-gray-200 max-w-sm mx-auto leading-relaxed">
        {{ outcome.resultText }}
      </p>
      <div v-if="outcomeGains.length" class="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
        <span
          v-for="(gain, index) in outcomeGains"
          :key="index"
          class="text-[11px] font-bold px-2.5 py-1 rounded-full border"
          :class="
            gain.negative
              ? 'text-red-300 border-red-400/30 bg-red-400/10'
              : 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
          "
        >
          {{ gain.label }}
        </span>
      </div>
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
        :disabled="loading || !canChoose(option)"
        class="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors disabled:opacity-50"
        @click="$emit('choose', index)"
      >
        <p class="font-black font-display text-sm text-white tracking-wide">{{ option.label }}</p>
        <p v-if="summarizeCost(option)" class="text-[11px] text-amber-300/80 mt-1">
          {{ summarizeCost(option) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  BRAINRUN_CONSUMABLES,
  BRAINRUN_EVENT_MIN_MAX_HP,
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
  maxHealthPoint: number;
}>();

defineEmits<{
  choose: [index: number];
  continue: [];
}>();

const event = computed(() => (props.eventId ? BRAINRUN_EVENTS[props.eventId] : null));

// Une option n'est jouable que si le joueur peut en payer le coût explicite (or) et qu'un coût en
// PV max ne le ferait pas passer sous le plancher (même garde que le serveur, cf. resolveEvent).
function canChoose(option: BrainrunEventOption): boolean {
  if (option.cost?.gold && option.cost.gold > props.gold) return false;
  if (option.cost?.maxHp && props.maxHealthPoint - option.cost.maxHp < BRAINRUN_EVENT_MIN_MAX_HP) {
    return false;
  }
  return true;
}

// N'affiche QUE le coût explicite de l'option : la récompense est tirée au sort masqué (outcomes),
// révélée seulement une fois le choix résolu.
function summarizeCost(option: BrainrunEventOption): string {
  const parts: string[] = [];
  if (option.cost?.hp) parts.push(`-${option.cost.hp} PV`);
  if (option.cost?.maxHp) parts.push(`-${option.cost.maxHp} PV max`);
  if (option.cost?.gold) parts.push(`-${option.cost.gold} or`);
  if (option.cost?.relic === "RANDOM_OWNED") parts.push("-1 relique possédée (au hasard)");
  return parts.join(" · ");
}

// Détail visuel de ce qui a réellement été appliqué (cf. BrainrunService.resolveEvent) : certains
// tirages sont aléatoires ou modifiés par le Bouclier, donc pas déductibles de l'option seule.
const outcomeGains = computed<{ label: string; negative: boolean }[]>(() => {
  const o = props.outcome;
  if (!o) return [];
  const gains: { label: string; negative: boolean }[] = [];
  if (o.fullHealGranted) gains.push({ label: "PV entièrement restaurés", negative: false });
  if (o.hpDelta > 0) gains.push({ label: `+${o.hpDelta} PV`, negative: false });
  if (o.hpDelta < 0) gains.push({ label: `${o.hpDelta} PV`, negative: true });
  if (o.shieldConsumed) gains.push({ label: "Perte de PV évitée (Bouclier)", negative: false });
  if (o.maxHpDelta < 0) gains.push({ label: `${o.maxHpDelta} PV max`, negative: true });
  if (o.goldDelta > 0) gains.push({ label: `+${o.goldDelta} or`, negative: false });
  if (o.goldDelta < 0) gains.push({ label: `${o.goldDelta} or`, negative: true });
  if (o.shieldChargesGranted > 0) {
    gains.push({ label: `+${o.shieldChargesGranted} Bouclier`, negative: false });
  }
  if (o.fiftyFiftyChargesGranted > 0) {
    gains.push({ label: `50/50 sur ${o.fiftyFiftyChargesGranted} questions`, negative: false });
  }
  if (o.reviveGranted) gains.push({ label: "Résurrection obtenue", negative: false });
  if (o.relicLost) {
    gains.push({
      label: `Relique sacrifiée : ${BRAINRUN_RELICS[o.relicLost].name}`,
      negative: true,
    });
  }
  if (o.relicGranted) {
    gains.push({ label: `Relique : ${BRAINRUN_RELICS[o.relicGranted].name}`, negative: false });
  }
  for (const grant of o.consumablesGranted) {
    gains.push({
      label: `${grant.amount}x ${BRAINRUN_CONSUMABLES[grant.id].name}`,
      negative: false,
    });
  }
  return gains;
});
</script>
