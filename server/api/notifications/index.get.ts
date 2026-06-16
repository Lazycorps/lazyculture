import { getAuthenticatedUser } from "~~/server/utils/auth";
import prisma from "~~/server/utils/prisma";
import { showdownManager } from "~~/server/utils/showdownManager";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  const user = getAuthenticatedUser(event);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createDate: "desc" },
    take: 50,
  });

  const resolvedNotifications = [];

  for (const notif of notifications) {
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
          const chall = showdownManager.getChallengeStatus(challengeId, user.id);
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

    resolvedNotifications.push({
      ...notif,
      status,
    });
  }

  return resolvedNotifications;
});
