<template>
  <!-- Légende des nœuds de la carte, en jeu (auparavant seulement dans l'aide du lobby). Repliée
       par défaut en une rangée d'icônes pour ne pas manger la hauteur d'écran sur mobile ; un tap
       la déplie en grille icône + libellé, avec un lien vers l'aide complète. -->
  <div class="mx-auto w-full max-w-sm">
    <button
      type="button"
      class="mx-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-gray-400 active:bg-white/10"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <span class="text-[10px] font-black font-display uppercase tracking-wider">Légende</span>
      <span v-if="!expanded" class="flex items-center gap-1.5 text-violet-300">
        <UIcon
          v-for="type in LEGEND_TYPES"
          :key="type"
          :name="roomTypeIcon(type)"
          class="text-sm"
        />
      </span>
      <UIcon
        :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="text-sm"
      />
    </button>

    <div v-if="expanded" class="mt-2 rounded-2xl border border-white/10 bg-white/5 p-2.5">
      <ul class="grid grid-cols-2 gap-x-3 gap-y-2">
        <li v-for="type in LEGEND_TYPES" :key="type" class="flex items-center gap-2 min-w-0">
          <span
            class="w-7 h-7 shrink-0 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300 text-sm"
          >
            <UIcon :name="roomTypeIcon(type)" />
          </span>
          <span class="text-[11px] font-bold font-display text-gray-300 truncate">
            {{ roomTypeLabel(type) }}
          </span>
        </li>
      </ul>
      <button
        type="button"
        class="mt-2.5 w-full rounded-lg py-2 text-[10px] font-black font-display uppercase tracking-wider text-violet-300 active:bg-violet-500/10"
        @click="showHelp = true"
      >
        Détail des salles
      </button>
    </div>

    <BrainrunHelpModal v-model:open="showHelp" />
  </div>
</template>

<script setup lang="ts">
import type { BrainrunRoomType } from "#shared/brainrun";

// Même ordre que BrainrunHelpModal ; NEUTRAL (départ) exclu, il n'apparaît qu'une fois et n'est
// jamais à choisir.
const LEGEND_TYPES: BrainrunRoomType[] = ["STANDARD", "ELITE", "BOSS", "REST", "SHOP", "EVENT"];
const STORAGE_KEY = "lazyculture-brainrun-legend-expanded";

const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();

const expanded = ref(false);
const showHelp = ref(false);

onMounted(() => {
  try {
    expanded.value = localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Stockage indisponible (navigation privée...) : on reste replié.
  }
});

function toggle() {
  expanded.value = !expanded.value;
  try {
    localStorage.setItem(STORAGE_KEY, String(expanded.value));
  } catch {
    // Préférence non mémorisée, sans conséquence.
  }
}
</script>
