import prisma from "~~/server/utils/prisma";
import { showdownManager } from "~~/server/utils/showdownManager";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export interface NotificationClient {
  connectionId: string;
  userId: string;
  push: (notification: any) => void;
}

class NotificationStreamManager {
  private clients: NotificationClient[] = [];

  registerClient(connectionId: string, userId: string, pushFn: (notif: any) => void) {
    this.clients.push({ connectionId, userId, push: pushFn });
  }

  unregisterClient(connectionId: string) {
    this.clients = this.clients.filter((c) => c.connectionId !== connectionId);
  }

  /**
   * Diffuse une notification à toutes les sessions actives (onglets) de l'utilisateur.
   */
  async sendToUser(userId: string, notification: any) {
    const userClients = this.clients.filter((c) => c.userId === userId);
    if (userClients.length === 0) {
      return false;
    }

    // Résoudre le statut dynamique si c'est une invitation avant de l'envoyer
    const resolvedStatus = await this.resolveNotificationStatus(notification);
    const notificationToSend = {
      ...notification,
      status: resolvedStatus,
    };

    let sentCount = 0;
    for (const client of userClients) {
      try {
        client.push(notificationToSend);
        sentCount++;
      } catch (err) {
        // Suppression différée / nettoyage
        this.unregisterClient(client.connectionId);
      }
    }
    return sentCount > 0;
  }

  /**
   * Résout à la volée le statut actuel d'une notification (en_attente, en_cours, termine)
   * pour éviter que le client n'ait à le faire, notamment pour les invitations de jeu.
   */
  async resolveNotificationStatus(notif: any) {
    let status: "en_attente" | "en_cours" | "termine" | undefined = undefined;
    const metadata = notif.metadata as Record<string, any> | null;

    if (metadata && typeof metadata === "object") {
      try {
        if (metadata.type === "battle_royale_invite" && metadata.matchId) {
          const matchId = metadata.matchId;
          const brMatch = battleRoyaleManager.getMatch(matchId);
          if (brMatch) {
            if (brMatch.status === "WAITING") status = "en_attente";
            else if (brMatch.status === "PLAYING") status = "en_cours";
            else status = "termine";
          } else {
            const dbMatch = await prisma.battleRoyaleMatch.findUnique({
              where: { id: matchId },
              select: { status: true },
            });
            if (dbMatch) {
              if (dbMatch.status === "WAITING") status = "en_attente";
              else if (dbMatch.status === "PLAYING") status = "en_cours";
              else status = "termine";
            } else {
              status = "termine";
            }
          }
        } else if (metadata.type === "showdown_challenge" && metadata.challengeId) {
          const challengeId = metadata.challengeId;
          const chall = showdownManager.getChallengeStatus(challengeId, notif.userId);
          if (chall.status === "pending") {
            status = "en_attente";
          } else if (chall.status === "accepted" && chall.matchId) {
            const sdMatch = showdownManager.getMatch(chall.matchId);
            if (sdMatch) {
              if (sdMatch.status === "FINISHED") status = "termine";
              else status = "en_cours";
            } else {
              const dbMatch = await prisma.showdownMatch.findUnique({
                where: { id: chall.matchId },
                select: { status: true },
              });
              if (dbMatch) {
                if (dbMatch.status === "FINISHED") status = "termine";
                else status = "en_cours";
              } else {
                status = "termine";
              }
            }
          } else {
            status = "termine";
          }
        }
      } catch (err) {
        console.error(`Erreur de résolution du statut pour la notif ${notif.id}:`, err);
      }
    }
    return status;
  }
}

export const notificationStreamManager = new NotificationStreamManager();
