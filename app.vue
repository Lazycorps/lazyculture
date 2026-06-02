<template>
  <UApp>
    <div id="app-container" class="cyber-bg-glow min-h-screen">
      <NuxtLayout :name="layout">
        <NuxtPage />
      </NuxtLayout>
    </div>
  </UApp>
</template>
<script setup lang="ts">
const route = useRoute();
const layout = computed(() => (route.path.startsWith("/admin") ? "admin" : "default"));
</script>
