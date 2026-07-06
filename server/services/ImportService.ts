import { Prisma } from "@prisma/client";
import { JSDOM } from "jsdom";
import prisma from "~~/server/utils/prisma";
import { QuestionDataDTO, QuestionPropositionDTO } from "#shared/question";
import type { OpenQuizzDB, OpenQuizzDBQuestion } from "#shared/openQuizzDB";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuizzCultureRequestDTO = {
  url: string;
  themes: string[];
  difficulty: number;
};

export type QuizzQuipoQuizRequestDTO = {
  body: any;
  themes: string[];
  difficulty: number;
};

export class ImportService {
  async importQuipoQuiz(supabase: SupabaseClient, request: QuizzQuipoQuizRequestDTO) {
    const { body, themes, difficulty } = request;

    let quizEntries: any[] = [];
    if (body.data && Array.isArray(body.data.quizEntries)) {
      quizEntries = body.data.quizEntries;
    } else if (Array.isArray(body.quizEntries)) {
      quizEntries = body.quizEntries;
    } else if (Array.isArray(body)) {
      quizEntries = body;
    } else if (body && typeof body === "object") {
      quizEntries = [body];
    }

    const questionsToInsert: QuestionDataDTO[] = [];
    const duplicates: string[] = [];

    for (const entry of quizEntries) {
      const questions_true_or_false = entry.questions_true_or_false || [];
      for (const q of questions_true_or_false) {
        const libelle = q.question_title?.trim();
        if (!libelle) continue;

        // Check for duplicate in DB (same title, active questions)
        const exists = await prisma.question.findFirst({
          where: {
            deleted: false,
            data: {
              path: ["libelle"],
              equals: libelle,
            },
          },
        });

        if (exists) {
          duplicates.push(libelle);
          continue;
        }

        const questionData = new QuestionDataDTO();
        questionData.type = "boolean";
        questionData.difficulty = difficulty;
        questionData.theme = themes;
        questionData.libelle = libelle;

        // Strip HTML from explanation using JSDOM
        const explanationHtml = q.anwser_explanation || q.answer_explanation || "";
        const dom = new JSDOM(explanationHtml);
        questionData.commentaire = dom.window.document.body.textContent?.trim() || "";

        // Propose Vrai/Faux
        questionData.propositions = [
          { id: 1, value: "Vrai", img: "" },
          { id: 2, value: "Faux", img: "" },
        ];

        // 1 for Vrai (true), 2 for Faux (false)
        questionData.response = q.answer === true ? 1 : 2;

        // Image URL
        if (q.image && q.image.length > 0 && q.image[0].url) {
          questionData.img = q.image[0].url;
        }

        questionsToInsert.push(questionData);
      }
    }

    // Now upload images and persist
    for (const question of questionsToInsert) {
      if (question.img) {
        try {
          const imageName = crypto.randomUUID();
          question.img = await this.downloadAndUploadImage(supabase, question.img, imageName);
        } catch (imageError) {
          console.error(`Failed to upload image for question: ${question.libelle}`, imageError);
          question.img = "";
        }
      }
    }

    const insertedQuestions = await this.persistQuestions(questionsToInsert, "QuipoQuiz");

    return {
      success: true,
      importedCount: insertedQuestions.length,
      duplicateCount: duplicates.length,
      questions: insertedQuestions,
      duplicates,
    };
  }

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
