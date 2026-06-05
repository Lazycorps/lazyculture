import type { SupabaseClient } from "@supabase/supabase-js";

export class PictureService {
  /**
   * Upload une image de thème dans le bucket Supabase "images" et retourne son URL publique.
   * Le parsing multipart et la lecture du fichier restent dans le controller (couche transport).
   */
  async uploadThemeImage(
    client: SupabaseClient,
    fileBuffer: Buffer,
    originalName: string | null | undefined,
    mimetype: string,
  ) {
    const fileName = `${Date.now()}_${originalName}`;
    const { error } = await client.storage.from("images").upload(`themes/${fileName}`, fileBuffer, {
      contentType: mimetype,
    });

    if (error) {
      throw new Error(error.message);
    }

    const publicUrl = client.storage.from("images").getPublicUrl(`themes/${fileName}`);

    return {
      success: true,
      url: publicUrl.data.publicUrl,
    };
  }
}

export const pictureService = new PictureService();
