<template>
  <div class="flex flex-col space-y-2.5 md:space-y-3.5 w-full">
    <!-- Header Row (Theme badges + Flag) -->
    <div class="flex items-center justify-between select-none">
      <div class="flex flex-wrap gap-1">
        <span
          v-for="t in themes"
          :key="t"
          class="text-[9px] font-extrabold uppercase tracking-wider font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
        >
          {{ t }}
        </span>
      </div>
      <QuestionReporting
        v-if="showReporting && questionId"
        ref="questionReportingRef"
        :questionId="questionId"
      />
    </div>

    <!-- Question Title -->
    <h3
      class="text-base md:text-lg font-black font-display text-white tracking-wide leading-relaxed"
    >
      {{ libelle }}
    </h3>

    <!-- Image + Options Layout (Vertical vs Horizontal layout) -->
    <div
      :class="
        isVerticalImage
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-center'
          : 'flex flex-col space-y-2.5 md:space-y-3.5'
      "
    >
      <!-- Question Image (if exists) -->
      <div
        v-if="img"
        class="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-inner"
        :class="isVerticalImage ? 'h-44 md:h-56' : 'h-36 md:h-48'"
      >
        <img :src="img" alt="Question image" class="w-full h-full object-contain" />
      </div>

      <!-- Options / Propositions list -->
      <div class="flex flex-col gap-1.5 py-0.5 w-full">
        <button
          v-for="proposition in propositions"
          :key="proposition.id"
          :disabled="disabled"
          class="w-full text-left px-4 py-2 md:py-2.5 rounded-xl font-bold text-md tracking-wide font-display border transition-all duration-150 relative select-none"
          :class="getOptionClass(proposition.id)"
          @click="selectOption(proposition.id)"
        >
          <div class="flex items-center justify-between">
            <span>{{ proposition.value }}</span>

            <!-- Check/Cross icon indicator in option -->
            <span
              v-if="
                showCorrectIncorrectColors &&
                (correctOptionId === proposition.id || incorrectOptionId === proposition.id)
              "
            >
              <UIcon
                v-if="correctOptionId === proposition.id"
                name="i-heroicons-check-circle-20-solid"
                class="text-xl text-emerald-400 animate-bounce"
              />
              <UIcon
                v-else-if="incorrectOptionId === proposition.id"
                name="i-heroicons-x-circle-20-solid"
                class="text-xl text-rose-500 animate-shake"
              />
            </span>
            <span v-else-if="!showCorrectIncorrectColors && selectedOptionId === proposition.id">
              <UIcon name="i-heroicons-check-circle-20-solid" class="text-xl text-violet-400" />
            </span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import QuestionReporting from "./QuestionReporting.vue";

interface Proposition {
  id: number;
  value: string;
  img?: string;
}

const props = withDefaults(
  defineProps<{
    libelle: string;
    img?: string | null;
    themes?: string[];
    propositions: Proposition[];
    disabled?: boolean;
    selectedOptionId?: number | null;
    correctOptionId?: number | null;
    incorrectOptionId?: number | null;
    showCorrectIncorrectColors?: boolean;
    showReporting?: boolean;
    questionId?: number;
  }>(),
  {
    img: "",
    themes: () => [],
    disabled: false,
    selectedOptionId: null,
    correctOptionId: null,
    incorrectOptionId: null,
    showCorrectIncorrectColors: false,
    showReporting: false,
    questionId: 0,
  },
);

const emit = defineEmits<{
  selectOption: [optionId: number];
}>();

const isVerticalImage = ref(false);
const questionReportingRef = ref<InstanceType<typeof QuestionReporting> | null>(null);

watch(
  () => props.img,
  (newImgUrl) => {
    isVerticalImage.value = false;
    if (!newImgUrl || typeof window === "undefined") return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > img.naturalWidth) {
        isVerticalImage.value = true;
      }
    };
    img.src = newImgUrl;
  },
  { immediate: true },
);

function selectOption(id: number) {
  if (props.disabled) return;
  emit("selectOption", id);
}

function getOptionClass(id: number) {
  // Post-response evaluation state (solo/series modes or when showing corrections)
  if (props.showCorrectIncorrectColors) {
    if (props.correctOptionId === id) {
      return "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-neon-green font-extrabold cursor-default";
    }
    if (props.incorrectOptionId === id) {
      return "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-neon-red font-extrabold cursor-default";
    }
    return "bg-slate-900/20 border-white/5 text-gray-500 cursor-default opacity-40";
  }

  // Pre-response or multiplayer simple selection state
  if (props.disabled) {
    if (props.selectedOptionId === id) {
      return "bg-violet-600/15 border-violet-500/50 text-violet-400 shadow-neon scale-[1.01] cursor-default";
    }
    return "bg-slate-900/20 border-white/5 text-gray-500 cursor-default opacity-40";
  }

  if (props.selectedOptionId === id) {
    return "bg-violet-600/15 border-violet-500 shadow-neon text-violet-300 font-extrabold scale-[1.01] btn-pressable";
  }
  return "bg-white/5 hover:bg-white/10 hover:border-white/20 border-white/10 text-gray-300 font-semibold btn-pressable";
}

function resetReporting() {
  if (questionReportingRef.value) {
    questionReportingRef.value.reported = false;
  }
}

defineExpose({
  resetReporting,
});
</script>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.animate-shake {
  animation: shake 0.2s ease-in-out 2;
}
</style>
