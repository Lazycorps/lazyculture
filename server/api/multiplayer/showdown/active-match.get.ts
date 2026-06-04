import { getAuthenticatedUser } from "~/server/utils/auth";
import { showdownManager } from "~/server/utils/showdownManager";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // Rechercher s'il existe une partie active en mémoire pour cet utilisateur
  const match = Object.values((showdownManager as any).activeMatches || {}).find(
    (m: any) =>
      m.players.some((p: any) => p.userId === userConnected.id) && m.status !== "FINISHED",
  ) as any;

  return {
    matchId: match ? match.matchId : null,
  };
});
