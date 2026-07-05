import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Storage n'accepte qu'un jeu de caractères restreint dans les clés :
 * on retire les accents et on remplace tout caractère spécial (apostrophes,
 * espaces, etc.) pour éviter les erreurs "Invalid key".
 */
function sanitizeFileName(originalName: string | null | undefined): string {
  const name = originalName || "image";
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext =
    dotIndex > 0
      ? name
          .slice(dotIndex + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  const safeBase =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "image";
  return ext ? `${safeBase}.${ext}` : safeBase;
}

export class PictureService {
  /**
   * Upload une image dans le bucket Supabase "images" sous le préfixe donné et
   * retourne son URL publique. Le parsing multipart et la lecture du fichier
   * restent dans le controller (couche transport).
   */
  async uploadImage(
    client: SupabaseClient,
    fileBuffer: Buffer,
    originalName: string | null | undefined,
    mimetype: string,
    prefix: string,
  ) {
    const fileName = `${Date.now()}_${sanitizeFileName(originalName)}`;
    const path = `${prefix}/${fileName}`;
    const { error } = await client.storage.from("images").upload(path, fileBuffer, {
      contentType: mimetype,
    });

    if (error) {
      throw new Error(error.message);
    }

    const publicUrl = client.storage.from("images").getPublicUrl(path);

    return {
      success: true,
      url: publicUrl.data.publicUrl,
    };
  }

  async uploadThemeImage(
    client: SupabaseClient,
    fileBuffer: Buffer,
    originalName: string | null | undefined,
    mimetype: string,
  ) {
    return this.uploadImage(client, fileBuffer, originalName, mimetype, "themes");
  }

  async uploadAvatarImage(
    client: SupabaseClient,
    fileBuffer: Buffer,
    originalName: string | null | undefined,
    mimetype: string,
  ) {
    return this.uploadImage(client, fileBuffer, originalName, mimetype, "avatars");
  }
}

export const pictureService = new PictureService();
