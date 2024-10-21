import { serverSupabaseClient } from "#supabase/server";
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs'

export const config = {
    api: {
        bodyParser: false,
    },
};

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    try {
        const form = formidable();

        const { fields, files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
            form.parse(event.node.req, (err, fields: Fields, files: Files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ fields, files });
                }
            });
        });

        const file = files?.image?.[0];
        const fileBuffer = fs.readFileSync(file?.filepath ?? "");
        const fileName = `${Date.now()}_${file?.originalFilename}`;
        const { data, error } = await client.storage
            .from('images')
            .upload(`themes/${fileName}`, fileBuffer, {
                contentType: file?.mimetype ?? "",
            });

        if (error) {
            throw new Error(error.message);
        }
        const publicUrl = client.storage
            .from('images')
            .getPublicUrl(`themes/${fileName}`);

        return {
            success: true,
            url: publicUrl.data.publicUrl,
        };
    } catch (error) {
        const err = error as Error;
        return {
            statusCode: 500,
            body: { success: false, message: err.message },
        };
    }
});