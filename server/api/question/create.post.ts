import { serverSupabaseClient } from "#supabase/server";
import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { QuestionDTO } from "~/models/question";

const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
    if (!user?.admin) {
        setResponseStatus(event, 403);
        return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
    }

    const question = await readBody<QuestionDTO>(event);

    try {
        const questionPrisma: Prisma.QuestionCreateInput = {
            difficulty: question.difficulty,
            data: question.data as any,
            source: "Maintenance",
            language: "fr",
            createDate: new Date(),
            updateDate: new Date(),
            userCreate: user?.name,
            userUpdate: user?.name,
        };
        const newQuestion = await prisma.question.create({
            data: questionPrisma as Prisma.QuestionCreateInput,
        });

        return { newQuestion };
    } catch (error) {
        const err = error as Error;
        setResponseStatus(event, 400);
        return { error: `Erreur lors de la création de la question: ${err.message}` };
    }
});
