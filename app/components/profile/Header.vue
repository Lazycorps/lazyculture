<template>
  <div
    class="flex flex-col items-center sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6"
  >
    <div class="relative shrink-0">
      <UserAvatar
        :src="avatarUrl"
        :frame="frameStyleKey"
        size="xl"
        avatar-class="w-20 h-20 shadow-neon border-2"
      />
      <NuxtLink
        v-if="isOwnProfile"
        to="/user/avatars"
        class="absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white border-2 border-slate-950 hover:bg-violet-500 transition-colors shadow-neon"
        title="Changer d'avatar"
      >
        <UIcon name="i-heroicons-pencil" class="text-sm" />
      </NuxtLink>
    </div>
    <div class="flex-1 text-center sm:text-left space-y-1.5 w-full">
      <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1">
        <h2 class="text-2xl font-black font-display text-white tracking-wide truncate">
          {{ name || "Joueur" }}
        </h2>
        <span
          class="inline-flex items-center justify-center self-center bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-extrabold px-3 py-1 rounded-full font-display"
        >
          Niveau {{ level }}
        </span>
        <span
          v-if="isFollowedBy"
          class="inline-flex items-center justify-center self-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display uppercase tracking-wider"
        >
          Vous suit
        </span>
      </div>

      <!-- Compteurs abonnés / abonnements -->
      <div
        v-if="followersCount !== null && followingCount !== null"
        class="flex justify-center sm:justify-start gap-3 text-xs text-gray-400 font-display"
      >
        <button
          class="hover:text-violet-300 transition-colors"
          @click="emit('openFollowModal', 'followers')"
        >
          <span class="font-bold text-white">{{ followersCount }}</span>
          {{ followersCount > 1 ? "abonnés" : "abonné" }}
        </button>
        <span class="text-gray-600">·</span>
        <button
          class="hover:text-violet-300 transition-colors"
          @click="emit('openFollowModal', 'following')"
        >
          <span class="font-bold text-white">{{ followingCount }}</span>
          {{ followingCount > 1 ? "abonnements" : "abonnement" }}
        </button>
      </div>

      <!-- Experience Progression Jauge -->
      <div class="space-y-1 pt-1.5">
        <div
          class="w-full h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden relative shadow-inner"
        >
          <div
            class="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 shadow-neon"
            :style="{ width: `${xpProgress}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-xs font-bold text-gray-500 font-display">
          <span>{{ xp - xpThreshold }} / {{ xpMax - xpThreshold }} XP</span>
          <span>Progression Niveau</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string;
    level: number;
    xp: number;
    xpThreshold: number;
    xpMax: number;
    followersCount?: number | null;
    followingCount?: number | null;
    isFollowedBy?: boolean;
    avatarUrl?: string | null;
    frameStyleKey?: string | null;
    isOwnProfile?: boolean;
  }>(),
  {
    followersCount: null,
    followingCount: null,
    isFollowedBy: false,
    avatarUrl: null,
    frameStyleKey: null,
    isOwnProfile: false,
  },
);

const emit = defineEmits<{
  openFollowModal: [tab: "followers" | "following"];
}>();

const xpProgress = computed(() => {
  const current = props.xp - props.xpThreshold;
  const max = props.xpMax - props.xpThreshold;
  if (max <= 0) return 0;
  return (current / max) * 100;
});
</script>
