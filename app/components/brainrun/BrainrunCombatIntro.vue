<template>
  <!-- Téléporté sur <body> : la page contient des ancêtres avec backdrop-filter (UCard
       "backdrop-blur-xl"), qui créent un containing block pour les descendants "fixed" —
       sans ça, cet overlay se recentrerait sur cette carte plutôt que sur tout le viewport. -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto"
    >
      <div class="absolute inset-0" :class="backgroundClass" />
      <div class="relative text-center px-6 space-y-4">
        <!-- Type de rencontre (Combat / Élite / Boss) : affiché immédiatement, avant même que le
             nom de l'adversaire ne soit connu (récupéré en léger différé, cf. index.vue). -->
        <div
          class="mx-auto rounded-full flex items-center justify-center border animate-combat-badge-in"
          :class="badgeClass"
        >
          <UIcon :name="icon" :class="iconSizeClass" />
        </div>
        <p
          class="text-[11px] font-black uppercase tracking-[0.3em] font-display animate-combat-badge-in"
          :class="labelClass"
        >
          {{ kindLabel }}
        </p>
        <!-- Emplacement du nom (hauteur réservée pour éviter tout saut de mise en page pendant
             l'attente) : dès que le nom est récupéré, il balaie de la gauche, marque une pause au
             centre, puis repart vers la droite. La fin de ce balayage (nom disparu) clôt la
             transition (emit "done"). -->
        <div class="h-11 flex items-center justify-center">
          <h2
            v-if="showName"
            class="font-black font-display text-white tracking-wide whitespace-nowrap animate-combat-name-sweep"
            :class="nameSizeClass"
            :style="{ animationDuration: `${sweepDuration}ms` }"
            @animationend="finish"
          >
            {{ name }}
          </h2>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/** Transition bloquante affichée à l'entrée d'un combat (Standard/Elite/Boss), en deux temps :
 * 1) le TYPE de rencontre apparaît immédiatement (connu dès le clic) ; 2) le NOM de l'adversaire,
 * récupéré en léger différé le temps que le serveur tire les questions, balaie de gauche à droite
 * avec une pause au centre. La transition se termine à la fin de ce balayage (emit "done") — jamais
 * au clic. Filet de sécurité : si le nom n'arrive jamais (erreur réseau), on termine quand même
 * après MAX_WAIT_MS pour ne pas rester bloqué sur l'overlay. */
const props = defineProps<{
  type: "STANDARD" | "ELITE" | "BOSS";
  name: string;
}>();

const emit = defineEmits<{
  done: [];
}>();

// Durée du balayage du nom (gauche → pause centre → droite), un peu plus longue pour les paliers
// les plus solennels.
const SWEEP_MS: Record<typeof props.type, number> = {
  STANDARD: 1500,
  ELITE: 1800,
  BOSS: 2100,
};
// Au-delà de ce délai sans nom (API en échec/anormalement lente), on clôt la transition d'office.
const MAX_WAIT_MS = 6000;

const sweepDuration = computed(() => SWEEP_MS[props.type]);
const showName = computed(() => props.name.length > 0);

let done = false;
let fallback: ReturnType<typeof setTimeout> | null = null;
function finish() {
  if (done) return;
  done = true;
  if (fallback) clearTimeout(fallback);
  emit("done");
}
onMounted(() => {
  fallback = setTimeout(finish, MAX_WAIT_MS);
});
onBeforeUnmount(() => {
  if (fallback) clearTimeout(fallback);
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
  if (props.type === "ELITE") return "w-20 h-20 bg-amber-500/10 border-amber-500/40 text-amber-400";
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
</script>

<style scoped>
/* Entrée immédiate du badge + libellé de type. */
@keyframes combat-badge-in {
  0% {
    opacity: 0;
    transform: scale(0.82) translateY(6px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-combat-badge-in {
  animation-name: combat-badge-in;
  animation-duration: 400ms;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

/* Balayage du nom : arrive de la gauche, s'immobilise au centre, repart vers la droite. La
   disparition est portée par l'opacité (fade aux deux extrémités), indépendante de la longueur du
   nom, et l'overlay parent (overflow-hidden) coupe tout débordement horizontal. */
@keyframes combat-name-sweep {
  0% {
    opacity: 0;
    transform: translateX(-160%);
  }
  22% {
    opacity: 1;
    transform: translateX(0);
  }
  68% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(160%);
  }
}

.animate-combat-name-sweep {
  animation-name: combat-name-sweep;
  animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  animation-fill-mode: both;
}
</style>
