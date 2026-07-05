<template>
  <div class="w-full max-w-6xl mx-auto py-4 select-none animate-fade-in">
    <!-- En-tête : titre + solde de pièces -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-black font-display text-white tracking-wide">Avatars</h1>
        <p class="text-sm text-gray-400">Personnalisez votre profil avec un avatar et un cadre.</p>
      </div>
      <span
        class="inline-flex items-center gap-2 self-start sm:self-auto bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-extrabold px-4 py-2 rounded-full font-display"
      >
        <UIcon name="i-heroicons-circle-stack" class="text-lg" />
        {{ cosmeticsStore.coins }} pièces
      </span>
    </div>

    <div v-if="!userStore.isLoggedIn" class="text-center py-16 space-y-4">
      <p class="text-gray-400">Connectez-vous pour débloquer et équiper des avatars !</p>
      <UButton to="/login" color="primary">Connexion</UButton>
    </div>

    <div v-else-if="cosmeticsStore.loading && !catalog" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="text-3xl text-violet-400 animate-spin" />
    </div>

    <template v-else-if="catalog">
      <!-- Section Avatars -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl mb-6"
      >
        <h2 class="text-lg font-black font-display text-white tracking-wide mb-4">
          <UIcon name="i-heroicons-face-smile" class="text-violet-400 align-middle mr-1" />
          Avatars
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div
            v-for="item in catalog.avatars"
            :key="`avatar-${item.id}`"
            class="flex flex-col items-center gap-2 bg-white/5 border rounded-2xl p-4 transition-colors"
            :class="item.equipped ? 'border-violet-500/60 shadow-neon' : 'border-white/10'"
          >
            <UserAvatar
              :src="item.imageUrl"
              size="xl"
              avatar-class="w-16 h-16"
              :class="{ 'opacity-40 grayscale': !item.owned }"
            />
            <p class="text-xs font-bold text-white text-center truncate w-full">{{ item.name }}</p>
            <CosmeticActionButton
              :item="item"
              type="avatar"
              :coins="catalog.coins"
              :pending="cosmeticsStore.pendingId === `avatar-${item.id}`"
              @unlock="cosmeticsStore.unlock('avatar', item.id)"
              @equip="cosmeticsStore.equip('avatar', item.equipped ? null : item.id)"
            />
          </div>
        </div>
        <p v-if="catalog.avatars.length === 0" class="text-sm text-gray-500 text-center py-6">
          Aucun avatar disponible pour le moment.
        </p>
      </UCard>

      <!-- Section Cadres -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      >
        <h2 class="text-lg font-black font-display text-white tracking-wide mb-4">
          <UIcon name="i-heroicons-sparkles" class="text-violet-400 align-middle mr-1" />
          Cadres
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div
            v-for="item in catalog.frames"
            :key="`frame-${item.id}`"
            class="flex flex-col items-center gap-2 bg-white/5 border rounded-2xl p-4 transition-colors"
            :class="item.equipped ? 'border-violet-500/60 shadow-neon' : 'border-white/10'"
          >
            <UserAvatar
              :src="userStore.avatarUrl"
              :frame="item.styleKey"
              size="xl"
              avatar-class="w-16 h-16"
              :class="{ 'opacity-40 grayscale': !item.owned }"
            />
            <p class="text-xs font-bold text-white text-center truncate w-full">{{ item.name }}</p>
            <CosmeticActionButton
              :item="item"
              type="frame"
              :coins="catalog.coins"
              :pending="cosmeticsStore.pendingId === `frame-${item.id}`"
              @unlock="cosmeticsStore.unlock('frame', item.id)"
              @equip="cosmeticsStore.equip('frame', item.equipped ? null : item.id)"
            />
          </div>
        </div>
        <p v-if="catalog.frames.length === 0" class="text-sm text-gray-500 text-center py-6">
          Aucun cadre disponible pour le moment.
        </p>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const userStore = useUserStore();
const cosmeticsStore = useCosmeticsStore();

const catalog = computed(() => cosmeticsStore.catalog);

onMounted(async () => {
  await userStore.fetchUser();
  if (userStore.isLoggedIn) {
    await cosmeticsStore.fetchCatalog();
  }
});
</script>
