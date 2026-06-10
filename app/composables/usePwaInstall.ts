interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// État au niveau module : l'événement beforeinstallprompt ne se déclenche
// qu'une fois, très tôt — il est capté par le plugin pwaInstall.client.ts
// via initPwaInstall(). Pas de ref pour deferredPrompt : envelopper un
// événement natif dans un proxy réactif casse l'appel à .prompt().
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

const canPromptInstall = ref(false);
const isInstalled = ref(false);

export function initPwaInstall() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  isInstalled.value =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    canPromptInstall.value = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    canPromptInstall.value = false;
    isInstalled.value = true;
  });
}

export function usePwaInstall() {
  initPwaInstall();

  const isIos = computed(() => {
    if (typeof navigator === "undefined") return false;
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPadOS se présente comme un Mac mais possède un écran tactile
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  });

  /** Ouvre le prompt d'installation natif (Android/Chrome). Retourne true si accepté. */
  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) return false;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    canPromptInstall.value = false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      isInstalled.value = true;
      return true;
    }
    return false;
  }

  return { canPromptInstall, isInstalled, isIos, promptInstall };
}
