<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      content:
        'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
    }"
  >
    <template #body>
      <div class="flex flex-col items-center space-y-4 text-center py-2">
        <div
          class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl"
        >
          ⚠️
        </div>
        <div>
          <h3 class="text-lg font-black font-display text-white tracking-wide">
            Supprimer la question ?
          </h3>
          <p class="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            Êtes-vous sûr de vouloir supprimer cette question définitivement ? Cette action est
            irréversible.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end space-x-3 w-full">
        <UButton
          variant="ghost"
          color="primary"
          class="font-bold font-display uppercase tracking-wider text-xs"
          @click="isOpen = false"
        >
          Annuler
        </UButton>
        <UButton
          color="error"
          class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon shadow-red-500/20"
          :loading="deleting"
          @click="deleteItemConfirm"
        >
          Supprimer
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { QuestionDTO } from "#shared/question";

const props = defineProps<{
  modelValue: boolean;
  question: QuestionDTO | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "deleted", questionId: number): void;
}>();

const isOpen = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emit("update:modelValue", val);
  },
});

const deleting = ref(false);

async function deleteItemConfirm() {
  if (!props.question) return;
  try {
    deleting.value = true;
    await $fetch("/api/question/delete?id=" + props.question.id, {
      method: "delete",
    });
    emit("deleted", props.question.id);
    isOpen.value = false;
  } catch (err) {
    console.error("Failed to delete question:", err);
  } finally {
    deleting.value = false;
  }
}
</script>
