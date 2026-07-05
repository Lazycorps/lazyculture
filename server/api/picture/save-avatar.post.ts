import { serverSupabaseClient } from "#supabase/server";
import formidable from "formidable";
import type { Fields, Files } from "formidable";
import fs from "fs";
import { pictureService } from "~~/server/services/PictureService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIMETYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mo

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const client = await serverSupabaseClient(event);
  const form = formidable({ maxFileSize: MAX_FILE_SIZE });

  const { files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    form.parse(event.node.req, (err, fields: Fields, files: Files) => {
      if (err) {
        reject(
          createError({
            statusCode: 400,
            statusMessage: "Fichier invalide ou trop lourd (2 Mo max).",
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
    throw createError({ statusCode: 400, statusMessage: "Format d'image non supporté." });
  }

  const fileBuffer = fs.readFileSync(file.filepath);
  return await pictureService.uploadAvatarImage(
    client,
    fileBuffer,
    file.originalFilename,
    file.mimetype,
  );
});
