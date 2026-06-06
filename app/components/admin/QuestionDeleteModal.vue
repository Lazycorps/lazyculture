<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div
        class="p-6 bg-[#111827] border border-white/10 rounded-2xl shadow-glass text-center space-y-6"
      >
        <div
          class="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl"
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
        <div class="flex items-center justify-center space-x-3 pt-2">
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
