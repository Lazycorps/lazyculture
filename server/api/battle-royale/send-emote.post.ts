import { getAuthenticatedUser } from "~~/server/utils/auth";
import { battleRoyaleManager } from "~~/server/utils/battleRoyaleManager";

const ALLOWED_EMOTES = ["👍", "👎", "😂", "😢", "😮", "😡", "😎", "🤫"];

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event).catch(() => ({}));

  const matchId = body?.matchId as string;
  const emote = body?.emote as string;

  if (!matchId || !emote) {
    throw createError({
      statusCode: 400,
      statusMessage: "Les paramètres matchId et emote sont requis.",
    });
  }

  // Validation de l'emote
  if (!ALLOWED_EMOTES.includes(emote)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cette réaction n'est pas autorisée.",
    });
  }

  const result = battleRoyaleManager.sendEmote(matchId, userConnected.id, emote);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.message,
    });
  }

  return result;
});
