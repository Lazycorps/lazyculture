import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import { QuestionDTO } from "~/models/question";

const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    if (userConnected?.id != "0b652dec-8ef8-4ad3-8218-1567d884c260"
        && userConnected?.id != "36f73582-64c5-4e73-83a0-a0bc1a2295fc"
        && userConnected?.id != "5418a0e7-482f-44b9-89f2-269999a49f6a") {
        setResponseStatus(event, 403);
        return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
    }
    const question = await readBody<QuestionDTO>(event);

    try {
        const updatedQuestion = await prisma.question.update({
            where: { id: question.id },
            data: {
                difficulty: question.difficulty,
                data: {
                    libelle: question.data.libelle,
                    theme: question.data.theme,
                    commentaire: question.data.commentaire,
                    response: question.data.response,
                    img: question.data.img,
                    propositions: question.data.propositions.map((prop) => ({
                        id: prop.id,
                        value: prop.value,
                    })),
                },
                source: question.source,
                updateDate: new Date(),
                userUpdate: question.userUpdate,
                Reporting: {
                    update: question.reportings.map((reporting) => ({
                        where: { id: reporting.id },
                        data: {
                            closed: reporting.closed
                        },
                    })),
                },
            },
        });

        return { updatedQuestion };
    } catch (error) {
        setResponseStatus(event, 400);
        return { error: 'Erreur lors de la mise à jour de la question.' };
    }
});
