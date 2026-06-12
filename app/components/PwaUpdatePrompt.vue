<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="$pwa?.needRefresh"
      class="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-white/10 bg-[#0c1020] p-4 shadow-2xl"
    >
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-arrow-path" class="size-6 shrink-0 text-primary" />
        <p class="flex-1 text-sm text-gray-300">Une nouvelle version est disponible.</p>
        <UButton size="sm" color="primary" :loading="updating" @click="update">
          Mettre à jour
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark-20-solid"
          @click="$pwa?.cancelPrompt()"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp();
const updating = ref(false);

async function update() {
  updating.value = true;
  await $pwa?.updateServiceWorker(true);
}
</script>
