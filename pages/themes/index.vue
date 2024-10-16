<template>
  <div
    class="my-auto mx-auto d-flex flex-wrap justify-center"
    style="max-width: 1500px"
  >
    <Theme :style="{ width: xs ? '45%' : '20%' }" :theme="randomTheme"></Theme>
    <template v-for="theme in themes">
      <Theme :style="{ width: xs ? '45%' : '20%' }" :theme="theme"></Theme>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import type { Theme } from "~/models/theme";

const { data: themes } = await useFetch<Theme[]>("/api/theme/all");
const randomTheme = {
  name: "Random",
  picture:
    "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg",
  slug: "random",
} as Theme;
const { mobile, xs } = useDisplay();
</script>

<style scoped>
.theme-tile {
  width: 200px;
  margin: 10px;
}
</style>
