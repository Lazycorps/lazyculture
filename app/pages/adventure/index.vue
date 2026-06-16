<template>
  <div class="space-y-8 py-2">
    <!-- Header Section -->
    <div class="space-y-2 text-center md:text-left select-none">
      <h1
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Mode Adventure
      </h1>
      <p class="text-sm text-gray-400 font-medium">
        Embarquez dans des parcours d'apprentissage thématiques et validez chaque étape pour
        progresser.
      </p>
    </div>

    <!-- Login Prompt if guest -->
    <div
      v-if="!user"
      class="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto shadow-glass"
    >
      <div class="text-4xl">🔒</div>
      <h3 class="text-lg font-black font-display text-white">Connexion requise</h3>
      <p class="text-sm text-gray-400 font-medium max-w-sm mx-auto">
        Connectez-vous pour accéder au mode Adventure et enregistrer votre progression sur la carte.
      </p>
      <UButton
        to="/login"
        color="primary"
        variant="solid"
        size="md"
        class="px-6 font-bold font-display"
      >
        Se connecter
      </UButton>
    </div>

    <!-- Paths list if logged in -->
    <div v-else class="space-y-6">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-violet-400" />
      </div>

      <div v-else-if="!paths || paths.length === 0" class="text-center py-12 space-y-3">
        <span class="text-5xl">🗺️</span>
        <h3 class="text-lg font-black font-display text-white">Aucune aventure disponible</h3>
        <p class="text-sm text-gray-400 max-w-xs mx-auto font-medium">
          Les administrateurs n'ont pas encore généré d'aventure. Revenez plus tard !
        </p>
      </div>

      <!-- Grid of Paths -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard
          v-for="path in paths"
          :key="path.id"
          class="group hover:scale-[1.02] hover:shadow-neon hover:border-violet-500/30 transition-all duration-200 overflow-hidden relative flex flex-col h-full bg-[#111827]/60 border border-white/10"
          :ui="{ body: 'p-0 sm:p-0 flex flex-col h-full' }"
        >
          <!-- Top Card Image -->
          <div class="relative h-48 w-full overflow-hidden bg-slate-950">
            <img
              :src="getThemePicture(path.themeSlug)"
              :alt="path.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <!-- Progress Percentage Badge -->
            <div
              class="absolute top-3 right-3 text-[10px] font-extrabold font-display bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
              :class="path.completed ? 'text-emerald-400 border-emerald-500/20' : 'text-violet-300'"
            >
              {{ calculatePercent(path) }}%
            </div>

            <!-- Completed Badge overlay -->
            <div
              v-if="path.completed"
              class="absolute top-3 left-3 text-[9px] font-black font-display bg-emerald-500 text-white px-2.5 py-1 rounded-full border border-emerald-400/30 shadow-md tracking-wider uppercase"
            >
              ✓ Complété
            </div>
          </div>

          <!-- Card Info -->
          <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div class="space-y-1">
              <h3
                class="font-extrabold text-base text-white group-hover:text-violet-400 transition-colors font-display line-clamp-1"
              >
                {{ path.title }}
              </h3>
              <p class="text-xs text-gray-400 font-semibold font-display">
                Thème : {{ getThemeName(path.themeSlug) }}
              </p>
            </div>

            <!-- Progress section -->
            <div class="space-y-2">
              <div
                class="w-full h-2 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
                  :style="{ width: `${calculatePercent(path)}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[11px] font-bold font-display text-gray-400">
                <span
                  >Étape {{ path.completed ? path.totalStages : path.currentStage }} /
                  {{ path.totalStages }}</span
                >
                <span>{{ calculatePercent(path) }}%</span>
              </div>
            </div>

            <!-- Action Button -->
            <UButton
              :to="`/adventure/${path.id}/map`"
              color="primary"
              block
              class="font-black font-display uppercase tracking-wider py-2.5 justify-center rounded-xl"
            >
              {{ path.completed ? "Rejouer" : path.currentStage > 1 ? "Continuer" : "Commencer" }}
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

useSeoMeta({
  title: "Parcours d'Aventures Thématiques",
  ogTitle: "Parcours d'Aventures Thématiques - LazyCulture",
  description:
    "Embarquez dans des parcours d'apprentissage thématiques sous forme de cartes interactives. Validez chaque étape pour progresser dans votre aventure de culture générale.",
  ogDescription:
    "Embarquez dans des parcours d'apprentissage thématiques sous forme de cartes interactives. Validez chaque étape pour progresser dans votre aventure de culture générale.",
});

const user = useSupabaseUser();
const paths = ref<any[]>([]);
const themes = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  if (user.value) {
    try {
      const [pathsData, themesData] = await Promise.all([
        $fetch<any[]>("/api/adventures"),
        $fetch<any[]>("/api/theme/all"),
      ]);
      paths.value = pathsData;
      themes.value = themesData;
    } catch (e) {
      console.error("Error loading adventure data:", e);
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
  }
});

function getThemeName(slug: string) {
  const theme = themes.value?.find((t) => t.slug === slug);
  return theme?.name || slug;
}

function getThemePicture(slug: string) {
  const theme = themes.value?.find((t) => t.slug === slug);
  return (
    theme?.picture ||
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg"
  );
}

function calculatePercent(path: any) {
  if (path.completed) return 100;
  if (!path.totalStages) return 0;
  return Math.min(Math.round(((path.currentStage - 1) / path.totalStages) * 100), 99);
}
</script>
