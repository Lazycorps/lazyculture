/** Coût en pièces d'or (coins UserWallet) pour modifier un pseudonyme déjà existant */
export const USERNAME_CHANGE_COST = 500;

export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 16;

/**
 * Caractères autorisés : lettres (y compris accentuées françaises), chiffres,
 * espaces, tirets et underscores.
 */
export const USERNAME_ALLOWED_REGEX =
  /^[a-zA-Z0-9_\-\sàáâäçèéêëìíîïñòóôöùúûüýÿæœÀÁÂÄÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜÝŸÆŒ]+$/;

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  trimmed: string;
}

export function validateUsername(username: unknown): UsernameValidationResult {
  if (typeof username !== "string") {
    return {
      valid: false,
      error: "Le pseudonyme doit être une chaîne de caractères.",
      trimmed: "",
    };
  }

  const trimmed = username.trim();

  // 1. Longueur
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Le pseudonyme doit contenir entre ${USERNAME_MIN_LENGTH} et ${USERNAME_MAX_LENGTH} caractères.`,
      trimmed,
    };
  }

  // 2. Caractères autorisés
  if (!USERNAME_ALLOWED_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Le pseudonyme contient des caractères non autorisés.",
      trimmed,
    };
  }

  // 3. Minimum 3 caractères alphanumériques (évite les slugs composés uniquement de tirets ou d'espaces)
  const alphanumericMatches = trimmed.match(
    /[a-zA-Z0-9àáâäçèéêëìíîïñòóôöùúûüýÿæœÀÁÂÄÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜÝŸÆŒ]/g,
  );
  const alphanumericCount = alphanumericMatches ? alphanumericMatches.length : 0;
  if (alphanumericCount < 3) {
    return {
      valid: false,
      error: "Le pseudonyme doit contenir au moins 3 lettres ou chiffres.",
      trimmed,
    };
  }

  return { valid: true, trimmed };
}
