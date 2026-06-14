<template>
  <div class="w-full px-4 py-2 select-none">
    <div v-if="loading" class="flex flex-col items-center justify-center h-96 space-y-4">
      <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-violet-400" />
      <p class="text-sm text-gray-500 font-medium font-display">Chargement de l'aventure...</p>
    </div>
    <AdminAdventureEditor
      v-else
      :adventure-id="adventureId"
      :themes="themes ?? []"
      @saved="onSaved"
      @cancelled="onCancelled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import type { Theme } from "#shared/theme";

definePageMeta({
  middleware: "admin",
});

const route = useRoute();
const adventureId = Number(route.params.id);
const loading = ref(true);

const { data: themes } = await useFetch<Theme[]>("/api/theme/all");
loading.value = false;

function onSaved() {
  navigateTo("/admin/adventures");
}

function onCancelled() {
  navigateTo("/admin/adventures");
}
</script>
