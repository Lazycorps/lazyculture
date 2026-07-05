<template>
  <div class="space-y-3">
    <UInput
      v-model="query"
      icon="i-heroicons-magnifying-glass"
      placeholder="Rechercher un joueur..."
      size="lg"
      class="w-full"
      :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
    />

    <div v-if="searching" class="space-y-2">
      <USkeleton v-for="i in 2" :key="i" class="h-14 w-full bg-slate-800 rounded-2xl" />
    </div>

    <p
      v-else-if="hasSearched && results.length === 0"
      class="text-sm text-gray-500 text-center py-4 font-display"
    >
      Aucun joueur trouvé.
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="result in results"
        :key="result.userId"
        class="flex items-center gap-3 bg-slate-950/20 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all duration-200"
      >
        <NuxtLink :to="`/user/${result.userId}`" class="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatar :src="result.avatarUrl" :frame="result.frameStyleKey" size="sm" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-white truncate font-display">{{ result.name }}</p>
            <p class="text-[10px] text-gray-500 font-display uppercase tracking-wider">
              Niveau {{ result.level }} · {{ result.xp }} XP
            </p>
          </div>
        </NuxtLink>
        <SocialFollowButton
          v-model="result.isFollowing"
          :user-id="result.userId"
          size="xs"
          @change="emit('followChanged')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserSearchResultDTO } from "#shared/DTO/followDTO";

const emit = defineEmits<{
  followChanged: [];
}>();

const { authFetch } = useAuthFetch();

const query = ref("");
const results = ref<UserSearchResultDTO[]>([]);
const searching = ref(false);
const hasSearched = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    results.value = [];
    hasSearched.value = false;
    return;
  }
  debounceTimer = setTimeout(() => search(trimmed), 300);
});

async function search(q: string) {
  searching.value = true;
  try {
    results.value = await authFetch<UserSearchResultDTO[]>(
      `/api/user/search?q=${encodeURIComponent(q)}`,
    );
    hasSearched.value = true;
  } catch (e) {
    console.error("Failed to search users:", e);
  } finally {
    searching.value = false;
  }
}
</script>
