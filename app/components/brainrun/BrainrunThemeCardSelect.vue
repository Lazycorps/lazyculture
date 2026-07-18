<template>
  <div class="text-center py-6 px-2 space-y-5">
    <div class="space-y-1">
      <h3 class="text-lg font-black font-display text-white tracking-wide">Carte de thème</h3>
      <p class="text-xs text-gray-400 max-w-xs mx-auto">
        Renforcez un thème pour orienter les questions de vos prochains combats.
      </p>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="card in cards"
        :key="card.themeSlug"
        type="button"
        :disabled="loading"
        class="group relative h-44 rounded-2xl border-2 overflow-hidden text-left transition-transform duration-200 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
        :class="[rarityStyle(card.rarity).border, rarityStyle(card.rarity).glow]"
        @click="$emit('pick', card.themeSlug)"
      >
        <!-- Illustration du thème en fond, assombrie pour garder le texte lisible. -->
        <img
          v-if="card.themeImage"
          :src="card.themeImage"
          :alt="card.themeName"
          class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-200"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20"
        ></div>

        <div class="relative h-full flex flex-col justify-between p-2">
          <span
            class="self-start text-[8px] font-black font-display uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
            :class="rarityStyle(card.rarity).badge"
          >
            {{ rarityStyle(card.rarity).label }}
          </span>

          <div class="space-y-1.5">
            <p
              class="text-[11px] font-black font-display text-white tracking-wide leading-tight line-clamp-2"
            >
              {{ card.themeName }}
            </p>
            <div
              class="flex items-center justify-center gap-1 rounded-lg bg-slate-950/70 border border-white/10 py-1"
            >
              <span class="text-xs font-black font-display text-gray-400 tabular-nums">
                {{ card.coefBefore }}
              </span>
              <UIcon
                name="i-heroicons-arrow-long-right-20-solid"
                class="text-xs"
                :class="rarityStyle(card.rarity).accent"
              />
              <span
                class="text-sm font-black font-display tabular-nums"
                :class="rarityStyle(card.rarity).accent"
              >
                {{ card.coefAfter }}
              </span>
              <span
                class="ml-0.5 text-[9px] font-black font-display tabular-nums"
                :class="rarityStyle(card.rarity).accent"
              >
                (+{{ card.coefAfter - card.coefBefore }})
              </span>
            </div>
          </div>
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
import type { BrainrunThemeCardDTO, BrainrunThemeCardRarity } from "#shared/brainrun";

defineProps<{
  cards: BrainrunThemeCardDTO[];
  loading: boolean;
}>();

defineEmits<{
  /** slug du thème de la carte choisie. */
  pick: [themeSlug: string];
  /** Passer sans prendre de carte (applique la relique Lot de Consolation si possédée). */
  skip: [];
}>();

/** Identité visuelle par rareté : classique (gris) / rare (bleuté) / épique (mauve) / légendaire
 * (orange), cf. spec des cartes de thème (BrainrunThemeCardRarity, shared/brainrun.ts). */
const RARITY_STYLES: Record<
  BrainrunThemeCardRarity,
  { label: string; border: string; glow: string; badge: string; accent: string }
> = {
  STANDARD: {
    label: "Standard",
    border: "border-slate-400/30",
    glow: "",
    badge: "bg-slate-500/20 border-slate-400/30 text-slate-200",
    accent: "text-slate-200",
  },
  RARE: {
    label: "Rare",
    border: "border-sky-400/50",
    glow: "shadow-[0_0_16px_rgba(56,189,248,0.3)]",
    badge: "bg-sky-500/20 border-sky-400/40 text-sky-300",
    accent: "text-sky-300",
  },
  EPIC: {
    label: "Épique",
    border: "border-violet-400/60",
    glow: "shadow-[0_0_18px_rgba(167,139,250,0.4)]",
    badge: "bg-violet-500/20 border-violet-400/50 text-violet-300",
    accent: "text-violet-300",
  },
  LEGENDARY: {
    label: "Légendaire",
    border: "border-amber-400/70",
    glow: "shadow-[0_0_22px_rgba(251,191,36,0.45)]",
    badge: "bg-amber-500/20 border-amber-400/50 text-amber-300",
    accent: "text-amber-300",
  },
};

function rarityStyle(rarity: BrainrunThemeCardRarity) {
  return RARITY_STYLES[rarity];
}
</script>
