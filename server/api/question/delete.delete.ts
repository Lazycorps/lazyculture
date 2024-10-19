import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import { QuestionDataDTO, QuestionDTO, QuestionReportingDTO } from "~/models/question";

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
    if (!user?.admin) {
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
