<template>
  <div class="mx-auto my-auto pa-5 d-flex">
    <v-card
      v-for="theme in themes"
      class="theme-tile"
      rounded=""
      outlined
      @click="router.push('/themes/' + theme.slug)"
    >
      <v-img :src="theme.picture" height="200px"></v-img>
      <v-card-title>{{ theme.name }}</v-card-title>
      <v-card-actions>
        <v-progress-linear
          :value="progress"
          color="primary"
          height="10"
        ></v-progress-linear>
        <div class="text-caption">{{ progress }}/20</div>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const { data: themes } = await useFetch("/api/theme/all");
const router = useRouter();
const progress = ref(5);

// async function getProgress(theme: string) {
//   const progress = await $fetch("/api/theme/progress", { query: { theme } });
//   return progress.responseCount;
// }
</script>

<style scoped>
.theme-tile {
  width: 200px;
  margin: 10px;
}
</style>
