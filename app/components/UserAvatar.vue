<template>
  <div class="relative inline-flex shrink-0 rounded-full" :class="frameClass">
    <UAvatar
      :src="src ?? undefined"
      icon="i-heroicons-user"
      :size="size"
      :alt="alt"
      class="bg-violet-600/20 text-violet-300 border border-violet-500/30"
      :class="avatarClass"
    />
  </div>
</template>

<script setup lang="ts">
import { frameCssClass } from "#shared/avatarFrames";

const props = withDefaults(
  defineProps<{
    /** URL de l'image d'avatar équipé ; null/undefined = icône générique */
    src?: string | null;
    /** Clé de style du cadre équipé (cf. shared/avatarFrames.ts) */
    frame?: string | null;
    alt?: string;
    size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    /** Classes passées à l'UAvatar interne (dimensions custom, etc.) */
    avatarClass?: string;
  }>(),
  {
    src: null,
    frame: null,
    alt: "Avatar",
    size: "md",
    avatarClass: "",
  },
);

const frameClass = computed(() => frameCssClass(props.frame));
</script>
