<template>
  <div>
    <NuxtLayout :name="layout">
      <v-app>
        <NuxtPage />
      </v-app>
    </NuxtLayout>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const layout = computed(() => route.path.startsWith('/admin') ? 'admin' : 'default');
</script>
