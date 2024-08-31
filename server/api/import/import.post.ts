import { PrismaClient, Question } from "@prisma/client";
import { OpenQuizzDB } from "~/models/openQuizzDB";
import { QuestionDTO } from "~/models/question";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const body = await readBody<OpenQuizzDB>(event);
  const questions: Question[] = [];
  body.quizz.fr.confirmé.forEach((q) => {
    const question = new QuestionDTO();
    question.data.libelle = q.question;
    question.difficulty = 1;
    let i = 1;
    q.propositions.forEach((p) => {
      question.data.propositions.push({
        id: i++,
        value: p,
      });
    });

    const responseId = question.data.propositions.find(
      (p) => p.value == q.réponse
    )?.id;
    question.data.commentaire = q.anecdote;
    //if (responseId) questions.push(question);
  });

  //prisma.question.createMany(questions);
});
