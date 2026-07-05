<template>
  <div class="w-full max-w-xl mx-auto py-2 space-y-6 select-none animate-fade-in">
    <!-- Header -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
      >
        Ajouter des amis
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Suivez d'autres joueurs pour les retrouver dans votre classement entre amis.
      </p>
    </div>

    <!-- Non authenticated -->
    <UCard
      v-if="!userStore.isLoggedIn"
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
    >
      <div class="text-center py-10 px-6 space-y-6">
        <div
          class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto animate-pulse"
        >
          🔒
        </div>
        <p class="text-sm text-gray-400 max-w-sm mx-auto">
          Connectez-vous pour rechercher et suivre d'autres joueurs.
        </p>
        <UButton
          to="/login"
          color="primary"
          size="lg"
          block
          icon="i-heroicons-key"
          class="font-extrabold uppercase font-display tracking-wider py-3"
        >
          Se connecter
        </UButton>
      </div>
    </UCard>

    <template v-else>
      <!-- Search -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="space-y-3">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon name="i-heroicons-magnifying-glass" class="mr-2 text-violet-500 text-base" />
            Rechercher un joueur
          </h3>
          <SocialUserSearch />
        </div>
      </UCard>

      <!-- Suggestions -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <div class="space-y-3">
          <h3
            class="text-sm font-black uppercase tracking-wider text-gray-400 font-display flex items-center"
          >
            <UIcon name="i-heroicons-sparkles" class="mr-2 text-violet-500 text-base" />
            Suggestions
          </h3>

          <div v-if="loadingSuggestions" class="space-y-2">
            <USkeleton v-for="i in 4" :key="i" class="h-14 w-full bg-slate-800 rounded-2xl" />
          </div>

          <p
            v-else-if="suggestions.length === 0"
            class="text-sm text-gray-500 text-center py-6 font-display"
          >
            Aucune suggestion pour le moment.
          </p>

          <div v-else class="space-y-2">
            <div
              v-for="suggestion in suggestions"
              :key="suggestion.userId"
              class="flex items-center gap-3 bg-slate-950/20 border border-white/5 hover:border-white/10 rounded-2xl p-3 transition-all duration-200"
            >
              <NuxtLink
                :to="`/user/${suggestion.userId}`"
                class="flex items-center gap-3 flex-1 min-w-0"
              >
                <UserAvatar
                  :src="suggestion.avatarUrl"
                  :frame="suggestion.frameStyleKey"
                  size="sm"
                />
                <div class="min-w-0">
                  <p class="text-sm font-bold text-white truncate font-display">
                    {{ suggestion.name }}
                  </p>
                  <p class="text-[10px] text-gray-500 font-display uppercase tracking-wider">
                    Niveau {{ suggestion.level }} · {{ suggestion.xp }} XP
                  </p>
                </div>
              </NuxtLink>
              <SocialFollowButton
                v-model="suggestion.isFollowing"
                :user-id="suggestion.userId"
                size="xs"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Back to profile -->
      <div class="flex justify-center">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          class="font-bold uppercase tracking-wider font-display hover:bg-white/5 text-gray-400"
          to="/user/profil"
        >
          Retour au profil
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { UserSearchResultDTO } from "#shared/DTO/followDTO";

const userStore = useUserStore();
const { authFetch } = useAuthFetch();

const suggestions = ref<UserSearchResultDTO[]>([]);
const loadingSuggestions = ref(false);

onMounted(async () => {
  await userStore.fetchUser();
  if (userStore.isLoggedIn) {
    await fetchSuggestions();
  }
});

async function fetchSuggestions() {
  loadingSuggestions.value = true;
  try {
    suggestions.value = await authFetch<UserSearchResultDTO[]>("/api/user/suggestions");
  } catch (e) {
    console.error("Failed to fetch friend suggestions:", e);
  } finally {
    loadingSuggestions.value = false;
  }
}
</script>
