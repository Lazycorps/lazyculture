<template>
  <div class="mx-auto my-auto pa-5 d-flex flex-wrap justify-center">
    <template v-for="theme in themes">
      <Theme :theme="theme"></Theme>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Theme } from "~/models/theme";

const { data: themes } = await useFetch<Theme[]>("/api/theme/all");
</script>

<style scoped>
.theme-tile {
  width: 200px;
  margin: 10px;
}
</style>
