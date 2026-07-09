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
          :class="[kindBadgeClass(offer), rarityRingClass(offer)]"
        >
          <UIcon :name="offerIcon(offer)" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <p class="font-black font-display text-sm text-white tracking-wide truncate">
              {{ offerName(offer) }}
            </p>
            <span
              class="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              :class="kindBadgeClass(offer)"
            >
              {{ offerKindLabel(offer) }}
            </span>
          </div>
          <p class="text-[11px] text-gray-400 leading-snug">{{ offerDescription(offer) }}</p>
        </div>
        <UButton
          size="sm"
          :color="offer.price === 0 ? 'success' : isAffordable(offer) ? 'primary' : 'neutral'"
          :disabled="loading || !isAffordable(offer) || isBlockedByFullInventory(offer)"
          class="font-black font-display shrink-0 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
          @click="$emit('buy', index)"
        >
          {{
            isBlockedByFullInventory(offer)
              ? "Inventaire plein"
              : offer.price === 0
                ? "Prendre"
                : `${offer.price} or`
          }}
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
import type { BrainrunOffer } from "#shared/brainrunItems";

const props = defineProps<{
  offers: BrainrunOffer[];
  gold: number;
  loading: boolean;
  /** true si l'inventaire de consommables est déjà plein : bloque l'achat des offres CONSUMABLE
   * pour ne pas faire dépenser de l'or pour rien (cf. BrainrunService.buyShopItem). */
  consumablesFull: boolean;
}>();

defineEmits<{
  buy: [index: number];
  leave: [];
}>();

function isBlockedByFullInventory(offer: BrainrunOffer): boolean {
  return offer.kind === "CONSUMABLE" && props.consumablesFull;
}

const {
  offerName: genericOfferName,
  offerDescription: genericOfferDescription,
  offerIcon,
  offerKindLabel,
  kindBadgeClass,
  rarityRingClass,
} = useBrainrunOfferDisplay();

function isAffordable(offer: BrainrunOffer): boolean {
  return (offer.price ?? 0) <= props.gold;
}

// Offre GOLD de secours (aucune relique/consommable disponible) : texte spécifique à la
// Librairie, cf. generateShopReplacementOffer.
function offerName(offer: BrainrunOffer): string {
  if (offer.kind === "GOLD") return `Cache d'or (+${offer.amount ?? 0})`;
  return genericOfferName(offer);
}

function offerDescription(offer: BrainrunOffer): string {
  if (offer.kind === "GOLD")
    return "Aucune relique disponible pour l'instant : un peu d'or à la place.";
  return genericOfferDescription(offer);
}
</script>
