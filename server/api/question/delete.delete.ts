import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import { QuestionDataDTO, QuestionDTO, QuestionReportingDTO } from "~/models/question";

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    if (userConnected?.id != "0b652dec-8ef8-4ad3-8218-1567d884c260"
        && userConnected?.id != "36f73582-64c5-4e73-83a0-a0bc1a2295fc"
        && userConnected?.id != "5418a0e7-482f-44b9-89f2-269999a49f6a") {
        setResponseStatus(event, 403);
        return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
    }
    const query = getQuery(event);

    await prisma.question.delete({
        where: {
            id: parseInt(query.id as string, 10)
        },
    });
});
