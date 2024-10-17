import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import { QuestionDTO } from "~/models/question";

const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    
    // Vérification des droits d'accès
    if (userConnected?.id != "0b652dec-8ef8-4ad3-8218-1567d884c260"
        && userConnected?.id != "36f73582-64c5-4e73-83a0-a0bc1a2295fc"
        && userConnected?.id != "5418a0e7-482f-44b9-89f2-269999a49f6a") {
        setResponseStatus(event, 403);
        return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
    }

    const question = await readBody<QuestionDTO>(event);

    try {
        // Création de la nouvelle question
        const newQuestion = await prisma.question.create({
            data: {
                difficulty: 3,
                language: 'fr',
                source: 'Maintenance',
                createDate: new Date(),
                updateDate: new Date(),
                userCreate: userConnected.id,
                userUpdate: userConnected.id,
                data: {
                    type: "choix",
                    theme: question.data.theme.length > 0 ? question.data.theme : ["culture_generale"],
                    libelle: question.data.libelle,
                    response: question.data.response,
                    difficulty:3,
                    commentaire: question.data.commentaire,
                    img: question.data.img,
                    propositions: question.data.propositions.map((prop) => ({
                        id: prop.id,
                        value: prop.value,
                    })),
                },
            },
        });

        return { newQuestion };
    } catch (error) {
        setResponseStatus(event, 400);
        return { error: 'Erreur lors de la création de la question.' };
    }
});
