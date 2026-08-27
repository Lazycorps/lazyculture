import { serverSupabaseClient } from "#supabase/server";
import formidable from "formidable";
import type { Fields, Files } from "formidable";
import fs from "fs";
import { pictureService } from "~~/server/services/PictureService";
import { getAuthenticatedUser } from "~~/server/utils/auth";
import prisma from "~~/server/utils/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIMETYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 Mo

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  // Vérifier que l'utilisateur est admin ou au moins niveau 5
  const user = await prisma.user.findUnique({
    where: { id: userConnected.id },
    include: { UserProgress: { select: { levelId: true } } },
  });

  if (!user?.admin && (user?.UserProgress?.levelId ?? 1) < 5) {
    throw createError({
      statusCode: 403,
      statusMessage: "Niveau 5 requis pour téléverser des images de question.",
    });
  }

  const client = await serverSupabaseClient(event);
  const form = formidable({ maxFileSize: MAX_FILE_SIZE });

  const { files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    form.parse(event.node.req, (err, fields: Fields, files: Files) => {
      if (err) {
        reject(
          createError({
            statusCode: 400,
            statusMessage: "Fichier invalide ou trop lourd (3 Mo max).",
          }),
        );
      } else {
        resolve({ fields, files });
      }
    });
  });

  const file = files?.image?.[0];
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: "Aucune image fournie." });
  }
  if (!file.mimetype || !ALLOWED_MIMETYPES.includes(file.mimetype)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Format d'image non supporté (PNG, JPEG, WEBP, GIF, SVG).",
    });
  }

  const fileBuffer = fs.readFileSync(file.filepath);
  return await pictureService.uploadQuestionImage(
    client,
    fileBuffer,
    file.originalFilename,
    file.mimetype,
  );
});
