<template>
  <div
    v-if="visible"
    class="w-full bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 text-left space-y-3 animate-fade-in"
  >
    <!-- Succès (après activation / installation) -->
    <template v-if="done">
      <div class="flex items-start text-xs text-emerald-300">
        <UIcon name="i-heroicons-check-circle" class="mr-2 text-base text-emerald-400 shrink-0" />
        <span class="font-medium leading-relaxed">{{ successMessage }}</span>
      </div>
    </template>

    <!-- Activer les notifications -->
    <template v-else-if="mode === 'notifications'">
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg shrink-0"
        >
          🔥
        </div>
        <div class="space-y-1">
          <p class="text-sm font-black font-display text-white tracking-wide">
            Ne perdez pas votre série !
          </p>
          <p class="text-xs text-gray-400 leading-relaxed">
            Activez les notifications pour recevoir un rappel quand votre défi du jour vous attend.
          </p>
        </div>
      </div>
      <div
        v-if="push.statusMessage.value"
        class="flex items-start bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 text-xs text-violet-300"
      >
        <UIcon
          name="i-heroicons-information-circle"
          class="mr-2 text-base text-violet-400 shrink-0"
        />
        <span class="font-medium leading-relaxed">{{ push.statusMessage.value }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          size="sm"
          icon="i-heroicons-bell"
          :loading="push.loading.value"
          class="font-bold font-display uppercase tracking-wide text-xs"
          @click="enableNotifications"
        >
          Activer
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-bold font-display uppercase tracking-wide text-xs text-gray-500"
          @click="dismiss"
        >
          Plus tard
        </UButton>
      </div>
    </template>

    <!-- iOS : installation requise pour les notifications -->
    <template v-else-if="mode === 'ios-install'">
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg shrink-0"
        >
          📲
        </div>
        <div class="space-y-1">
          <p class="text-sm font-black font-display text-white tracking-wide">
            Installez l'application
          </p>
          <p class="text-xs text-gray-400 leading-relaxed">
            Ajoutez Lazyculture à votre écran d'accueil pour jouer plus vite et recevoir les rappels
            de votre défi quotidien.
          </p>
        </div>
      </div>
      <ol class="space-y-1.5 text-xs text-gray-300 pl-1">
        <li class="flex items-center">
          <UIcon
            name="i-heroicons-arrow-up-on-square"
            class="mr-2 text-base text-violet-400 shrink-0"
          />
          1. Appuyez sur <span class="font-bold mx-1">Partager</span> dans Safari
        </li>
        <li class="flex items-center">
          <UIcon name="i-heroicons-plus-circle" class="mr-2 text-base text-violet-400 shrink-0" />
          2. Choisissez <span class="font-bold ml-1">« Sur l'écran d'accueil »</span>
        </li>
      </ol>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-bold font-display uppercase tracking-wide text-xs text-gray-500"
          @click="dismiss"
        >
          Plus tard
        </UButton>
      </div>
    </template>

    <!-- Android/Chrome : prompt d'installation natif -->
    <template v-else-if="mode === 'install'">
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg shrink-0"
        >
          📲
        </div>
        <div class="space-y-1">
          <p class="text-sm font-black font-display text-white tracking-wide">
            Installez l'application
          </p>
          <p class="text-xs text-gray-400 leading-relaxed">
            Ajoutez Lazyculture à votre écran d'accueil pour retrouver votre défi quotidien en un
            geste.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          class="font-bold font-display uppercase tracking-wide text-xs"
          @click="install"
        >
          Installer
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-bold font-display uppercase tracking-wide text-xs text-gray-500"
          @click="dismiss"
        >
          Plus tard
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const DISMISS_KEY = "pwa-engagement-dismissed-at";
const COOLDOWN_DAYS = 7;

const push = usePushSubscription();
const { canPromptInstall, isInstalled, isIos, promptInstall } = usePwaInstall();

// Masqué tant qu'on n'a pas vérifié le cooldown côté client
const dismissedRecently = ref(true);
const done = ref(false);
const successMessage = ref("");

onMounted(() => {
  push.checkSupport();
  const ts = localStorage.getItem(DISMISS_KEY);
  dismissedRecently.value = !!ts && Date.now() - Number(ts) < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
});

// Une seule action à la fois, par ordre de valeur pour la rétention :
// 1. notifications (possibles sans installation sur Android/desktop)
// 2. installation iOS (prérequis aux notifications sur Safari iOS)
// 3. installation Android (prompt natif disponible)
const mode = computed<"notifications" | "ios-install" | "install" | null>(() => {
  if (push.isSupported.value && !push.isSubscribed.value && push.permission.value !== "denied") {
    return "notifications";
  }
  if (isIos.value && !isInstalled.value && !push.isSupported.value) {
    return "ios-install";
  }
  if (canPromptInstall.value && !isInstalled.value) {
    return "install";
  }
  return null;
});

const visible = computed(() => !dismissedRecently.value && (done.value || mode.value !== null));

async function enableNotifications() {
  const ok = await push.subscribe();
  if (ok) {
    successMessage.value =
      "Notifications activées ! Vous recevrez un rappel pour votre défi quotidien. 🎉";
    done.value = true;
  }
}

async function install() {
  const accepted = await promptInstall();
  if (accepted) {
    successMessage.value =
      "Application installée ! Retrouvez Lazyculture sur votre écran d'accueil. 🎉";
    done.value = true;
  }
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
  dismissedRecently.value = true;
}
</script>
