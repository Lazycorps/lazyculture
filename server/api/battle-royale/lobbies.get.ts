import { battleRoyaleManager } from "~/server/utils/battleRoyaleManager";

export default defineEventHandler(async (event) => {
  // Liste des salons d'attente
  return battleRoyaleManager.getWaitingMatches();
});
