import { defineStore } from "pinia";
import { markRaw } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";

export interface DBNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createDate: string;
  status?: "en_attente" | "en_cours" | "termine";
}

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    notifications: [] as DBNotification[],
    loading: false,
    eventSource: null as EventSource | null,
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter((n) => !n.read).length,
  },
  actions: {
    async fetchNotifications() {
      // Pour éviter d'instancier plusieurs fois si déjà en cours
      if (this.loading && this.notifications.length === 0) return;
      this.loading = true;
      const { authFetch } = useAuthFetch();
      try {
        const data = await authFetch<DBNotification[]>("/api/notifications");
        this.notifications = data || [];
      } catch (err) {
        console.error("Erreur lors de la récupération des notifications :", err);
      } finally {
        this.loading = false;
      }
    },
    async markAsRead(id?: string) {
      const { authFetch } = useAuthFetch();

      // Mise à jour optimiste locale
      if (id) {
        const notif = this.notifications.find((n) => n.id === id);
        if (notif) notif.read = true;
      } else {
        this.notifications.forEach((n) => (n.read = true));
      }

      try {
        await authFetch("/api/notifications/read", {
          method: "POST",
          body: { id },
        });
      } catch (err) {
        console.error("Erreur lors du marquage comme lu :", err);
        // En cas d'échec, on recharge l'état réel depuis le serveur
        await this.fetchNotifications();
      }
    },
    connect() {
      if (this.eventSource) return;

      // Premier chargement de l'historique en base de données
      void this.fetchNotifications();

      // Établissement de la connexion SSE
      const source = new EventSource("/api/notifications/stream");
      this.eventSource = markRaw(source);

      source.addEventListener("notification", (event) => {
        try {
          const newNotif = JSON.parse(event.data) as DBNotification;
          // Éviter les doublons
          if (!this.notifications.some((n) => n.id === newNotif.id)) {
            this.notifications.unshift(newNotif);

            // Afficher le toast avec Nuxt UI
            try {
              const toast = useToast();
              toast.add({
                title: newNotif.title,
                description: newNotif.body,
                color: "primary",
                icon: "i-heroicons-bell",
                duration: 5000,
              });
            } catch (err) {
              console.warn(
                "[notificationStore] Impossible d'afficher le toast (contexte hors Vue) :",
                err,
              );
            }
          }
        } catch (err) {
          console.error("Erreur lors de la lecture de la notification temps réel :", err);
        }
      });

      source.addEventListener("error", (err) => {
        console.error("Erreur ou déconnexion du flux SSE notifications :", err);
        // Note : le navigateur essaiera de se reconnecter automatiquement
      });
    },
    disconnect() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },
    // Compatibilité descendante
    startPolling() {
      this.connect();
    },
    stopPolling() {
      this.disconnect();
    },
  },
});
