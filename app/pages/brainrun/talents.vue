<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      :ui="{ body: 'p-4' }"
    >
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <p class="text-sm text-gray-400">Connectez-vous pour accéder à vos talents.</p>
          <UButton to="/login" color="primary" size="lg" block icon="i-heroicons-key">
            Se connecter
          </UButton>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center justify-between mb-4">
          <UButton
            to="/brainrun"
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-left"
            class="font-bold font-display"
          >
            Retour
          </UButton>
          <div
            class="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1"
          >
            <UIcon name="i-heroicons-sparkles" class="text-violet-400" />
            <span class="font-black font-display text-white text-sm">
              {{ meta.metaProgress.value?.knowledgePoints ?? 0 }}
            </span>
          </div>
        </div>

        <h2 class="text-xl font-black font-display text-white tracking-wide mb-1">
          Arbre de talents
        </h2>
        <p class="text-xs text-gray-400 mb-4">
          Améliorations permanentes, actives sur toutes vos prochaines runs.
        </p>

        <div class="space-y-3">
          <div
            v-for="talent in talents"
            :key="talent.id"
            class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
          >
            <div
              class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl"
              :class="
                isUnlocked(talent.id)
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-violet-500/10 border border-violet-500/30 text-violet-400'
              "
            >
              <UIcon :name="talent.icon" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-black font-display text-sm text-white tracking-wide truncate">
                {{ talent.name }}
              </p>
              <p class="text-[11px] text-gray-400 leading-snug">{{ talent.description }}</p>
            </div>
            <UButton
              v-if="!isUnlocked(talent.id)"
              size="sm"
              :color="isAffordable(talent) ? 'primary' : 'neutral'"
              :disabled="meta.loading.value || !isAffordable(talent)"
              class="font-black font-display shrink-0 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
              @click="unlock(talent.id)"
            >
              {{ talent.cost }} PS
            </UButton>
            <UIcon
              v-else
              name="i-heroicons-check-circle-solid"
              class="text-emerald-400 text-2xl shrink-0"
            />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";
import { useUserStore } from "~/stores/userStore";

const userStore = useUserStore();
await userStore.fetchUser();
const user = computed(() => userStore.user);

const meta = useBrainrunMeta();
if (user.value) {
  await meta.fetchMeta();
}

const talents = Object.values(BRAINRUN_TALENTS);

function isUnlocked(id: BrainrunTalentId): boolean {
  return meta.metaProgress.value?.unlockedTalents.includes(id) ?? false;
}

function isAffordable(talent: { cost: number }): boolean {
  return (meta.metaProgress.value?.knowledgePoints ?? 0) >= talent.cost;
}

async function unlock(id: BrainrunTalentId) {
  await meta.unlockTalent(id);
}
</script>
