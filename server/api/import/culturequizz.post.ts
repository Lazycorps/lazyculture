import { Prisma } from "@prisma/client";
import { QuestionDataDTO, QuestionPropositionDTO } from "~/models/question";
import { JSDOM } from "jsdom";
import prisma from "~/lib/prisma";
import { serverSupabaseClient } from "#supabase/server";

type QuizzCultureRequestDTO = {
  url: string;
  themes: string[];
  difficulty: number;
};
const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);
  if (event.headers.get("x-api-key") != runtimeConfig.apiKey) {
    setResponseStatus(event, 401);
    return;
  }

  const request = await readBody<QuizzCultureRequestDTO>(event);
  const questions = await extractQuestionsData(request);
  const questionsToAdd: Prisma.QuestionCreateInput[] = [];

  for (const question of questions) {
    if (question.img) {
      const imageName = crypto.randomUUID();
      question.img = await downloadAndUploadImage(
        supabase,
        question.img,
        imageName
      );
    }
  }

  questions.forEach((q) => {
    const question: Prisma.QuestionCreateInput = {
      difficulty: q.difficulty,
      data: q as any,
      source: "CultureQuizz",
      language: "fr",
      createDate: new Date(),
      updateDate: new Date(),
      userCreate: "IMPORT",
      userUpdate: "IMPORT",
    };
    questionsToAdd.push(question);
  });
  return prisma.question.createManyAndReturn({
    data: questionsToAdd as Prisma.QuestionCreateInput[],
  });
});

// Fonction pour extraire plusieurs questions d'une chaîne HTML
async function extractQuestionsData(
  request: QuizzCultureRequestDTO
): Promise<QuestionDataDTO[]> {
  const response = await fetch(request.url);
  const dom = new JSDOM(await response.text());
  const document = dom.window.document;

  // Trouver tous les éléments de type question
  const questionSlides = document.querySelectorAll(
    ".culturequizz__slide--question"
  );

  const questions: QuestionDataDTO[] = [];

  // Parcourir chaque question trouvée
  questionSlides.forEach((slideElement) => {
    const questionData = new QuestionDataDTO();
    questionData.theme = request.themes;
    questionData.difficulty = request.difficulty;
    // Extraire la question (libelle)
    const questionElement = slideElement.querySelector(
      ".culturequizz__slide__question"
    );
    if (questionElement) {
      questionData.libelle = questionElement.textContent?.trim() || "";
    }

    // Extraire les réponses possibles
    const answers = slideElement.querySelectorAll("label");
    answers.forEach((labelElement, index) => {
      const proposition = new QuestionPropositionDTO();
      proposition.id = index + 1;
      proposition.value = labelElement.textContent?.trim() || "";
      questionData.propositions.push(proposition);
    });

    // Extraire l'ID de la bonne réponse à partir du data-answers
    const correctAnswerIds = slideElement.getAttribute("data-answers") || "[]";
    const correctAnswerIdArray = JSON.parse(correctAnswerIds);

    // Trouver la bonne réponse en fonction de l'ID
    const correctAnswerElement = slideElement.querySelector(
      `input[value="${correctAnswerIdArray[0]}"]`
    );
    if (correctAnswerElement) {
      const correctAnswerIndex = Array.from(
        slideElement.querySelectorAll("input")
      ).indexOf(correctAnswerElement as any);
      questionData.response = correctAnswerIndex + 1;
    }

    // Extraire le commentaire s'il y en a
    const commentaireElement = slideElement.querySelector(".full-response p");
    if (commentaireElement) {
      questionData.commentaire = commentaireElement.textContent?.trim() || "";
    }

    // Télécharger et uploader l'image si elle existe
    const imageElement = slideElement.querySelector(".photo-answer img");
    if (imageElement) {
      const imageUrl = imageElement.getAttribute("src");
      if (imageUrl) {
        questionData.img = imageUrl;
      }
    }
    // Ajouter la question extraite à la liste
    questions.push(questionData);
  });

  return questions;
}

// Fonction pour télécharger et sauvegarder une image sur Supabase
async function downloadAndUploadImage(
  supabase: any,
  imageUrl: string,
  imageName: string
): Promise<string> {
  const response = await fetch(imageUrl);
  const imageBuffer = await response.arrayBuffer();

  // Téléversement de l'image sur Supabase Storage
  const { data, error } = await supabase.storage
    .from("images")
    .upload(`questions/${imageName}`, imageBuffer, {
      contentType: "image/jpeg",
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  return `${runtimeConfig.supabaseUrl.replace(
    /\/$/,
    ""
  )}/storage/v1/object/public/${data.fullPath}`;
}
