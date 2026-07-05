<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-black font-display text-white tracking-wide">{{ title }}</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <div v-if="loading" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-12 w-full bg-slate-800 rounded-xl" />
        </div>

        <div v-else-if="friends.length === 0" class="text-center py-8 space-y-3">
          <p class="text-sm text-gray-500 font-display">
            Vous ne suivez aucun joueur pour le moment.
          </p>
          <UButton
            to="/ranking"
            color="primary"
            variant="soft"
            size="sm"
            class="font-bold uppercase tracking-wider font-display"
            @click="open = false"
          >
            Trouver des amis
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <div class="space-y-1 max-h-72 overflow-y-auto">
            <component
              :is="mode === 'multi' ? 'label' : 'div'"
              v-for="friend in friends"
              :key="friend.userId"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
              :class="mode === 'multi' ? 'cursor-pointer' : ''"
            >
              <UCheckbox
                v-if="mode === 'multi'"
                :model-value="selectedIds.includes(friend.userId)"
                @update:model-value="toggleSelection(friend.userId)"
              />
              <UserAvatar :src="friend.avatarUrl" :frame="friend.frameStyleKey" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-white truncate font-display">{{ friend.name }}</p>
                <p class="text-[10px] text-gray-500 font-display uppercase tracking-wider">
                  Niveau {{ friend.level }}
                </p>
              </div>
              <UButton
                v-if="mode === 'single'"
                color="primary"
                size="xs"
                icon="i-heroicons-bolt"
                class="font-bold uppercase tracking-wider font-display"
                @click="selectFriend(friend)"
              >
                {{ confirmLabel }}
              </UButton>
            </component>
          </div>

          <div v-if="mode === 'multi'" class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="font-bold uppercase tracking-wider font-display text-gray-400"
              @click="toggleAll"
            >
              {{ allSelected ? "Tout désélectionner" : "Tout sélectionner" }}
            </UButton>
            <UButton
              color="primary"
              size="sm"
              icon="i-heroicons-paper-airplane"
              class="flex-1 font-bold uppercase tracking-wider font-display"
              :disabled="selectedIds.length === 0"
              @click="confirmSelection"
            >
              {{ confirmLabel }} ({{ selectedIds.length }})
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FollowListDTO, FollowUserDTO } from "#shared/DTO/followDTO";

const props = withDefaults(
  defineProps<{
    mode?: "multi" | "single";
    title?: string;
    confirmLabel?: string;
  }>(),
  {
    mode: "multi",
    title: "Inviter des amis",
    confirmLabel: "Inviter",
  },
);

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
  confirm: [friendIds: string[]];
  select: [friend: FollowUserDTO];
}>();

const userStore = useUserStore();
const { authFetch } = useAuthFetch();

const friends = ref<FollowUserDTO[]>([]);
const selectedIds = ref<string[]>([]);
const loading = ref(false);

const allSelected = computed(
  () => friends.value.length > 0 && selectedIds.value.length === friends.value.length,
);

watch(open, (isOpen) => {
  if (isOpen) {
    selectedIds.value = [];
    loadFriends();
  }
});

async function loadFriends() {
  loading.value = true;
  try {
    const data = await authFetch<FollowListDTO>(
      `/api/follow/following/${userStore.userId}?page=1&limit=50`,
    );
    friends.value = data.items;
  } catch (e) {
    console.error("Failed to load friends:", e);
  } finally {
    loading.value = false;
  }
}

function toggleSelection(userId: string) {
  if (selectedIds.value.includes(userId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== userId);
  } else {
    selectedIds.value = [...selectedIds.value, userId];
  }
}

function toggleAll() {
  selectedIds.value = allSelected.value ? [] : friends.value.map((f) => f.userId);
}

function confirmSelection() {
  emit("confirm", selectedIds.value);
  open.value = false;
}

function selectFriend(friend: FollowUserDTO) {
  emit("select", friend);
  open.value = false;
}
</script>
