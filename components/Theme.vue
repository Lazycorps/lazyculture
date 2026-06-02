<template>
  <UCard
    class="group hover:scale-[1.03] hover:shadow-neon hover:border-violet-500/30 transition-all duration-200 cursor-pointer overflow-hidden relative flex flex-col h-full bg-[#111827]/60 border border-white/10"
    :ui="{ body: { padding: 'p-0' } }"
    @click="router.push('/themes/' + theme.slug)"
  >
    <!-- Card Top Image with Gradient Overlay -->
    <div class="relative h-44 w-full overflow-hidden bg-slate-950">
      <img
        :src="theme.picture"
        :alt="theme.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"
      ></div>

      <!-- Quick progress status float badge -->
      <div
        v-if="!loading && questionCount > 0"
        class="absolute top-3 right-3 text-[10px] font-extrabold font-display bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10"
        :class="responseCount === questionCount ? 'text-emerald-400' : 'text-violet-300'"
      >
        {{ progressPercent.toFixed(0) }}%
      </div>
    </div>

    <!-- Card Content Details -->
    <div class="p-4 flex-1 flex flex-col justify-between">
      <div>
        <h3
          class="font-extrabold text-base text-white group-hover:text-violet-400 transition-colors font-display mb-3 truncate"
        >
          {{ theme.name }}
        </h3>
      </div>

      <!-- Linear Progress Bar & Mastery Stat -->
      <div class="space-y-2 mt-auto">
        <div v-if="loading" class="animate-pulse space-y-1">
          <div class="h-1.5 bg-white/10 rounded-full w-full"></div>
          <div class="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
        <div v-else class="space-y-1.5">
          <!-- Custom Premium Glass Progress Bar -->
          <div
            class="w-full h-1.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
          >
            <div
              class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <div
            class="flex items-center justify-between text-[11px] font-bold font-display text-gray-400"
          >
            <span>{{ responseCount }} / {{ questionCount }} réponses</span>
            <span
              v-if="mastery > 0"
              class="flex items-center text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
            >
              <UIcon
                name="i-heroicons-academic-cap"
                class="mr-0.5 text-xs text-amber-500 animate-pulse"
              />
              {{ mastery.toFixed(1) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Theme } from "~/models/theme";
const router = useRouter();
const props = defineProps<{ theme: Theme }>();

const responseCount = ref(0);
const questionCount = ref(0);
const mastery = ref(0);
const loading = ref(false);

const progressPercent = computed(() => {
  if (questionCount.value === 0) return 0;
  return (responseCount.value / questionCount.value) * 100;
});

onMounted(async () => {
  await loadProgress();
});

async function loadProgress() {
  try {
    loading.value = true;
    const result = await $fetch<any>("/api/theme/progress", {
      query: { theme: props.theme.slug },
    });
    responseCount.value = result.responseCount;
    questionCount.value = result.questionCount;
    mastery.value = result.mastery;
  } catch (e) {
    console.error("Failed to load theme progress:", e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Theme-specific styles if any */
</style>
