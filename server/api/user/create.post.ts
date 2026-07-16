import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  // Force l'initialisation du pseudo et du slug à vide lors de la création initiale du profil.
  // L'utilisateur devra obligatoirement passer par l'API de modification de pseudo pour en définir un valide.
  await userService.createUserIfMissing(userConnected.id, "", "");
});
