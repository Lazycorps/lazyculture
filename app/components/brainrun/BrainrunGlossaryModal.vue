<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6 max-h-[70vh] overflow-y-auto' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-black font-display text-white tracking-wide">Glossaire</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <!-- Reliques et consommables : tap pour ouvrir/fermer la description, un tap ailleurs
             la referme (aucun des deux n'a d'action au clic ici, contrairement au bouton d'usage
             de BrainrunQuestionRunner, cf. app/pages/series/brainrun/index.vue). -->
        <div
          class="space-y-6"
          @click="
            openedRelicId = null;
            openedConsumableId = null;
          "
        >
          <section>
            <h4
              class="text-xs font-black font-display text-violet-400 uppercase tracking-wider mb-2"
            >
              Reliques
            </h4>
            <div class="space-y-1.5">
              <div v-for="relic in allRelics" :key="relic.id" class="relative">
                <button
                  type="button"
                  :disabled="!isRelicDiscovered(relic.id)"
                  class="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 text-left disabled:cursor-default"
                  @click.stop="toggleRelic(relic.id)"
                >
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                    :class="
                      isRelicDiscovered(relic.id)
                        ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                        : 'bg-white/5 border border-white/10 text-gray-600'
                    "
                  >
                    <UIcon
                      :name="
                        isRelicDiscovered(relic.id)
                          ? relic.icon
                          : 'i-heroicons-question-mark-circle'
                      "
                    />
                  </div>
                  <p
                    class="text-xs font-black font-display tracking-wide"
                    :class="isRelicDiscovered(relic.id) ? 'text-white' : 'text-gray-600'"
                  >
                    {{ isRelicDiscovered(relic.id) ? relic.name : "???" }}
                  </p>
                </button>
                <div
                  v-if="openedRelicId === relic.id"
                  class="mt-1 bg-slate-900 border border-violet-500/30 rounded-xl p-2.5"
                >
                  <p class="text-[11px] text-gray-400 leading-relaxed">
                    {{ relic.description }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4
              class="text-xs font-black font-display text-amber-400 uppercase tracking-wider mb-2"
            >
              Consommables
            </h4>
            <div class="space-y-1.5">
              <div v-for="consumable in allConsumables" :key="consumable.id" class="relative">
                <button
                  type="button"
                  :disabled="!isConsumableDiscovered(consumable.id)"
                  class="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 text-left disabled:cursor-default"
                  @click.stop="toggleConsumable(consumable.id)"
                >
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                    :class="
                      isConsumableDiscovered(consumable.id)
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-white/5 border border-white/10 text-gray-600'
                    "
                  >
                    <UIcon
                      :name="
                        isConsumableDiscovered(consumable.id)
                          ? consumable.icon
                          : 'i-heroicons-question-mark-circle'
                      "
                    />
                  </div>
                  <p
                    class="text-xs font-black font-display tracking-wide"
                    :class="isConsumableDiscovered(consumable.id) ? 'text-white' : 'text-gray-600'"
                  >
                    {{ isConsumableDiscovered(consumable.id) ? consumable.name : "???" }}
                  </p>
                </button>
                <div
                  v-if="openedConsumableId === consumable.id"
                  class="mt-1 bg-slate-900 border border-amber-500/30 rounded-xl p-2.5"
                >
                  <p class="text-[11px] text-gray-400 leading-relaxed">
                    {{ consumable.description }}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  BRAINRUN_CONSUMABLES,
  BRAINRUN_RELICS,
  type BrainrunConsumableId,
  type BrainrunRelicId,
} from "#shared/brainrunItems";

const open = defineModel<boolean>("open", { required: true });
const props = defineProps<{
  discoveredRelics: BrainrunRelicId[];
  discoveredConsumables: BrainrunConsumableId[];
}>();

const allRelics = Object.values(BRAINRUN_RELICS);
const allConsumables = Object.values(BRAINRUN_CONSUMABLES);

function isRelicDiscovered(id: BrainrunRelicId) {
  return props.discoveredRelics.includes(id);
}
function isConsumableDiscovered(id: BrainrunConsumableId) {
  return props.discoveredConsumables.includes(id);
}

const openedRelicId = ref<BrainrunRelicId | null>(null);
function toggleRelic(id: BrainrunRelicId) {
  if (!isRelicDiscovered(id)) return;
  openedRelicId.value = openedRelicId.value === id ? null : id;
}

const openedConsumableId = ref<BrainrunConsumableId | null>(null);
function toggleConsumable(id: BrainrunConsumableId) {
  if (!isConsumableDiscovered(id)) return;
  openedConsumableId.value = openedConsumableId.value === id ? null : id;
}
</script>
