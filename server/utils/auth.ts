import type { H3Event } from "h3";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User as PrismaUser } from "@prisma/client";
import prisma from "~~/server/utils/prisma";

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

/**
 * Récupère l'utilisateur en base et vérifie qu'il est administrateur.
 * Lève une erreur 403 si l'utilisateur n'a pas les droits.
 */
export async function assertAdmin(userId: string): Promise<PrismaUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.admin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Vous n'avez pas les droits pour réaliser cette opération",
    });
  }
  return user;
}

/**
 * Autorise l'accès si la requête fournit la clé API valide (header x-api-key)
 * ou si l'utilisateur connecté est administrateur. Lève une 401 sinon.
 */
export async function assertApiKeyOrAdmin(event: H3Event): Promise<void> {
  const runtimeConfig = useRuntimeConfig();
  const apiKey = event.headers.get("x-api-key");
  if (apiKey === runtimeConfig.apiKey) return;

  const userConnected = event.context.user;
  if (userConnected) {
    const user = await prisma.user.findUnique({ where: { id: userConnected.id } });
    if (user?.admin) return;
  }

  throw createError({
    statusCode: 401,
    statusMessage: "Non autorisé",
  });
}
