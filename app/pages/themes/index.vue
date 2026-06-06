<template>
  <div class="space-y-8 py-2">
    <!-- Header Section -->
    <div class="space-y-2 text-center md:text-left select-none">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Choisissez un thème
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Sélectionnez une catégorie pour vous entraîner, gagner de l'expérience et perfectionner vos
        connaissances.
      </p>
    </div>

    <!-- Themes Responsive Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-7xl">
      <!-- Random Theme Special Card -->
      <div class="h-full">
        <ThemeComponent :theme="randomTheme" />
      </div>

      <!-- Database Loaded Themes -->
      <div v-for="theme in themes" :key="theme.slug" class="h-full">
        <ThemeComponent :theme="theme" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ThemeComponent from "~/components/Theme.vue";
import type { Theme } from "#shared/theme";

const { data: themes } = await useFetch<Theme[]>("/api/theme/all");

const randomTheme = {
  name: "Aléatoire",
  picture:
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg",
  slug: "random",
} as Theme;
</script>

<style scoped>
/* Page-specific styling */
</style>
