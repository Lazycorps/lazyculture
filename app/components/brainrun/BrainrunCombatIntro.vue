<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto"
  >
    <div class="absolute inset-0" :class="backgroundClass" />
    <div class="relative text-center px-6 space-y-4" :class="animClass" :style="animStyle">
      <div class="mx-auto rounded-full flex items-center justify-center border" :class="badgeClass">
        <UIcon :name="icon" :class="iconSizeClass" />
      </div>
      <div class="space-y-1">
        <p
          class="text-[11px] font-black uppercase tracking-[0.3em] font-display"
          :class="labelClass"
        >
          {{ kindLabel }}
        </p>
        <h2 class="font-black font-display text-white tracking-wide" :class="nameSizeClass">
          {{ name }}
        </h2>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Transition bloquante affichée à l'entrée d'un combat (Standard/Elite/Boss) : présente
 * l'adversaire pendant une durée fixe (≤ 3s, cf. DURATIONS_MS), sans aucune action possible
 * pour le joueur — se ferme d'elle-même (émet "done"), jamais au clic. */
const props = defineProps<{
  type: "STANDARD" | "ELITE" | "BOSS";
  name: string;
}>();

const emit = defineEmits<{
  done: [];
}>();

const DURATIONS_MS: Record<typeof props.type, number> = {
  STANDARD: 1400,
  ELITE: 2100,
  BOSS: 2800,
};

const duration = computed(() => DURATIONS_MS[props.type]);
const animStyle = computed(() => ({ animationDuration: `${duration.value}ms` }));

let timeout: ReturnType<typeof setTimeout> | null = null;
onMounted(() => {
  timeout = setTimeout(() => emit("done"), duration.value);
});
onBeforeUnmount(() => {
  if (timeout) clearTimeout(timeout);
});

const kindLabel = computed(() => {
  if (props.type === "STANDARD") return "Combat";
  if (props.type === "ELITE") return "Élite";
  return "Boss";
});

const icon = computed(() => {
  if (props.type === "STANDARD") return "i-heroicons-bolt";
  if (props.type === "ELITE") return "i-heroicons-fire";
  return "i-heroicons-shield-exclamation";
});

const backgroundClass = computed(() => {
  if (props.type === "STANDARD") return "bg-slate-950/90";
  if (props.type === "ELITE")
    return "bg-gradient-to-b from-amber-950/90 via-slate-950/95 to-slate-950/95";
  return "bg-gradient-to-b from-rose-950/90 via-slate-950/95 to-slate-950/95";
});

const badgeClass = computed(() => {
  if (props.type === "STANDARD")
    return "w-16 h-16 bg-violet-500/10 border-violet-500/30 text-violet-400";
  if (props.type === "ELITE")
    return "w-20 h-20 bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse";
  return "w-24 h-24 bg-rose-500/10 border-rose-500/50 text-rose-400 animate-pulse";
});

const iconSizeClass = computed(() => {
  if (props.type === "STANDARD") return "text-2xl";
  if (props.type === "ELITE") return "text-3xl";
  return "text-4xl";
});

const nameSizeClass = computed(() => {
  if (props.type === "STANDARD") return "text-xl";
  if (props.type === "ELITE") return "text-2xl";
  return "text-3xl";
});

const labelClass = computed(() => {
  if (props.type === "STANDARD") return "text-violet-400";
  if (props.type === "ELITE") return "text-amber-400";
  return "text-rose-400";
});

const animClass = computed(() => {
  if (props.type === "STANDARD") return "animate-combat-intro-standard";
  if (props.type === "ELITE") return "animate-combat-intro-elite";
  return "animate-combat-intro-boss";
});
</script>

<style scoped>
@keyframes combat-intro-standard {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  85% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
}

@keyframes combat-intro-elite {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  10% {
    opacity: 1;
    transform: scale(1.1);
  }
  20% {
    transform: scale(1);
  }
  88% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.94);
  }
}

@keyframes combat-intro-boss {
  0% {
    opacity: 0;
    transform: scale(0.55);
  }
  8% {
    opacity: 1;
    transform: scale(1.18);
  }
  14% {
    transform: scale(0.96);
  }
  20% {
    transform: scale(1.05);
  }
  26% {
    transform: scale(1);
  }
  90% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.06);
  }
}

.animate-combat-intro-standard {
  animation-name: combat-intro-standard;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.animate-combat-intro-elite {
  animation-name: combat-intro-elite;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.animate-combat-intro-boss {
  animation-name: combat-intro-boss;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}
</style>
