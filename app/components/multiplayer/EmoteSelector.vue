<template>
  <div ref="containerRef" class="relative inline-block select-none">
    <!-- Emote trigger button -->
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="w-11 h-11 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 hover:border-violet-500/50 hover:bg-slate-800 flex items-center justify-center text-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_0_15px_rgba(109,40,217,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer outline-none"
      title="Réagir avec une emote"
    >
      😊
    </button>

    <!-- Glassmorphic Emote Bubble Menu -->
    <transition name="pop-in">
      <div
        v-if="isOpen"
        class="absolute bottom-14 right-0 bg-[#0d111e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-2.5 z-50 min-w-[280px] justify-between border-t-white/20 animate-fade-in"
      >
        <button
          v-for="emote in emotes"
          :key="emote"
          @click="selectEmote(emote)"
          type="button"
          class="w-9 h-9 flex items-center justify-center text-2xl hover:scale-135 hover:-translate-y-1 active:scale-90 transition-all duration-200 rounded-xl hover:bg-white/5 cursor-pointer outline-none"
        >
          {{ emote }}
        </button>

        <!-- Bubble Pointer arrow -->
        <div
          class="absolute -bottom-1.5 right-4 w-3.5 h-3.5 bg-[#0d111e]/95 border-r border-b border-white/10 rotate-45"
        ></div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const emit = defineEmits<{
  select: [emote: string];
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const emotes = ["👍", "👎", "😂", "😢", "😮", "😡", "😎", "🤫"];

function selectEmote(emote: string) {
  emit("select", emote);
  isOpen.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  if (isOpen.value && containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<style scoped>
/* Pop-in animation */
.pop-in-enter-active {
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.pop-in-leave-active {
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}

.pop-in-leave-to {
  transform: scale(0.6) translateY(10px);
  opacity: 0;
}

@keyframes popIn {
  0% {
    transform: scale(0.6) translateY(10px);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
</style>
