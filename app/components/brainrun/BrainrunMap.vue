<template>
  <div ref="containerRef" class="relative w-full select-none py-5 overflow-hidden">
    <!-- Lueurs d'ambiance, façon carte Aventure, en version compacte pour ce cadre plus étroit. -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <div
        class="absolute top-1/4 left-[10%] w-40 h-40 rounded-full bg-violet-600/10 blur-[60px] animate-pulse-slow"
      />
      <div
        class="absolute bottom-1/4 right-[10%] w-48 h-48 rounded-full bg-indigo-500/10 blur-[70px] animate-pulse-slower"
      />
    </div>

    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 1">
      <defs>
        <linearGradient id="brainrun-map-progress" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <path
        v-for="edge in edgePaths"
        :key="edge.key"
        :d="edge.d"
        fill="none"
        :stroke-width="edge.traveled ? 5 : 4"
        stroke-dasharray="7 7"
        :stroke="
          edge.traveled ? 'url(#brainrun-map-progress)' : edge.reachable ? '#8b5cf6' : '#1e293b'
        "
        :class="edge.traveled ? 'stroke-dash-fast' : edge.reachable ? 'stroke-dash-slow' : ''"
        :style="
          edge.traveled
            ? 'filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.45))'
            : edge.reachable
              ? 'filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.3))'
              : ''
        "
      />
    </svg>

    <div class="relative flex flex-col-reverse gap-8" style="z-index: 2">
      <div
        v-for="row in rows"
        :key="row.row"
        class="flex justify-center gap-6 transition-transform duration-300"
        :style="{ transform: `translateX(${rowOffset(row.row)}px)` }"
      >
        <div v-for="node in row.nodes" :key="node.col" class="flex flex-col items-center gap-1.5">
          <div class="relative flex flex-col items-center">
            <!-- Marqueur "vous êtes ici" au-dessus du nœud actif. -->
            <div
              v-if="node.status === 'ACTIVE'"
              class="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none select-none"
            >
              <div
                class="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border-2 border-white shadow-neon flex items-center justify-center animate-bob"
              >
                <span class="text-[10px] font-black text-white uppercase select-none">
                  {{ userStore.username ? userStore.username[0] : "🦥" }}
                </span>
              </div>
            </div>

            <button
              :id="nodeDomId(node.row, node.col)"
              type="button"
              :disabled="(!isClickable(node) && !canPreview(node)) || loading"
              class="relative w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-75 disabled:cursor-not-allowed"
              :class="nodeClass(node)"
              @click="onNodeClick(node)"
            >
              <UIcon
                v-if="node.status === 'CLEARED'"
                name="i-heroicons-check"
                class="text-xl text-white font-bold"
              />
              <UIcon v-else :name="roomTypeIcon(node.type)" class="text-lg" />

              <span
                v-if="isClickable(node)"
                class="absolute -inset-1.5 rounded-full border border-violet-500/50 animate-ping opacity-60 pointer-events-none"
              />
            </button>
          </div>

          <span
            v-if="isClickable(node) || node.status !== 'PENDING'"
            class="text-[9px] font-black font-display uppercase tracking-wide text-center max-w-[4.5rem] leading-tight px-1.5 py-0.5 rounded-full"
            :class="labelClass(node)"
          >
            {{ roomTypeLabel(node.type) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BrainrunMapNodeDTO, BrainrunRoomType } from "#shared/brainrun";
import { useUserStore } from "~/stores/userStore";

const props = defineProps<{
  mapNodes: BrainrunMapNodeDTO[];
  currentRow: number;
  candidateCols: number[] | null;
  loading: boolean;
  /** Relique Prévoyance possédée : permet de cliquer un nœud de combat n'importe où sur la carte
   * pour prévisualiser son ennemi/boss, plutôt que de s'y déplacer directement. */
  hasForesight: boolean;
}>();

const emit = defineEmits<{
  "select-node": [col: number];
  "preview-node": [node: BrainrunMapNodeDTO];
}>();

const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();
const userStore = useUserStore();

const COMBAT_ROOM_TYPES: BrainrunRoomType[] = ["STANDARD", "ELITE", "BOSS"];

/** Prévoyance : ce nœud peut être cliqué pour prévisualiser son ennemi/boss, où qu'il soit sur la
 * carte — le clic ouvre alors une modale au lieu de déplacer directement (cf. onNodeClick). */
function canPreview(node: BrainrunMapNodeDTO): boolean {
  return props.hasForesight && COMBAT_ROOM_TYPES.includes(node.type);
}

function onNodeClick(node: BrainrunMapNodeDTO): void {
  if (canPreview(node)) {
    emit("preview-node", node);
    return;
  }
  if (isClickable(node)) emit("select-node", node.col);
}

const rows = computed(() => {
  const byRow = new Map<number, BrainrunMapNodeDTO[]>();
  for (const node of props.mapNodes) {
    if (!byRow.has(node.row)) byRow.set(node.row, []);
    byRow.get(node.row)!.push(node);
  }
  return [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, nodes]) => ({ row, nodes: [...nodes].sort((a, b) => a.col - b.col) }));
});

// Léger tracé sinueux d'une rangée à l'autre, façon carte Aventure — amplitude réduite car
// chaque rangée occupe déjà de la largeur avec plusieurs nœuds côte à côte.
function rowOffset(row: number): number {
  return Math.sin((row - 1) * 0.9) * 28;
}

function isClickable(node: BrainrunMapNodeDTO): boolean {
  return (
    props.candidateCols !== null &&
    node.row === props.currentRow &&
    props.candidateCols.includes(node.col)
  );
}

