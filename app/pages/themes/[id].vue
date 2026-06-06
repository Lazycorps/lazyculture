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
const route = useRoute();
</script>

<style scoped>
/* Custom overrides if needed */
</style>
