<template>
  <div class="w-full max-w-xl mx-auto py-4 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <!-- Standard Random Question Runner -->
      <QuestionComponent />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import QuestionComponent from "@/components/Question.vue";
const user = useSupabaseUser();

useSeoMeta({
  title: "Quiz Aléatoire - Culture Générale",
  ogTitle: "Quiz Aléatoire - Culture Générale - LazyCulture",
  description:
    "Testez vos connaissances au hasard ! Lancez un quiz de culture générale aléatoire, répondez aux questions et progressez.",
  ogDescription:
    "Testez vos connaissances au hasard ! Lancez un quiz de culture générale aléatoire, répondez aux questions et progressez.",
  ogImage:
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg",
});
</script>

<style scoped>
/* Page styling */
</style>
