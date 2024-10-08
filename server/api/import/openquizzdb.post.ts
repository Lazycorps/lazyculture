import { Prisma, PrismaClient, Question } from "@prisma/client";
import { OpenQuizzDB, OpenQuizzDBQuestion } from "../../../models/openQuizzDB";
import { QuestionDataDTO } from "../../../models/question";
const config = useRuntimeConfig();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const query = getQuery(event);

  if (event.headers.get("x-api-key") != runtimeConfig.apiKey) {
    setResponseStatus(event, 401);
    return;
  }

  const body = await readBody<OpenQuizzDB>(event);
  const questions: Prisma.QuestionCreateInput[] = [];
  body.quizz.fr.débutant.forEach((q) => {
    const question = GetQuestion(q, 3, "fr", query.theme?.toString());
    if (question) questions.push(question);
  });
  body.quizz.fr.confirmé.forEach((q) => {
    const question = GetQuestion(q, 3, "fr", query.theme?.toString());
    if (question) questions.push(question);
  });
  body.quizz.fr.expert.forEach((q) => {
    const question = GetQuestion(q, 3, "fr", query.theme?.toString());
    if (question) questions.push(question);
  });

  return prisma.question.createManyAndReturn({
    data: questions as Prisma.QuestionCreateInput[],
  });
});

const GetQuestion = (
  question: OpenQuizzDBQuestion,
  difficulty: number,
  language: string,
  theme?: string
): Prisma.QuestionCreateInput | null => {
  const questionData = new QuestionDataDTO();
  questionData.type = "choix";
  let i = 1;
  questionData.libelle = question.question;
  if (theme) questionData.theme = theme.split(",");
  question.propositions.forEach((p) => {
    questionData.propositions.push({
      id: i++,
      value: p,
    });
  });

  const responseId = questionData.propositions.find(
    (p) => p.value == question.réponse
  )?.id;

  if (!responseId) return null;
  questionData.commentaire = question.anecdote;
  questionData.response = responseId ?? 0;

  return {
    difficulty,
    data: questionData as any,
    source: "OpenQuizzDB",
    language,
    createDate: new Date(),
    updateDate: new Date(),
    userCreate: "IMPORT",
    userUpdate: "IMPORT",
  };
};
