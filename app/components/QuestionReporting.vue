<template>
  <div>
    <!-- Flag Trigger Button -->
    <UButton
      icon="i-heroicons-flag"
      color="warning"
      variant="ghost"
      :disabled="reported"
      class="text-amber-500/70 hover:text-amber-400 disabled:text-gray-600 disabled:bg-transparent"
      @click="dialog = true"
    />

    <!-- Modern Nuxt UI Modal -->
    <UModal v-model:open="dialog" :ui="{ content: 'max-w-md' }">
      <template #content>
        <UCard :ui="{ body: 'p-6' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-black font-display text-white tracking-wide">
                Signaler un problème
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                class="-my-1"
                @click="dialog = false"
              />
            </div>
          </template>

          <form @submit.prevent="reportQuestion" class="space-y-6">
            <p class="text-xs text-gray-400">
              Aidez-nous à améliorer les questions de Lazyculture en nous signalant les anomalies.
            </p>

            <!-- Checkboxes for default reasons -->
            <div class="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <UCheckbox
                v-for="(reason, index) in defaultReasons"
                v-model="selectedReasons"
                :key="index"
                :name="`reason-${index}`"
                :label="reason"
                :value="reason"
                :ui="{ label: 'text-sm font-semibold text-gray-300' }"
              />
            </div>

            <!-- Textarea for comments -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display"
                >Commentaire additionnel</label
              >
              <UTextarea
                v-model="comment"
                placeholder="Explicitez le problème rencontré..."
                :rows="3"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <UButton
                type="submit"
                color="primary"
                block
                size="md"
                :loading="loadingReporting"
                icon="i-heroicons-paper-airplane"
              >
                Envoyer le signalement
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ReportingDTO } from "#shared/DTO/reportingDTO";

const props = defineProps<{
  questionId: number;
}>();

const reported = ref(false);
const dialog = ref(false);
const comment = ref("");
const loadingReporting = ref(false);
const defaultReasons = ["Question imprécise", "Réponse incorrecte", "Image manquante"];
const selectedReasons = ref<string[]>([]); // Liste des raisons sélectionnées

async function reportQuestion() {
  try {
    loadingReporting.value = true;

    const reasonsText = selectedReasons.value.length > 0 ? selectedReasons.value.join(", ") : "";
    const reportingDto = new ReportingDTO();

    reportingDto.questionId = props.questionId;
    reportingDto.comment =
      comment.value || reasonsText
        ? `${comment.value} ${reasonsText}`.trim()
        : "Question à vérifier";

    await $fetch("/api/question/report", {
      method: "post",
      body: { ...reportingDto },
    });

    reported.value = true;
    comment.value = "";
    selectedReasons.value = [];
  } catch (e) {
    console.error("Failed to report question:", e);
  } finally {
    loadingReporting.value = false;
    dialog.value = false;
  }
}

defineExpose({
  reported,
});
</script>

<style scoped>
/* Scoped overrides if needed */
</style>
