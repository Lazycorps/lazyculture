<template>
  <v-card
    rounded
    outlined
    @click="router.push('/themes/' + theme.slug)"
    class="ma-1"
  >
    <v-img :src="theme.picture" height="200px"></v-img>
    <v-card-title>{{ theme.name }}</v-card-title>
    <v-card-actions>
      <v-progress-linear
        :indeterminate="loading"
        :model-value="responseCount"
        :max="questionCount"
        min="0"
        color="primary"
        height="10"
        rounded=""
      ></v-progress-linear>
      <div class="text-caption">{{ responseCount }}/{{ questionCount }}</div>
      <div v-if="mastery > 0" class="text-caption d-flex">
        <v-icon class="mr-1">mdi-arm-flex</v-icon> {{ mastery.toFixed(1) }}
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Theme } from "~/models/theme";
const router = useRouter();
const props = defineProps<{ theme: Theme }>();
const responseCount = ref(0);
const questionCount = ref(0);
const mastery = ref(0);
const loading = ref(false);

onMounted(async () => {
  await loadProgress();
});

async function loadProgress() {
  try {
    loading.value = true;
    const result = await $fetch("/api/theme/progress", {
      query: { theme: props.theme.slug },
    });
    responseCount.value = result.responseCount;
    questionCount.value = result.questionCount;
    mastery.value = result.mastery;
  } finally {
    loading.value = false;
  }
}
</script>
