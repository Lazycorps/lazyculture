<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2 px-1">
      <span class="w-2.5 h-2.5 rounded-full" :class="palette.dot" />
      <h3 class="font-black font-display text-sm uppercase tracking-wide" :class="palette.title">
        {{ branchLabel }}
      </h3>
    </div>

    <div ref="containerRef" class="relative w-full overflow-x-auto py-3">
      <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 1">
        <path
          v-for="edge in edgePaths"
          :key="edge.key"
          :d="edge.d"
          fill="none"
          :stroke-width="edge.traveled ? 4 : 3"
          stroke-dasharray="6 6"
          :stroke="
            edge.traveled ? palette.edgeColor : edge.reachable ? palette.edgeColor : '#1e293b'
          "
          :stroke-opacity="edge.traveled ? 1 : edge.reachable ? 0.6 : 0.5"
        />
      </svg>

      <div class="relative flex flex-col-reverse gap-6 min-w-max px-4 mx-auto" style="z-index: 2">
        <div v-for="tierRow in tierRows" :key="tierRow.tier" class="flex justify-center gap-5">
          <div
            v-for="node in tierRow.nodes"
            :key="node.id"
            class="flex flex-col items-center gap-1"
          >
            <button
              :id="nodeDomId(node.id)"
              type="button"
              :disabled="isUnlocked(node) || !isUnlockable(node) || loading"
              class="relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-75 disabled:cursor-not-allowed"
              :class="nodeClass(node)"
              @click="selectedId = node.id"
            >
              <UIcon
                v-if="isUnlocked(node)"
                name="i-heroicons-check"
                class="text-lg text-white font-bold"
              />
              <UIcon v-else :name="node.icon" class="text-base" />
            </button>
            <span
              class="text-[8px] font-bold text-gray-500 uppercase tracking-wide"
              :class="isUnlocked(node) ? palette.labelUnlocked : ''"
            >
              {{ isUnlocked(node) ? "Acquis" : `${node.cost} PS` }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedNode"
      class="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3"
    >
      <div
        class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl"
        :class="
          isUnlocked(selectedNode)
            ? palette.iconUnlocked
            : isUnlockable(selectedNode)
              ? palette.iconUnlockable
              : 'bg-white/5 border border-white/10 text-gray-500'
        "
      >
        <UIcon :name="selectedNode.icon" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-black font-display text-sm text-white tracking-wide truncate">
          {{ selectedNode.name }}
        </p>
        <p class="text-[11px] text-gray-400 leading-snug">{{ selectedNode.description }}</p>
        <p
          v-if="!isUnlocked(selectedNode) && !isUnlockable(selectedNode)"
          class="text-[10px] text-rose-400 mt-1"
        >
          Débloquez d'abord {{ prerequisiteNames(selectedNode) }}.
        </p>
      </div>
      <UButton
        v-if="!isUnlocked(selectedNode)"
        size="sm"
        :color="isUnlockable(selectedNode) && isAffordable(selectedNode) ? 'primary' : 'neutral'"
        :disabled="loading || !isUnlockable(selectedNode) || !isAffordable(selectedNode)"
        class="font-black font-display shrink-0 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
        @click="emit('unlock', selectedNode.id)"
      >
        {{ selectedNode.cost }} PS
      </UButton>
      <UIcon
        v-else
        name="i-heroicons-check-circle-solid"
        class="text-emerald-400 text-2xl shrink-0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BRAINRUN_TALENTS,
  type BrainrunTalentBranch,
  type BrainrunTalentDef,
  type BrainrunTalentId,
} from "#shared/brainrunTalents";

const props = defineProps<{
  branch: BrainrunTalentBranch;
  unlockedTalents: BrainrunTalentId[];
  knowledgePoints: number;
  loading: boolean;
}>();

const emit = defineEmits<{
  unlock: [id: BrainrunTalentId];
}>();

const BRANCH_LABELS: Record<BrainrunTalentBranch, string> = {
  RESISTANCE: "Résistance",
  DAMAGE: "Dégâts",
  UTILITY: "Utilitaire",
};
const branchLabel = computed(() => BRANCH_LABELS[props.branch]);

const PALETTE: Record<
  BrainrunTalentBranch,
  {
    dot: string;
    title: string;
    unlocked: string;
    unlockable: string;
    locked: string;
    labelUnlocked: string;
    iconUnlocked: string;
    iconUnlockable: string;
    edgeColor: string;
  }
