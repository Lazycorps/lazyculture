<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-black font-display text-white tracking-wide">Communauté</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <!-- Onglets -->
        <div
          class="flex bg-slate-950/60 p-1 rounded-2xl border border-white/5 mb-4 font-display text-xs font-bold uppercase tracking-wider"
        >
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex-1 py-2 rounded-xl transition-all duration-200"
            :class="
              currentTab === tab.key
                ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-neon'
                : 'text-gray-500 hover:text-gray-300'
            "
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Liste -->
        <div class="space-y-1 max-h-80 overflow-y-auto">
          <div v-if="loading && items.length === 0" class="space-y-2">
            <USkeleton v-for="i in 3" :key="i" class="h-12 w-full bg-slate-800 rounded-xl" />
          </div>

          <p
            v-else-if="items.length === 0"
            class="text-sm text-gray-500 text-center py-8 font-display"
          >
            {{
              currentTab === "followers"
                ? "Aucun abonné pour le moment."
                : "Aucun abonnement pour le moment."
            }}
          </p>

          <template v-else>
            <div
              v-for="item in items"
              :key="item.userId"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <NuxtLink
                :to="`/user/${item.userId}`"
                class="flex items-center gap-3 flex-1 min-w-0"
                @click="open = false"
              >
                <UAvatar
                  icon="i-heroicons-user"
                  size="sm"
                  class="bg-violet-600/20 text-violet-300 border border-violet-500/30"
                />
                <div class="min-w-0">
                  <p class="text-sm font-bold text-white truncate font-display">{{ item.name }}</p>
                  <p class="text-[10px] text-gray-500 font-display uppercase tracking-wider">
                    Niveau {{ item.level }}
                  </p>
                </div>
              </NuxtLink>
              <SocialFollowButton
                v-model="item.isFollowedByViewer"
                :user-id="item.userId"
                size="xs"
              />
            </div>

            <UButton
              v-if="items.length < total"
              color="neutral"
              variant="ghost"
              block
              size="sm"
              :loading="loading"
              class="font-bold uppercase tracking-wider font-display text-gray-400"
              @click="loadMore"
            >
              Voir plus
            </UButton>
          </template>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FollowListDTO, FollowUserDTO } from "#shared/DTO/followDTO";

type TabKey = "followers" | "following";

const props = defineProps<{
  userId: string;
  initialTab?: TabKey;
}>();

const open = defineModel<boolean>("open", { required: true });

const { authFetch } = useAuthFetch();

const tabs: { key: TabKey; label: string }[] = [
  { key: "followers", label: "Abonnés" },
  { key: "following", label: "Abonnements" },
];

const currentTab = ref<TabKey>(props.initialTab ?? "followers");
const items = ref<FollowUserDTO[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

watch(open, (isOpen) => {
  if (isOpen) {
    currentTab.value = props.initialTab ?? "followers";
    resetAndLoad();
  }
});

function switchTab(tab: TabKey) {
  if (currentTab.value === tab) return;
  currentTab.value = tab;
  resetAndLoad();
}

function resetAndLoad() {
  items.value = [];
  total.value = 0;
  page.value = 1;
  loadPage();
}

async function loadPage() {
  loading.value = true;
  try {
    const data = await authFetch<FollowListDTO>(
      `/api/follow/${currentTab.value}/${props.userId}?page=${page.value}&limit=20`,
    );
    items.value = [...items.value, ...data.items];
    total.value = data.total;
  } catch (e) {
    console.error("Failed to load follow list:", e);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  loadPage();
}
</script>
