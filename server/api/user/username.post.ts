import { userService } from "~~/server/services/UserService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);
  const username = body.username;

  if (typeof username !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Le pseudonyme doit être une chaîne de caractères.",
    });
  }

  const trimmed = username.trim();

  // 1. Validation de la longueur (entre 4 et 16 caractères)
  if (trimmed.length < 4 || trimmed.length > 16) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le pseudonyme doit contenir entre 4 et 16 caractères.",
    });
  }

  // 2. Validation des caractères autorisés (lettres accentuées françaises comprises, chiffres, espaces, tirets, underscores)
  // Cela empêche l'injection de balises HTML/scripts (<, >, &, ", ') et autres caractères spéciaux dangereux.
  const allowedCharsRegex =
    /^[a-zA-Z0-9_\-\sàáâäçèéêëìíîïñòóôöùúûüýÿæœÀÁÂÄÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜÝŸÆŒ]+$/;
  if (!allowedCharsRegex.test(trimmed)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le pseudonyme contient des caractères non autorisés.",
    });
  }

  // 3. Validation de la validité du slug résultant
  // On s'assure que le slugification ne produit pas un slug vide ou de moins de 3 caractères alphanumériques.
  const alphanumericCount = (
    trimmed.match(/[a-zA-Z0-9àáâäçèéêëìíîïñòóôöùúûüýÿæœÀÁÂÄÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜÝŸÆŒ]/g) || []
  ).length;
  if (alphanumericCount < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le pseudonyme doit contenir au moins 3 lettres ou chiffres.",
    });
  }

  return userService.setUsername(userConnected.id, userConnected.email, trimmed);
});
