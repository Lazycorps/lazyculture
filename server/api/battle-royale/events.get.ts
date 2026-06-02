import { getAuthenticatedUser } from "~/server/utils/auth";
import { battleRoyaleManager } from "~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const query = getQuery(event);
  const matchId = query.matchId as string;

  if (!matchId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le paramètre matchId est requis.",
    });
  }

  const match = battleRoyaleManager.getMatch(matchId);
  if (!match) {
    throw createError({
      statusCode: 404,
      statusMessage: "Partie introuvable.",
    });
  }

  // 1. Créer le flux d'événements (SSE)
  const eventStream = createEventStream(event);

  // 2. Enregistrer la fonction d'envoi d'événements
  await battleRoyaleManager.registerClient(matchId, userConnected.id, (message) => {
    // message est sous le format { event: string, data: any }
    void eventStream.push({
      event: message.event,
      data: typeof message.data === "string" ? message.data : JSON.stringify(message.data),
    });
  });

  // 3. Gérer la fermeture de la connexion
  eventStream.onClosed(async () => {
    battleRoyaleManager.unregisterClient(matchId, userConnected.id);
  });

  // 4. Renvoyer le stream
  return eventStream.send();
});
