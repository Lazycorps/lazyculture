import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";
import { QuestionDataDTO } from "~/models/question";

// export default defineEventHandler(async (event) => {
//     const client = await serverSupabaseClient(event);
//     const userConnected = (await client.auth.getUser())?.data?.user;
//     const questions = await prisma.question.findMany();
//     const questionsWithThemes = [];

//     for (const question of questions) {
//         const questionData = question.data as any as QuestionDataDTO;
//         const questionThemes = questionData.theme;
//         const themes = await prisma.questionTheme.findMany({
//             where: { slug: { in: questionThemes } },
//         });

//         questionsWithThemes.push({
//             ...question,
//             themes: themes.map((t) => t.name), // Extraire uniquement les noms des thèmes
//         });
//     }

//     return questionsWithThemes;
// });

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient(event);
    const userConnected = (await client.auth.getUser())?.data?.user;
    return await prisma.question.findMany();
});
