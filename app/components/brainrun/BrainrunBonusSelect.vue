<template>
  <div class="text-center py-6 px-2 space-y-5">
    <div class="space-y-1">
      <h3 class="text-lg font-black font-display text-white tracking-wide">Choisissez un bonus</h3>
      <p class="text-xs text-gray-400">Une seule récompense, le reste reste dans la salle.</p>
    </div>

    <div class="space-y-3">
      <button
        v-for="offer in offers"
        :key="offer.id"
        type="button"
        :disabled="loading"
        class="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 text-left transition-colors disabled:opacity-50"
        @click="$emit('pick', offer.id)"
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
      </button>
    </div>

    <UButton
      variant="ghost"
      color="neutral"
      :disabled="loading"
      class="font-bold font-display uppercase tracking-widest text-xs"
      @click="$emit('skip')"
    >
      Passer
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { BrainrunOffer } from "#shared/brainrunItems";

defineProps<{
  offers: BrainrunOffer[];
  loading: boolean;
}>();

defineEmits<{
  pick: [id: string];
  skip: [];
}>();

const { offerName, offerDescription, offerIcon, offerKindLabel, kindBadgeClass, rarityRingClass } =
  useBrainrunOfferDisplay();
</script>