> = {
  RESISTANCE: {
    dot: "bg-emerald-500",
    title: "text-emerald-400",
    unlocked:
      "bg-emerald-500 border-t-2 border-x-2 border-b-6 border-emerald-400 border-b-emerald-700 text-white shadow-lg shadow-emerald-500/20",
    unlockable:
      "bg-white/10 border-t-2 border-x-2 border-b-6 border-emerald-500/60 border-b-emerald-800/70 text-emerald-200 hover:brightness-125 active:translate-y-[3px] active:border-b-2 cursor-pointer",
    locked: "bg-white/5 border-2 border-white/10 text-gray-500",
    labelUnlocked: "text-emerald-400",
    iconUnlocked: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400",
    iconUnlockable: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300",
    edgeColor: "#10b981",
  },
  DAMAGE: {
    dot: "bg-rose-500",
    title: "text-rose-400",
    unlocked:
      "bg-rose-500 border-t-2 border-x-2 border-b-6 border-rose-400 border-b-rose-700 text-white shadow-lg shadow-rose-500/20",
    unlockable:
      "bg-white/10 border-t-2 border-x-2 border-b-6 border-rose-500/60 border-b-rose-800/70 text-rose-200 hover:brightness-125 active:translate-y-[3px] active:border-b-2 cursor-pointer",
    locked: "bg-white/5 border-2 border-white/10 text-gray-500",
    labelUnlocked: "text-rose-400",
    iconUnlocked: "bg-rose-500/10 border border-rose-500/30 text-rose-400",
    iconUnlockable: "bg-rose-500/10 border border-rose-500/30 text-rose-300",
    edgeColor: "#f43f5e",
  },
  UTILITY: {
    dot: "bg-sky-500",
    title: "text-sky-400",
    unlocked:
      "bg-sky-500 border-t-2 border-x-2 border-b-6 border-sky-400 border-b-sky-700 text-white shadow-lg shadow-sky-500/20",
    unlockable:
      "bg-white/10 border-t-2 border-x-2 border-b-6 border-sky-500/60 border-b-sky-800/70 text-sky-200 hover:brightness-125 active:translate-y-[3px] active:border-b-2 cursor-pointer",
    locked: "bg-white/5 border-2 border-white/10 text-gray-500",
    labelUnlocked: "text-sky-400",
    iconUnlocked: "bg-sky-500/10 border border-sky-500/30 text-sky-400",
    iconUnlockable: "bg-sky-500/10 border border-sky-500/30 text-sky-300",
    edgeColor: "#0ea5e9",
  },
};
const palette = computed(() => PALETTE[props.branch]);

const nodes = computed(() =>
  Object.values(BRAINRUN_TALENTS).filter((t) => t.branch === props.branch),
);

const tierRows = computed(() => {
  const byTier = new Map<number, BrainrunTalentDef[]>();
  for (const node of nodes.value) {
    if (!byTier.has(node.tier)) byTier.set(node.tier, []);
    byTier.get(node.tier)!.push(node);
  }
  return [...byTier.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tier, tierNodes]) => ({ tier, nodes: tierNodes }));
});

function isUnlocked(node: BrainrunTalentDef): boolean {
  return props.unlockedTalents.includes(node.id);
}

function isUnlockable(node: BrainrunTalentDef): boolean {
  if (node.prerequisites.length === 0) return true;
  return node.requireAll
    ? node.prerequisites.every((id) => props.unlockedTalents.includes(id))
    : node.prerequisites.some((id) => props.unlockedTalents.includes(id));
}

function isAffordable(node: BrainrunTalentDef): boolean {
  return props.knowledgePoints >= node.cost;
}

function prerequisiteNames(node: BrainrunTalentDef): string {
  const names = node.prerequisites.map((id) => BRAINRUN_TALENTS[id].name);
  return names.join(node.requireAll ? " et " : " ou ");
}

function nodeClass(node: BrainrunTalentDef): string {
  if (isUnlocked(node)) return palette.value.unlocked;
  if (isUnlockable(node)) return palette.value.unlockable;
  return palette.value.locked;
}

const selectedId = ref<BrainrunTalentId | null>(null);
const selectedNode = computed(() => (selectedId.value ? BRAINRUN_TALENTS[selectedId.value] : null));

const containerRef = ref<HTMLElement | null>(null);
const positions = ref<Map<string, { x: number; y: number }>>(new Map());

function nodeDomId(id: string): string {
  return `brainrun-talent-${props.branch}-${id}`;
}

function updatePositions() {
  const container = containerRef.value;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const next = new Map<string, { x: number; y: number }>();
  for (const node of nodes.value) {
    const el = document.getElementById(nodeDomId(node.id));
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    next.set(node.id, {
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
  () => props.unlockedTalents,
  () => nextTick(updatePositions),
  { deep: true },
);

const edgePaths = computed(() => {
  const paths: { key: string; d: string; traveled: boolean; reachable: boolean }[] = [];
  for (const node of nodes.value) {
    const to = positions.value.get(node.id);
    if (!to) continue;
    for (const prereqId of node.prerequisites) {
      const from = positions.value.get(prereqId);
      if (!from) continue;
      const prereqUnlocked = props.unlockedTalents.includes(prereqId);
      const nodeUnlocked = isUnlocked(node);
      const cy = (from.y + to.y) / 2;
      paths.push({
        key: `${prereqId}->${node.id}`,
        d: `M ${from.x} ${from.y} C ${from.x} ${cy}, ${to.x} ${cy}, ${to.x} ${to.y}`,
        traveled: prereqUnlocked && nodeUnlocked,
        reachable: prereqUnlocked && !nodeUnlocked,
      });
    }
  }
  return paths;
});
</script>
