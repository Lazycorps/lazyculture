import { getAuthenticatedUser } from "~~/server/utils/auth";
import { notificationStreamManager } from "~~/server/utils/notificationStreamManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // 1. Créer le flux d'événements (SSE)
  const eventStream = createEventStream(event);

  // Générer un identifiant de connexion unique pour ce client (gère le multi-onglets)
  const connectionId = Math.random().toString(36).substring(2, 15);

  // 2. Enregistrer le client auprès du gestionnaire
  notificationStreamManager.registerClient(connectionId, userConnected.id, (notification) => {
    void eventStream.push({
      event: "notification",
      data: typeof notification === "string" ? notification : JSON.stringify(notification),
    });
  });

  // 3. Gérer la fermeture du stream
  eventStream.onClosed(async () => {
    notificationStreamManager.unregisterClient(connectionId);
  });

  // Envoyer un événement initial pour valider la connexion
  void eventStream.push({
    event: "ping",
    data: "connected",
  });

  // 4. Renvoyer le stream
  return eventStream.send();
});
