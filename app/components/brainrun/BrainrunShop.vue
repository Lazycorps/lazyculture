<template>
  <div class="py-4 px-1 space-y-5">
    <div class="text-center space-y-1">
      <div
        class="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto text-amber-400"
      >
        <UIcon name="i-heroicons-book-open" />
      </div>
      <h3 class="text-lg font-black font-display text-white tracking-wide">Librairie</h3>
      <p class="text-xs text-gray-400">
        Vous avez <span class="text-amber-400 font-bold">{{ gold }}</span> or.
      </p>
    </div>

    <div class="space-y-3">
      <div
        v-for="(offer, index) in offers"
        :key="`${offer.kind}-${offer.id}-${index}`"
        class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
      >
        <div
          class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl"
          :class="rarityBadgeClass(offer)"
        >
          <UIcon :name="offerIcon(offer)" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-black font-display text-sm text-white tracking-wide truncate">
            {{ offerName(offer) }}
          </p>
          <p class="text-[11px] text-gray-400 leading-snug">{{ offerDescription(offer) }}</p>
        </div>
        <UButton
          size="sm"
          :color="offer.price === 0 ? 'success' : isAffordable(offer) ? 'primary' : 'neutral'"
          :disabled="loading || !isAffordable(offer)"
          class="font-black font-display shrink-0 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
          @click="$emit('buy', index)"
        >
          {{ offer.price === 0 ? "Prendre" : `${offer.price} or` }}
        </UButton>
      </div>
    </div>

    <UButton
      size="lg"
      color="primary"
      block
      :loading="loading"
      class="font-black font-display uppercase tracking-widest py-3.5"
      @click="$emit('leave')"
    >
      Quitter la librairie
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { BRAINRUN_CONSUMABLES, BRAINRUN_RELICS, type BrainrunOffer } from "#shared/brainrunItems";

const props = defineProps<{
  offers: BrainrunOffer[];
  gold: number;
  loading: boolean;
}>();

defineEmits<{
  buy: [index: number];
  leave: [];
}>();

function isAffordable(offer: BrainrunOffer): boolean {
  return (offer.price ?? 0) <= props.gold;
}

function offerName(offer: BrainrunOffer): string {
  if (offer.kind === "RELIC") return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].name;
  if (offer.kind === "CONSUMABLE")
    return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].name;
  return `Cache d'or (+${offer.amount ?? 0})`;
}

function offerDescription(offer: BrainrunOffer): string {
  if (offer.kind === "RELIC")
    return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].description;
  if (offer.kind === "CONSUMABLE")
    return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].description;
  return "Aucune relique disponible pour l'instant : un peu d'or à la place.";
}

function offerIcon(offer: BrainrunOffer): string {
  if (offer.kind === "RELIC") return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].icon;
  if (offer.kind === "CONSUMABLE")
    return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].icon;
  return "i-heroicons-currency-dollar";
}

function rarityBadgeClass(offer: BrainrunOffer): string {
  if (offer.kind === "RELIC" && offer.rarity === "RARE") {
    return "bg-amber-500/10 border border-amber-500/30 text-amber-400";
  }
  if (
    offer.kind === "CONSUMABLE" &&
    BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].rarity === "RARE"
  ) {
    return "bg-amber-500/10 border border-amber-500/30 text-amber-400";
  }
  if (offer.kind === "GOLD") {
    return "bg-amber-500/10 border border-amber-500/30 text-amber-400";
  }
  return "bg-violet-500/10 border border-violet-500/30 text-violet-400";
}
</script>
