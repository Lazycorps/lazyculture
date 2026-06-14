<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title & Action -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="text-center md:text-left space-y-2">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          Gestion des Aventures
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Générez de nouveaux parcours d'apprentissage ou composez-les manuellement sous forme de
          map linéaire.
        </p>
      </div>
      <UButton
        to="/admin/adventures/create"
        color="primary"
        icon="i-heroicons-plus"
        class="font-black font-display text-xs px-5 py-2.5 shadow-lg shadow-violet-600/20 self-center"
      >
        Créer manuellement
      </UButton>
    </div>

    <!-- Action Panel Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Generation Form Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl lg:col-span-1"
      >
        <div class="space-y-4">
          <h3 class="text-lg font-black font-display text-white flex items-center">
            ✨ Nouvelle Aventure
          </h3>
          <p class="text-xs text-gray-400 font-medium">
            Sélectionnez un thème pour partitionner automatiquement ses questions en étapes
            équilibrées.
          </p>

          <form @submit.prevent="generatePath" class="space-y-4 pt-2">
            <UFormField label="Titre de l'Aventure" class="space-y-1.5">
              <UInput
                v-model="form.title"
                placeholder="Ex: L'histoire de France, Niveau 1"
                color="primary"
                variant="outline"
                class="w-full text-white"
                required
              />
            </UFormField>

            <UFormField label="Thème de questions" class="space-y-1.5">
              <USelectMenu
                v-model="selectedThemeName"
                :items="themes?.map((t) => t.name) ?? []"
                placeholder="Sélectionner un thème"
                color="primary"
                class="w-full text-white"
              />
            </UFormField>

            <div
              v-if="selectedThemeName"
              class="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1"
            >
              <div class="flex justify-between text-xs text-gray-400 font-semibold font-display">
                <span>Questions dispo :</span>
                <span :class="questionsCount >= 20 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ questionsCount }}
                </span>
              </div>
              <div class="text-[10px] text-gray-400">
                * Nécessite au moins 20 questions non supprimées pour pouvoir former un contrôle.
              </div>
            </div>

            <UButton
              type="submit"
              color="primary"
              block
              :loading="generating"
              :disabled="!form.title || !selectedThemeName || questionsCount < 20"
              class="font-bold font-display text-xs justify-center py-2.5 shadow-lg shadow-violet-600/20"
            >
              Générer l'Adventure
            </UButton>
          </form>
        </div>
      </UCard>

      <!-- Paths List Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl lg:col-span-2"
      >
        <div class="space-y-4 h-full flex flex-col">
          <h3 class="text-lg font-black font-display text-white flex items-center justify-between">
            <span>📋 Aventures Actives</span>
            <span
              class="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full font-bold"
            >
              {{ paths?.length ?? 0 }} parcours
            </span>
          </h3>

          <!-- Paths Table / List -->
          <div class="flex-1 overflow-x-auto min-h-[300px]">
            <div v-if="loadingPaths" class="flex items-center justify-center h-48">
              <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-violet-400" />
            </div>
            <div
              v-else-if="!paths || paths.length === 0"
              class="flex flex-col items-center justify-center h-48 space-y-2"
            >
              <span class="text-4xl">🗺️</span>
              <p class="text-sm text-gray-500 font-medium font-display">Aucune aventure active</p>
            </div>
            <table v-else class="w-full text-left border-collapse text-sm">
              <thead>
                <tr
                  class="border-b border-white/10 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
                >
                  <th class="pb-3">Titre</th>
                  <th class="pb-3">Thème</th>
                  <th class="pb-3 text-center">Étapes</th>
                  <th class="pb-3 text-center">Création</th>
                  <th class="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-semibold text-gray-300 font-display">
                <tr
                  v-for="path in paths"
                  :key="path.id"
                  class="hover:bg-white/5 transition-colors group"
                >
                  <td class="py-3.5 pr-2 truncate max-w-[200px] text-white">
                    {{ path.title }}
                  </td>
                  <td class="py-3.5 text-xs text-gray-400">
                    {{ getThemeName(path.themeSlug) }}
                  </td>
                  <td class="py-3.5 text-center text-xs text-violet-400">
                    {{ path.stages?.length ?? 0 }} stages
                  </td>
                  <td class="py-3.5 text-center text-xs text-gray-500">
                    {{ formatDate(path.createDate) }}
                  </td>
                  <td class="py-3.5 text-right">
                    <div class="flex items-center justify-end space-x-2">
                      <UButton
                        :to="`/admin/adventures/${path.id}`"
                        color="primary"
                        variant="subtle"
                        size="xs"
                        icon="i-heroicons-pencil-square"
                        class="opacity-60 hover:opacity-100 transition-opacity rounded-lg"
                      />
                      <UButton
                        color="error"
                        variant="subtle"
                        size="xs"
                        icon="i-heroicons-trash"
                        :loading="deletingId === path.id"
                        @click="deletePath(path.id)"
                        class="opacity-60 hover:opacity-100 transition-opacity rounded-lg"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import type { Theme } from "#shared/theme";

definePageMeta({
  middleware: "admin",
});

const form = reactive({
  title: "",
  themeSlug: "",
});

const selectedThemeName = ref<string | undefined>(undefined);
const questionsCount = ref(0);
const generating = ref(false);
const loadingPaths = ref(false);
const deletingId = ref<number | null>(null);

// Fetch datasets
const { data: themes } = await useFetch<Theme[]>("/api/theme/all");
const { data: paths, refresh: refreshPaths } = await useFetch<any[]>("/api/admin/adventures");

// Watch theme selection to fetch question count and populate form
watch(selectedThemeName, async (newThemeName) => {
  if (newThemeName) {
    const themeObj = themes.value?.find((t) => t.name === newThemeName);
    if (themeObj) {
      form.themeSlug = themeObj.slug;
      // Autopopulate path title if empty
      if (!form.title || form.title.startsWith("Aventure ")) {
        form.title = `Aventure ${themeObj.name}`;
      }
      // Fetch theme progress (to get questionsCount)
      try {
        const progress = await $fetch<any>(`/api/theme/progress?theme=${themeObj.slug}`);
        questionsCount.value = progress?.questionCount ?? 0;
      } catch (e) {
        questionsCount.value = 0;
      }
    }
  } else {
    form.themeSlug = "";
    questionsCount.value = 0;
  }
});

function getThemeName(slug: string) {
  const theme = themes.value?.find((t) => t.slug === slug);
  return theme?.name || slug;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function generatePath() {
  if (!form.title || !form.themeSlug || questionsCount.value < 20) return;

  try {
    generating.value = true;
    await $fetch("/api/admin/adventures/generate", {
      method: "post",
      body: { ...form },
    });

    // Clear form
    form.title = "";
    selectedThemeName.value = undefined;

    // Refresh list
    await refreshPaths();
  } catch (error: any) {
    alert(error.data?.statusMessage || "Erreur lors de la génération du parcours.");
  } finally {
    generating.value = false;
  }
}

async function deletePath(id: number) {
  if (
    !confirm(
      "Voulez-vous vraiment supprimer cette aventure ? Tous les progrès associés seront perdus.",
    )
  )
    return;

  try {
    deletingId.value = id;
    await $fetch(`/api/admin/adventures/delete?id=${id}`, {
      method: "delete",
    });
    await refreshPaths();
  } catch (error) {
    alert("Erreur lors de la suppression de l'aventure.");
  } finally {
    deletingId.value = null;
  }
}
</script>
