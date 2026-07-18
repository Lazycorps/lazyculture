<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-sm' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6 max-h-[70vh] overflow-y-auto' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg shrink-0"
              >
                <UIcon name="i-heroicons-chart-bar" />
              </div>
              <h3 class="text-sm font-black font-display text-white tracking-wide">
                Mes coefficients
              </h3>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <p class="text-[11px] text-gray-400 leading-relaxed mb-4">
          Plus le coefficient d'un thème est élevé, plus ses questions ont de chances de tomber dans
          vos prochains combats. Montez-les en choisissant des cartes de thème après vos victoires.
        </p>

        <div v-if="investedThemes.length" class="space-y-2">
          <div
            v-for="theme in investedThemes"
            :key="theme.slug"
            class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p
                class="text-xs font-black font-display text-white tracking-wide capitalize truncate"
              >
                {{ themeLabel(theme.slug) }}
              </p>
              <div
                class="mt-1.5 h-1 w-full bg-slate-950/80 rounded-full border border-white/5 overflow-hidden"
              >
                <div
                  class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                  :style="{ width: `${(theme.coef / maxCoef) * 100}%` }"
                ></div>
              </div>
            </div>
            <span
              class="shrink-0 text-sm font-black font-display text-violet-300 tabular-nums bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-0.5"
            >
              {{ theme.coef }}
            </span>
          </div>
        </div>

        <div v-else class="text-center py-6 px-2 space-y-2">
          <UIcon name="i-heroicons-square-3-stack-3d" class="text-3xl text-gray-600" />
          <p class="text-xs text-gray-400 leading-relaxed max-w-[15rem] mx-auto">
            Aucun thème investi pour l'instant. Gagnez des combats et choisissez des cartes de thème
            pour orienter vos questions.
          </p>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
  /** Coefficient de tirage par thème de la run (thème absent = 0). Seuls les thèmes investis
   * (coef > 0) sont listés, triés coef décroissant puis alphabétique. */
  themeCoefficients: Record<string, number>;
}>();

const investedThemes = computed(() =>
  Object.entries(props.themeCoefficients)
    .filter(([, coef]) => coef > 0)
    .map(([slug, coef]) => ({ slug, coef }))
    .sort((a, b) => b.coef - a.coef || a.slug.localeCompare(b.slug)),
);

// Sert d'échelle aux barres de progression relatives (le plus gros coef = barre pleine).
const maxCoef = computed(() => investedThemes.value.reduce((max, t) => Math.max(max, t.coef), 1));

function themeLabel(slug: string): string {
  return slug.replace(/[-_]/g, " ");
}
</script>
