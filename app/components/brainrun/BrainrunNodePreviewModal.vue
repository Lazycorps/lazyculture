<template>
  <UModal
    :open="true"
    :ui="{ content: 'max-w-xs' }"
    @update:open="(value) => !value && emit('close')"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg shrink-0"
            >
              <UIcon :name="roomTypeIcon(node.type)" />
            </div>
            <h3 class="text-sm font-black font-display text-white tracking-wide">
              {{ roomTypeLabel(node.type) }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-auto -my-1"
              @click="emit('close')"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <p
              class="text-[10px] font-black font-display uppercase tracking-wider text-gray-500 mb-1.5"
            >
              Thèmes
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="theme in node.themes ?? []"
                :key="theme"
                class="text-[11px] font-bold capitalize px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300"
              >
                {{ themeLabel(theme) }}
              </span>
            </div>
          </div>

          <UButton
            v-if="canMoveHere"
            block
            color="primary"
            :loading="loading"
            @click="emit('move')"
          >
            Se déplacer
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { BrainrunMapNodeDTO } from "#shared/brainrun";

defineProps<{
  node: BrainrunMapNodeDTO;
  canMoveHere: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{ move: []; close: [] }>();

const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();

function themeLabel(theme: string): string {
  return theme.replace(/[-_]/g, " ");
}
</script>
