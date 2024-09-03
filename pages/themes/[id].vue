<template>
  <v-card flat rounded class="mx-auto my-auto pa-5">
    <Question :theme="route.params.id"></Question>
  </v-card>
</template>
<script setup>
const route = useRoute();
</script>
