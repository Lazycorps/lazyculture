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
          Améliorations permanentes, actives sur toutes vos prochaines runs. Un nœud reste
          verrouillé tant que son prérequis n'est pas débloqué.
        </p>

        <div class="space-y-6">
          <BrainrunTalentTree
            v-for="branch in branches"
            :key="branch"
            :branch="branch"
            :unlocked-talents="unlockedTalents"
            :knowledge-points="knowledgePoints"
            :loading="meta.loading.value"
            @unlock="unlock"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BrainrunTalentBranch, BrainrunTalentId } from "#shared/brainrunTalents";
import { useUserStore } from "~/stores/userStore";

const userStore = useUserStore();
await userStore.fetchUser();
const user = computed(() => userStore.user);

const meta = useBrainrunMeta();
if (user.value) {
  await meta.fetchMeta();
}

const branches: BrainrunTalentBranch[] = ["RESISTANCE", "DAMAGE", "UTILITY"];
const unlockedTalents = computed(() => meta.metaProgress.value?.unlockedTalents ?? []);
const knowledgePoints = computed(() => meta.metaProgress.value?.knowledgePoints ?? 0);

async function unlock(id: BrainrunTalentId) {
  await meta.unlockTalent(id);
}
</script>