function nodeClass(node: BrainrunMapNodeDTO): string {
  if (node.status === "CLEARED") {
    return "bg-emerald-500 border-t-2 border-x-2 border-b-6 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110";
  }
  if (node.status === "ACTIVE") {
    return "bg-violet-600 border-t-2 border-x-2 border-b-6 border-violet-400 border-b-violet-800 text-white shadow-lg shadow-violet-600/30";
  }
  if (node.status === "FAILED") {
    return "bg-rose-600 border-t-2 border-x-2 border-b-6 border-rose-400 border-b-rose-800 text-white shadow-lg shadow-rose-600/20";
  }
  if (isClickable(node)) {
    return "bg-white/10 border-t-2 border-x-2 border-b-6 border-violet-500/60 border-b-violet-800/70 text-violet-200 hover:brightness-125 active:translate-y-[3px] active:border-b-2 cursor-pointer";
  }
  // Pas encore accessible : la salle reste visible (plus de brouillard de guerre), style neutre.
  return "bg-white/5 border-2 border-white/10 text-gray-300";
}

function labelClass(node: BrainrunMapNodeDTO): string {
  if (node.status === "CLEARED") return "text-emerald-400 bg-emerald-500/10";
  if (node.status === "ACTIVE") return "text-violet-400 bg-violet-500/10";
  if (node.status === "FAILED") return "text-rose-400 bg-rose-500/10";
  if (isClickable(node)) return "text-violet-300 bg-violet-500/10";
  return "text-gray-500 bg-white/5";
}

// Positions DOM des nœuds, recalculées au montage/redimensionnement/changement de carte, pour
// tracer les chemins en SVG (même approche que app/pages/adventure/[id]/map.vue, adaptée pour
// tracer une courbe par arête plutôt qu'un unique tracé continu).
const containerRef = ref<HTMLElement | null>(null);
const positions = ref<Map<string, { x: number; y: number }>>(new Map());

function nodeDomId(row: number, col: number): string {
  return `brainrun-node-${row}-${col}`;
}

function updatePositions() {
  const container = containerRef.value;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const next = new Map<string, { x: number; y: number }>();
  for (const node of props.mapNodes) {
    const el = document.getElementById(nodeDomId(node.row, node.col));
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    next.set(`${node.row}:${node.col}`, {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    });
  }
  positions.value = next;
}

onMounted(() => {
  nextTick(updatePositions);
  window.addEventListener("resize", updatePositions);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", updatePositions);
});
watch(
  () => props.mapNodes,
  () => nextTick(updatePositions),
  { deep: true },
);

// Colonne du nœud CLEARED sur la rangée juste avant currentRow — c'est-à-dire "ma position
// actuelle" quand un choix est en attente. Sert à ne mettre en valeur QUE les arêtes qui en
// partent réellement, pas toute arête menant à une colonne candidate (plusieurs nœuds d'une
// même rangée peuvent converger vers le même nœud suivant sans que j'y sois pour autant).
const currentPositionCol = computed(() => {
  if (props.candidateCols === null || props.currentRow <= 1) return null;
  const previousCleared = props.mapNodes.find(
    (n) => n.row === props.currentRow - 1 && n.status === "CLEARED",
  );
  return previousCleared?.col ?? null;
});

const edgePaths = computed(() => {
  const paths: { key: string; d: string; traveled: boolean; reachable: boolean }[] = [];
  const nodeByKey = new Map(props.mapNodes.map((n) => [`${n.row}:${n.col}`, n]));
  for (const node of props.mapNodes) {
    const from = positions.value.get(`${node.row}:${node.col}`);
    if (!from) continue;
    for (const col of node.nextCols) {
      const to = positions.value.get(`${node.row + 1}:${col}`);
      if (!to) continue;
      const targetNode = nodeByKey.get(`${node.row + 1}:${col}`);
      // Emprunté : les deux extrémités ont été effectivement traversées (et pas seulement
      // "un chemin possible depuis un nœud déjà joué" — un nœud CLEARED peut avoir plusieurs
      // arêtes sortantes dont une seule a réellement été choisie).
      const traveled = node.status !== "PENDING" && targetNode?.status !== "PENDING";
      const reachable =
        !traveled &&
        props.candidateCols !== null &&
        node.row + 1 === props.currentRow &&
        node.col === currentPositionCol.value &&
        props.candidateCols.includes(col);
      const cy = (from.y + to.y) / 2;
      paths.push({
        key: `${node.row}:${node.col}->${node.row + 1}:${col}`,
        d: `M ${from.x} ${from.y} C ${from.x} ${cy}, ${to.x} ${cy}, ${to.x} ${to.y}`,
        traveled,
        reachable,
      });
    }
  }
  return paths;
});
</script>

<style scoped>
@keyframes brainrun-dash {
  to {
    stroke-dashoffset: -28;
  }
}
.stroke-dash-fast {
  animation: brainrun-dash 1.2s linear infinite;
}
.stroke-dash-slow {
  animation: brainrun-dash 2.4s linear infinite;
}

@keyframes brainrun-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
.animate-bob {
  animation: brainrun-bob 2s ease-in-out infinite;
}

@keyframes brainrun-pulse-slow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}
@keyframes brainrun-pulse-slower {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
.animate-pulse-slow {
  animation: brainrun-pulse-slow 8s ease-in-out infinite;
}
.animate-pulse-slower {
  animation: brainrun-pulse-slower 12s ease-in-out infinite;
}
</style>
