/**
 * Gère l'abonnement aux notifications push (permission, souscription VAPID,
 * synchronisation serveur). Réutilisé par la page profil et les prompts
 * d'engagement.
 */
export function usePushSubscription() {
  const config = useRuntimeConfig();
  const { authFetch } = useAuthFetch();

  const isSupported = ref(false);
  const isSubscribed = ref(false);
  const loading = ref(false);
  const statusMessage = ref("");
  const permission = ref<NotificationPermission | null>(null);

  function checkSupport() {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      isSupported.value = true;
      permission.value = "Notification" in window ? Notification.permission : null;
      checkSubscription();
    } else {
      isSupported.value = false;
      statusMessage.value = "Les notifications push ne sont pas supportées par votre navigateur.";
    }
  }

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      isSubscribed.value = !!subscription;
    } catch (e) {
      console.error("Erreur lors de la vérification de l'abonnement push :", e);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /** Demande la permission et enregistre l'abonnement. Retourne true en cas de succès. */
  async function subscribe(): Promise<boolean> {
    loading.value = true;
    statusMessage.value = "";
    try {
      const result = await Notification.requestPermission();
      permission.value = result;
      if (result !== "granted") {
        statusMessage.value =
          "Permission de notification refusée. Veuillez autoriser les notifications dans les paramètres du navigateur pour continuer.";
        return false;
      }

      const vapidKey = config.public.vapidPublicKey;
      if (!vapidKey) {
        statusMessage.value = "Configuration serveur manquante (clé publique VAPID introuvable).";
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await authFetch("/api/notifications/subscribe", {
        method: "POST",
        body: { subscription },
      });

      isSubscribed.value = true;
      statusMessage.value =
        "Notifications push activées avec succès ! 🎉 Vous recevrez des alertes pour votre streak et vos défis quotidiens.";
      return true;
    } catch (err: any) {
      console.error("Erreur lors de l'abonnement push :", err);
      statusMessage.value = "Une erreur est survenue lors de l'abonnement aux notifications.";
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function unsubscribe() {
    loading.value = true;
    statusMessage.value = "";
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await authFetch("/api/notifications/unsubscribe", {
          method: "POST",
          body: { endpoint },
        });
      }

      isSubscribed.value = false;
      statusMessage.value = "Les notifications push ont été désactivées.";
    } catch (err: any) {
      console.error("Erreur lors de la désinscription push :", err);
      statusMessage.value = "Une erreur est survenue lors de la désactivation des notifications.";
    } finally {
      loading.value = false;
    }
  }

  return {
    isSupported,
    isSubscribed,
    loading,
    statusMessage,
    permission,
    checkSupport,
    subscribe,
    unsubscribe,
  };
}
