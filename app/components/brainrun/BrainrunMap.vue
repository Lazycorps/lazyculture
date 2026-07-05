<template>
  <div ref="containerRef" class="relative w-full select-none py-4">
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0">
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
        stroke-width="4"
        stroke-dasharray="6 6"
        :stroke="edge.traveled ? 'url(#brainrun-map-progress)' : '#1e293b'"
      />
    </svg>

    <div class="relative flex flex-col-reverse gap-7" style="z-index: 1">
      <div v-for="row in rows" :key="row.row" class="flex justify-center gap-6">
        <div v-for="node in row.nodes" :key="node.col" class="flex flex-col items-center gap-1">
          <button
            :id="nodeDomId(node.row, node.col)"
            type="button"
            :disabled="!isClickable(node) || loading"
            class="relative w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all disabled:cursor-not-allowed"
            :class="nodeClass(node)"
            @click="emit('select-node', node.col)"
          >
            <UIcon
              v-if="!node.type"
              name="i-heroicons-question-mark-circle"
              class="text-lg text-slate-600"
            />
            <UIcon
              v-else-if="node.status === 'CLEARED'"
              name="i-heroicons-check"
              class="text-xl text-white"
            />
            <UIcon v-else :name="roomTypeIcon(node.type)" class="text-lg" />
            <span
              v-if="isClickable(node)"
              class="absolute -inset-1 rounded-full border border-violet-500/50 animate-ping opacity-60 pointer-events-none"
            />
          </button>
          <span
            v-if="node.type && (isClickable(node) || node.status !== 'PENDING')"
            class="text-[9px] font-black font-display uppercase tracking-wide text-gray-400 text-center max-w-[4.5rem] leading-tight"
          >
            {{ roomTypeLabel(node.type) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BrainrunMapNodeDTO } from "#shared/brainrun";

const props = defineProps<{
  mapNodes: BrainrunMapNodeDTO[];
  currentRow: number;
  candidateCols: number[] | null;
  loading: boolean;
}>();

const emit = defineEmits<{ "select-node": [col: number] }>();

const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();

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

function isClickable(node: BrainrunMapNodeDTO): boolean {
  return (
    props.candidateCols !== null &&
    node.row === props.currentRow &&
    props.candidateCols.includes(node.col)
  );
}

function nodeClass(node: BrainrunMapNodeDTO): string {
  if (node.status === "CLEARED") {
    return "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20";
  }
  if (node.status === "ACTIVE") {
    return "bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/30";
  }
  if (node.status === "FAILED") {
    return "bg-rose-600 border-rose-400 text-white";
  }
  if (isClickable(node)) {
    return "bg-white/10 border-violet-500 text-violet-300 hover:bg-white/20 cursor-pointer";
  }
  if (node.type) {
    // Révélé à distance par la relique Prévoyance, pas encore accessible.
    return "bg-white/5 border-white/10 text-gray-300";
  }
  return "bg-slate-900 border-slate-800 text-slate-600";
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

const edgePaths = computed(() => {
  const paths: { key: string; d: string; traveled: boolean }[] = [];
  for (const node of props.mapNodes) {
    const from = positions.value.get(`${node.row}:${node.col}`);
    if (!from) continue;
    for (const col of node.nextCols) {
      const to = positions.value.get(`${node.row + 1}:${col}`);
      if (!to) continue;
      const cy = (from.y + to.y) / 2;
      paths.push({
        key: `${node.row}:${node.col}->${node.row + 1}:${col}`,
        d: `M ${from.x} ${from.y} C ${from.x} ${cy}, ${to.x} ${cy}, ${to.x} ${to.y}`,
        traveled: node.status !== "PENDING",
      });
    }
  }
  return paths;
});
</script>
