import { Prisma } from "@prisma/client";
import { JSDOM } from "jsdom";
import prisma from "~/lib/prisma";
import { QuestionDataDTO, QuestionPropositionDTO } from "~/models/question";
import type { OpenQuizzDB, OpenQuizzDBQuestion } from "~/models/openQuizzDB";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuizzCultureRequestDTO = {
  url: string;
  themes: string[];
  difficulty: number;
};

export class ImportService {
  async importCultureQuizz(supabase: SupabaseClient, request: QuizzCultureRequestDTO) {
    const questions = await this.extractQuestionsData(request);

    for (const question of questions) {
      if (question.img) {
        const imageName = crypto.randomUUID();
        question.img = await this.downloadAndUploadImage(supabase, question.img, imageName);
      }
    }

    return this.persistQuestions(questions, "CultureQuizz");
  }

  importOpenQuizzDB(body: OpenQuizzDB, theme?: string) {
    const questions: Prisma.QuestionCreateInput[] = [];
    body.quizz.fr.débutant.forEach((q) => {
      const question = this.buildOpenQuizzQuestion(q, 3, "fr", theme);
      if (question) questions.push(question);
    });
    body.quizz.fr.confirmé.forEach((q) => {
      const question = this.buildOpenQuizzQuestion(q, 3, "fr", theme);
      if (question) questions.push(question);
    });
    body.quizz.fr.expert.forEach((q) => {
      const question = this.buildOpenQuizzQuestion(q, 3, "fr", theme);
      if (question) questions.push(question);
    });

    return prisma.question.createManyAndReturn({
      data: questions as Prisma.QuestionCreateInput[],
    });
  }

  importChatGpt(questions: QuestionDataDTO[]) {
    return this.persistQuestions(questions, "ChatGpt");
  }

  importQuestions(questions: QuestionDataDTO[]) {
    return this.persistQuestions(questions, "ImportQuestions");
  }

  /** Transforme des QuestionDataDTO en questions et les insère en base. */
  private persistQuestions(questions: QuestionDataDTO[], source: string) {
    const questionsToAdd: Prisma.QuestionCreateInput[] = [];
    questions.forEach((q) => {
      const question: Prisma.QuestionCreateInput = {
        difficulty: q.difficulty,
        data: q as any,
        source,
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
  }

  // Extraction de plusieurs questions depuis une page HTML CultureQuizz
  private async extractQuestionsData(request: QuizzCultureRequestDTO): Promise<QuestionDataDTO[]> {
    const response = await fetch(request.url);
    const dom = new JSDOM(await response.text());
    const document = dom.window.document;

    // Trouver tous les éléments de type question
    const questionSlides = document.querySelectorAll(".culturequizz__slide--question");

    const questions: QuestionDataDTO[] = [];

    // Parcourir chaque question trouvée
    questionSlides.forEach((slideElement) => {
      const questionData = new QuestionDataDTO();
      questionData.theme = request.themes;
      questionData.difficulty = request.difficulty;
      // Extraire la question (libelle)
      const questionElement = slideElement.querySelector(".culturequizz__slide__question");
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
        `input[value="${correctAnswerIdArray[0]}"]`,
      );
      if (correctAnswerElement) {
        const correctAnswerIndex = Array.from(slideElement.querySelectorAll("input")).indexOf(
          correctAnswerElement as any,
        );
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

  // Télécharge une image depuis une URL et la sauvegarde sur Supabase Storage
  private async downloadAndUploadImage(
    supabase: SupabaseClient,
    imageUrl: string,
    imageName: string,
  ): Promise<string> {
    const config = useRuntimeConfig();
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("images")
      .upload(`questions/${imageName}`, imageBuffer, {
        contentType: "image/jpeg",
      });

    if (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }

    return `${config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${data!.fullPath}`;
  }

  private buildOpenQuizzQuestion(
    question: OpenQuizzDBQuestion,
    difficulty: number,
    language: string,
    theme?: string,
  ): Prisma.QuestionCreateInput | null {
    const questionData = new QuestionDataDTO();
    questionData.type = "choix";
    let i = 1;
    questionData.libelle = question.question;
    if (theme) questionData.theme = theme.split(",");
    question.propositions.forEach((p) => {
      questionData.propositions.push({
        id: i++,
        value: p,
        img: "",
      });
    });

    const responseId = questionData.propositions.find((p) => p.value == question.réponse)?.id;

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
  }
}

export const importService = new ImportService();
