<template>
  <v-card
    class="theme-tile"
    rounded=""
    outlined
    @click="router.push('/themes/' + theme.slug)"
  >
    <v-img :src="theme.picture" height="200px"></v-img>
    <v-card-title>{{ theme.name }}</v-card-title>
    <v-card-actions>
      <v-progress-linear
        :model-value="responseCount"
        :max="questionCount"
        min="0"
        color="primary"
        height="10"
        rounded=""
      ></v-progress-linear>
      <div class="text-caption">{{ responseCount }}/{{ questionCount }}</div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Theme } from "~/models/theme";
const router = useRouter();
const props = defineProps<{ theme: Theme }>();
const responseCount = ref(0);
const questionCount = ref(0);

onMounted(async () => {
  await loadProgress();
});
async function loadProgress() {
  const result = await $fetch("/api/theme/progress", {
    query: { theme: props.theme.slug },
  });
  responseCount.value = result.responseCount;
  questionCount.value = result.questionCount;
}
</script>

<style scoped>
.theme-tile {
  width: 200px;
  margin: 10px;
}
</style>
