import type { H3Event } from "h3";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Récupère l'utilisateur authentifié depuis le contexte de l'événement
 * L'utilisateur est stocké par le middleware d'authentification
 */
export function getAuthenticatedUser(event: H3Event): User {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Non autorisé",
    });
  }
  return user;
}

/**
 * Récupère le client Supabase depuis le contexte de l'événement
 * Le client est stocké par le middleware d'authentification
 */
export function getSupabaseClient(event: H3Event): SupabaseClient {
  const client = event.context.supabaseClient;
  if (!client) {
    throw createError({
      statusCode: 500,
      statusMessage: "Client Supabase non disponible",
    });
  }
  return client;
}
