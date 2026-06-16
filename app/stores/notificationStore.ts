import { defineStore } from "pinia";
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
    pollInterval: null as any,
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter((n) => !n.read).length,
  },
  actions: {
    async fetchNotifications() {
      // Pour éviter d'instancier plusieurs fois si déjà en cours
      if (this.loading && this.notifications.length === 0) return;
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
    startPolling(intervalMs = 15000) {
      if (this.pollInterval) return;
      // Premier fetch immédiat
      void this.fetchNotifications();
      this.pollInterval = setInterval(() => {
        void this.fetchNotifications();
      }, intervalMs);
    },
    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    },
  },
});
