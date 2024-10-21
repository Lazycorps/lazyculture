import { serverSupabaseClient } from "#supabase/server";
import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { Theme } from "~/models/theme";

const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
    if (!user?.admin) {
        setResponseStatus(event, 403);
        return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
    }

    const theme = await readBody<Theme>(event);

    try {
        const themePrisma: Prisma.QuestionThemeCreateInput = {
            name: theme.name,
            slug: theme.slug,
            picture: theme.picture,
            createDate: new Date(),
            updateDate: new Date(),
            userCreate: user?.name,
            userUpdate: user?.name,
        };
        return await prisma.questionTheme.create({
            data: themePrisma as Prisma.QuestionThemeCreateInput,
        });
    } catch (error) {
        const err = error as Error;
        setResponseStatus(event, 400);
        return { error: `Erreur lors de la création du thème: Erreur ${err.message}` };
    }
});
