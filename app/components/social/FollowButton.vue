<template>
  <UButton
    v-if="visible"
    :color="isFollowing ? 'neutral' : 'primary'"
    :variant="isFollowing ? 'soft' : 'solid'"
    :icon="isFollowing ? 'i-heroicons-check' : 'i-heroicons-user-plus'"
    :size="size"
    :loading="loading"
    class="font-bold uppercase tracking-wider font-display"
    @click.stop.prevent="toggleFollow"
  >
    {{ isFollowing ? "Abonné" : "Suivre" }}
  </UButton>
</template>

<script setup lang="ts">
import type { FollowStatusDTO } from "#shared/DTO/followDTO";

const props = withDefaults(
  defineProps<{
    userId: string;
    size?: "xs" | "sm" | "md" | "lg";
  }>(),
  { size: "sm" },
);

const isFollowing = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  change: [followersCount: number];
}>();

const userStore = useUserStore();
const { authFetch } = useAuthFetch();
const toast = useToast();

const loading = ref(false);

const visible = computed(() => userStore.isLoggedIn && userStore.userId !== props.userId);

async function toggleFollow() {
  if (loading.value) return;
  const previous = isFollowing.value;
  // Mise à jour optimiste avec retour arrière en cas d'erreur
  isFollowing.value = !previous;
  loading.value = true;
  try {
    const result = await authFetch<FollowStatusDTO>(`/api/follow/${props.userId}`, {
      method: previous ? "DELETE" : "POST",
    });
    isFollowing.value = result.following;
    emit("change", result.followersCount);
  } catch (e) {
    console.error("Failed to toggle follow:", e);
    isFollowing.value = previous;
    toast.add({
      title: "Erreur",
      description: "Impossible de mettre à jour le suivi. Réessayez.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>
