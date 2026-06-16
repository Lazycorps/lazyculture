<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <!-- Main Question Quiz Runner -->
      <QuestionComponent
        :theme="route.params.id === 'random' ? undefined : (route.params.id as string)"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import QuestionComponent from "@/components/Question.vue";
import { ref } from "vue";

const route = useRoute();
const themeSlug = route.params.id as string;

const { data: theme } =
  themeSlug !== "random"
    ? await useFetch<any>("/api/theme/name", { query: { theme: themeSlug } })
    : { data: ref(null) };

useSeoMeta({
  title: () =>
    theme.value ? `${theme.value.name} - Quiz` : themeSlug === "random" ? "Quiz Aléatoire" : "Quiz",
  ogTitle: () =>
    theme.value
      ? `${theme.value.name} - Quiz & Culture Générale - LazyCulture`
      : themeSlug === "random"
        ? "Quiz Aléatoire - Culture Générale - LazyCulture"
        : "Quiz - LazyCulture",
  description: () =>
    theme.value
      ? `Testez vos connaissances sur le thème ${theme.value.name}. Répondez aux questions et gagnez de l'expérience sur LazyCulture.`
      : "Testez votre culture générale avec nos quiz sur LazyCulture.",
  ogDescription: () =>
    theme.value
      ? `Testez vos connaissances sur le thème ${theme.value.name}. Répondez aux questions et gagnez de l'expérience sur LazyCulture.`
      : "Testez votre culture générale avec nos quiz sur LazyCulture.",
  ogImage: () =>
    theme.value?.picture ||
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg",
});
</script>

<style scoped>
/* Custom overrides if needed */
</style>
