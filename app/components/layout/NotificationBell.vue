<template>
  <UPopover v-model:open="isOpen" :content="popoverContentProps">
    <!-- Trigger option 1: Navigation Link style (Desktop Sidebar) -->
    <button
      v-if="asNavLink"
      class="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group focus:outline-none text-left cursor-pointer select-none font-semibold font-display tracking-wide"
      aria-label="Notifications"
    >
      <UIcon name="i-heroicons-bell" class="text-xl group-hover:scale-110 transition-transform" />
      <span class="flex-1">Notifications</span>
      <span
        v-if="unreadCount > 0"
        class="bg-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-white/10 animate-pulse shadow-md shadow-violet-600/30"
      >
        {{ unreadCount }}
      </span>
    </button>

    <!-- Trigger option 2: Round button (original/mini) -->
    <button
      v-else
      class="relative text-gray-400 hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all focus:outline-none select-none cursor-pointer"
      :class="mini ? 'p-1' : 'p-2'"
      aria-label="Notifications"
    >
      <UIcon name="i-heroicons-bell" :class="mini ? 'w-4 h-4' : 'w-6 h-6'" />
      <span
        v-if="unreadCount > 0"
        :class="
          mini
            ? 'absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-violet-600 px-0.5 text-[7px] font-black text-white ring-[1px] ring-slate-950 animate-pulse'
            : 'absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-black text-white ring-2 ring-slate-950 animate-pulse shadow-lg shadow-violet-600/30'
        "
      >
        {{ unreadCount }}
      </span>
    </button>

    <template #content>
      <div
        class="w-80 md:w-96 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden flex flex-col max-h-[450px]"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between pb-3 border-b border-white/5 mb-2 select-none"
        >
          <h3 class="font-black font-display text-white text-sm flex items-center">
            🔔 Notifications
          </h3>
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-[11px] text-violet-400 hover:text-violet-300 font-bold hover:underline focus:outline-none cursor-pointer"
          >
            Tout marquer comme lu
          </button>
        </div>

        <!-- Scrollable List -->
        <div class="flex-1 overflow-y-auto divide-y divide-white/5 -mx-4 px-4 pr-2 scrollbar-thin">
          <div
            v-if="notifications.length === 0"
            class="py-12 text-center flex flex-col items-center justify-center space-y-3 select-none"
          >
            <div
              class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5"
            >
              <UIcon name="i-heroicons-bell-slash" class="w-6 h-6 text-gray-500" />
            </div>
            <p class="text-xs text-gray-400 font-bold">Aucune notification pour le moment</p>
          </div>
          <div
            v-else
            v-for="notif in notifications"
            :key="notif.id"
            @click="handleNotificationClick(notif)"
            class="py-3 flex items-start space-x-3 cursor-pointer group transition-colors relative"
            :class="notif.read ? 'hover:bg-white/5' : 'bg-violet-950/10 hover:bg-white/5'"
          >
            <!-- Unread indicator dot -->
            <div
              v-if="!notif.read"
              class="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-500 rounded-full"
            ></div>

            <!-- Icon/Avatar depending on type -->
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-300 group-hover:scale-105"
              :class="getIconStyles(notif)"
            >
              <UIcon :name="getIconName(notif)" class="w-5 h-5" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between space-x-2">
                <p class="text-xs font-bold text-white truncate">{{ notif.title }}</p>
                <span class="text-[9px] text-gray-500 font-medium whitespace-nowrap">{{
                  formatTimeAgo(notif.createDate)
                }}</span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                {{ notif.body }}
              </p>

              <!-- Game status badge -->
              <div v-if="notif.status" class="mt-1.5 flex">
                <span
                  class="px-2 py-0.5 rounded-full text-[9px] font-black font-display uppercase tracking-wider border"
                  :class="getStatusStyles(notif.status)"
                >
                  {{ getStatusLabel(notif.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "~/stores/notificationStore";
import type { DBNotification } from "~/stores/notificationStore";

const props = withDefaults(
  defineProps<{
    mini?: boolean;
    asNavLink?: boolean;
  }>(),
  {
    mini: false,
    asNavLink: false,
  },
);

const router = useRouter();
const notificationStore = useNotificationStore();

const isOpen = ref(false);

const notifications = computed(() => notificationStore.notifications);
const unreadCount = computed(() => notificationStore.unreadCount);

const popoverContentProps = computed(() => {
  if (props.asNavLink) {
    return { align: "start" as const, side: "right" as const, sideOffset: 12 };
  }
  return { align: "end" as const, side: "bottom" as const, sideOffset: 8 };
});

async function handleNotificationClick(notif: DBNotification) {
  isOpen.value = false;
  if (!notif.read) {
    await notificationStore.markAsRead(notif.id);
  }
  if (notif.url) {
    router.push(notif.url);
  }
}

async function markAllAsRead() {
  await notificationStore.markAsRead();
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  return `Il y a ${diffDays} j`;
}

function getIconName(notif: DBNotification) {
  const meta = notif.metadata as Record<string, any> | null;
  if (meta?.type === "showdown_challenge") return "i-heroicons-bolt-solid";
  if (meta?.type === "battle_royale_invite") return "i-heroicons-trophy-solid";
  if (meta?.type === "follow") return "i-heroicons-user-plus-solid";
  return "i-heroicons-bell-solid";
}

function getIconStyles(notif: DBNotification) {
  const meta = notif.metadata as Record<string, any> | null;
  if (meta?.type === "showdown_challenge") {
    return "bg-amber-500/10 border-amber-500/20 text-amber-400";
  }
  if (meta?.type === "battle_royale_invite") {
    return "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
  }
  if (meta?.type === "follow") {
    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  }
  return "bg-white/5 border-white/10 text-gray-300";
}

function getStatusLabel(status: "en_attente" | "en_cours" | "termine") {
  if (status === "en_attente") return "En attente";
  if (status === "en_cours") return "En cours";
  return "Terminé";
}

function getStatusStyles(status: "en_attente" | "en_cours" | "termine") {
  if (status === "en_attente") {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (status === "en_cours") {
    return "bg-violet-500/10 text-violet-400 border-violet-500/20 animate-pulse";
  }
  return "bg-white/5 text-gray-500 border-white/5";
}
</script>

<style scoped>
/* Scrollbar subtile */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
