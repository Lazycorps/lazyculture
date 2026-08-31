import { createError } from "h3";
import prisma from "../utils/prisma";
import type {
  BulkImportResultDTO,
  BulkImportRowResultDTO,
  BulkSubmissionRowPayload,
  ContributorTrustScoreDTO,
  ContributorTrustTier,
  CreateSubmissionPayload,
  QuestionSubmissionDTO,
  ReviewQuestionDTO,
  ReviewRevealDTO,
  SubmissionStatus,
  SubmissionVoteType,
} from "../../shared/DTO/questionSubmissionDTO";
import type { QuestionDataDTO } from "../../shared/question";
import {
  INVALID_IMAGE_URL_ERROR,
  SUBMISSION_CSV_DEFAULT_DIFFICULTY,
  SUBMISSION_CSV_MAX_ROWS,
  isValidImageUrl,
  normalizeLibelle,
} from "../../shared/community/submissionCsvTemplate";
import {
  COMMENTAIRE_MAX_LENGTH,
  IMG_MAX_LENGTH,
  LIBELLE_MAX_LENGTH,
  LIBELLE_MIN_LENGTH,
  PROPOSITION_COUNT,
  PROPOSITION_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
} from "../../shared/community/questionContentRules";
import { sendPushToUser } from "../utils/pushNotification";

/**
 * Lit un champ potentiellement non textuel envoyé par un client.
 * Le corps de requête n'étant pas typé à l'exécution, appeler .trim() directement dessus
 * ferait planter toute la requête au lieu de rejeter la seule ligne fautive.
 */
function readTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const SUBMISSION_MIN_LEVEL = 5;
export const REVIEW_MIN_LEVEL = 3;
export const APPROVAL_THRESHOLD = 3;

export class QuestionSubmissionService {
  /**
   * Calcule le score et le niveau de confiance d'un contributeur.
   * Retourne null si l'utilisateur n'a jamais soumis de question.
   */
  async getContributorTrustScore(userId: string): Promise<ContributorTrustScoreDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!user) return null;

    const submissions = await prisma.questionSubmission.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        createdQuestionId: true,
        deleted: true,
        rejectionCount: true,
      },
    });

    if (submissions.length === 0) {
      return null;
    }

    const totalSubmitted = submissions.length;
    const totalApproved = submissions.filter((s) => s.status === "APPROVED").length;
    const totalRejected = submissions.filter((s) => s.status === "REJECTED").length;
    const totalPending = submissions.filter((s) => s.status === "PENDING" && !s.deleted).length;

    // Suppression logique : les soumissions supprimées par l'auteur qui avaient déjà reçu des rejets/votes contre
    // restent prises en compte dans le calcul de la réputation pour éviter les contournements.
    const deletedWithRejections = submissions.filter(
      (s) => s.deleted && s.status === "PENDING" && s.rejectionCount > 0,
    ).length;

    const effectiveRejected = totalRejected + deletedWithRejections;
    const decided = totalApproved + effectiveRejected;
    const approvalRate = decided > 0 ? Math.round((totalApproved / decided) * 100) : 100;

    let trustTier: ContributorTrustTier = "NEWBIE";
    let tierLabel = "Nouveau Rédacteur";
    let tierBadgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/30";

    if (decided <= 2) {
      trustTier = "NEWBIE";
      tierLabel = "Nouveau Rédacteur";
      tierBadgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/30";
    } else if (totalApproved >= 10 && approvalRate >= 90) {
      trustTier = "ELITE";
      tierLabel = "Maître Rédacteur";
      tierBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    } else if (totalApproved >= 3 && approvalRate >= 75) {
      trustTier = "RELIABLE";
      tierLabel = "Rédacteur Fiable";
      tierBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else {
      trustTier = "WATCH";
      tierLabel = "En Apprentissage";
      tierBadgeColor = "bg-orange-500/20 text-orange-300 border-orange-500/30";
    }

    // Calcul des redevances totales générées par ses questions approuvées
    const approvedQuestionIds = submissions
      .map((s) => s.createdQuestionId)
      .filter((id): id is number => id !== null && id !== undefined);

    let totalRoyaltiesEarned = 0;
    if (approvedQuestionIds.length > 0) {
      // 1 PO par réponse donnée par un autre joueur
      totalRoyaltiesEarned = await prisma.questionResponse.count({
        where: {
          questionId: { in: approvedQuestionIds },
          userId: { not: userId },
        },
      });
    }

    return {
      userId: user.id,
      userName: user.name || "Joueur",
      userSlug: user.slug,
      totalSubmitted,
      totalApproved,
      totalRejected,
      totalPending,
      approvalRate,
      trustTier,
      tierLabel,
      tierBadgeColor,
      totalRoyaltiesEarned,
    };
  }

  /**
   * Vérifie que l'utilisateur existe et possède le niveau requis pour proposer une question.
   * Extrait de createSubmission pour que l'import en lot ne contrôle le niveau qu'une seule fois.
   */
  private async assertCanSubmit(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserProgress: { select: { levelId: true } },
      },
    });

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "Utilisateur non trouvé." });
    }

    const userLevel = user.UserProgress?.levelId ?? 1;
    if (userLevel < SUBMISSION_MIN_LEVEL) {
      throw createError({
        statusCode: 403,
        statusMessage: `Vous devez être au moins Niveau ${SUBMISSION_MIN_LEVEL} pour proposer une question. (Niveau actuel : ${userLevel})`,
      });
    }

    return user;
  }

  /**
   * Valide le contenu d'une soumission et construit son QuestionDataDTO.
   * Retourne l'erreur au lieu de la lever : l'import en lot a besoin de collecter les erreurs
   * ligne par ligne au lieu de s'arrêter à la première.
   */
  private buildQuestionData(
    payload: CreateSubmissionPayload,
  ):
    | { data: QuestionDataDTO; themes: string[]; difficulty: number; source: string | null }
    | { error: string } {
    // Le contenu part dans une colonne Json, qu'aucun schéma ne contraint : chaque champ est
    // donc vérifié en type ET en longueur avant d'être écrit.
    if (typeof payload.libelle !== "string") {
      return { error: "L'intitulé de la question est invalide." };
    }
    const libelle = payload.libelle.trim();
    if (libelle.length < LIBELLE_MIN_LENGTH || libelle.length > LIBELLE_MAX_LENGTH) {
      return {
        error: `L'intitulé de la question doit comporter entre ${LIBELLE_MIN_LENGTH} et ${LIBELLE_MAX_LENGTH} caractères.`,
      };
    }

    if (!Array.isArray(payload.propositions) || payload.propositions.length !== PROPOSITION_COUNT) {
      return {
        error: `La question doit comporter exactement ${PROPOSITION_COUNT} propositions de réponse.`,
      };
    }

    const propositions: QuestionDataDTO["propositions"] = [];
    const seenIds = new Set<number>();
    for (let i = 0; i < payload.propositions.length; i++) {
      const p = payload.propositions[i];
      if (!p || typeof p.value !== "string" || p.value.trim().length === 0) {
        return { error: `La proposition n°${i + 1} ne peut pas être vide.` };
      }
      const value = p.value.trim();
      if (value.length > PROPOSITION_MAX_LENGTH) {
        return {
          error: `La proposition n°${i + 1} dépasse ${PROPOSITION_MAX_LENGTH} caractères.`,
        };
      }
      // Sans identifiant entier et unique, la bonne réponse ne peut plus être retrouvée
      // au moment de jouer la question (voir isCorrectAnswer).
      if (!Number.isInteger(p.id) || seenIds.has(p.id)) {
        return { error: `L'identifiant de la proposition n°${i + 1} est invalide.` };
      }
      seenIds.add(p.id);
      propositions.push({ id: p.id, value, img: "" });
    }

    if (!Number.isInteger(payload.response) || !seenIds.has(payload.response)) {
      return { error: "La bonne réponse sélectionnée est invalide." };
    }

    const themes =
      Array.isArray(payload.themes) && payload.themes.length > 0
        ? payload.themes.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)
        : [];
    if (themes.length === 0) themes.push("culture_generale");

    const difficulty = Math.min(Math.max(Number(payload.difficulty) || 1, 1), 5);

    const img = typeof payload.img === "string" ? payload.img.trim() : "";
    if (img.length > IMG_MAX_LENGTH) {
      return { error: `L'adresse de l'image dépasse ${IMG_MAX_LENGTH} caractères.` };
    }

    const commentaire = typeof payload.commentaire === "string" ? payload.commentaire.trim() : "";
    if (commentaire.length > COMMENTAIRE_MAX_LENGTH) {
      return { error: `Le commentaire dépasse ${COMMENTAIRE_MAX_LENGTH} caractères.` };
    }

    const source = typeof payload.source === "string" ? payload.source.trim() : "";
    if (source.length > SOURCE_MAX_LENGTH) {
      return { error: `La source dépasse ${SOURCE_MAX_LENGTH} caractères.` };
    }

    const data: QuestionDataDTO = {
      type: "choix",
      difficulty,
      theme: themes,
      libelle,
      img,
      response: payload.response,
      propositions,
      commentaire,
      commentaireImg: "",
    };

    return { data, themes, difficulty, source: source || null };
  }

  /**
   * Crée une nouvelle soumission de question (requiert Niveau >= 5).
   */
  async createSubmission(
    userId: string,
    payload: CreateSubmissionPayload,
  ): Promise<QuestionSubmissionDTO> {
    const user = await this.assertCanSubmit(userId);

    const built = this.buildQuestionData(payload);
    if ("error" in built) {
      throw createError({ statusCode: 400, statusMessage: built.error });
    }
    const { data: questionData, themes, difficulty, source } = built;

    const submission = await prisma.questionSubmission.create({
      data: {
        userId,
        data: questionData as any,
        themes,
        difficulty,
        source,
        status: "PENDING",
      },
    });

    const authorTrust = await this.getContributorTrustScore(userId);

    return {
      id: submission.id,
      userId: submission.userId,
      userName: user.name,
      userSlug: user.slug,
      data: questionData,
      themes: submission.themes,
      difficulty: submission.difficulty,
      source: submission.source,
      status: submission.status as SubmissionStatus,
      approvalCount: submission.approvalCount,
      rejectionCount: submission.rejectionCount,
      rejectionReason: submission.rejectionReason,
      deleted: submission.deleted,
      deletedAt: submission.deletedAt,
      createdQuestionId: submission.createdQuestionId,
      createDate: submission.createDate,
      updateDate: submission.updateDate,
      authorTrust,
      answersReceivedCount: 0,
      royaltiesEarned: 0,
    };
  }

  /**
   * Import en lot depuis un fichier CSV.
   * Le thème et la difficulté ne proviennent jamais du fichier : le thème est celui choisi dans
   * l'interface (validé ici) et la difficulté est imposée à SUBMISSION_CSV_DEFAULT_DIFFICULTY.
   * Les lignes invalides sont rejetées individuellement, sans interrompre l'import des autres.
   */
  async createSubmissionsBulk(
    userId: string,
    themeSlug: string,
    rows: BulkSubmissionRowPayload[],
  ): Promise<BulkImportResultDTO> {
    await this.assertCanSubmit(userId);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw createError({ statusCode: 400, statusMessage: "Aucune question à importer." });
    }

    if (rows.length > SUBMISSION_CSV_MAX_ROWS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Vous ne pouvez pas importer plus de ${SUBMISSION_CSV_MAX_ROWS} questions à la fois. (${rows.length} reçues)`,
      });
    }

    const theme = await prisma.questionTheme.findFirst({ where: { slug: themeSlug } });
    if (!theme) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le thème sélectionné est introuvable.",
      });
    }

    // Doublons déjà en base : une seule requête pour l'ensemble des libellés du fichier.
    // Un libellé non textuel n'est pas rejeté ici : buildQuestionData s'en charge ligne par ligne.
    const libelles = rows.map((row) => readTrimmed(row?.libelle)).filter(Boolean);
    const existingLibelles = await this.findExistingLibelles(libelles);

    const seenInFile = new Set<string>();
    const results: BulkImportRowResultDTO[] = [];
    const toCreate: {
      row: BulkSubmissionRowPayload;
      data: QuestionDataDTO;
      source: string | null;
    }[] = [];

    for (const row of rows) {
      const line = Number(row?.line) || 0;
      const libelle = readTrimmed(row?.libelle);

      // Règle du gabarit revalidée ici : sans ce contrôle, un appel direct à l'API
      // contournerait la validation faite à la prévisualisation.
      if (!isValidImageUrl(row?.img)) {
        results.push({ line, libelle, status: "REJECTED", error: INVALID_IMAGE_URL_ERROR });
        continue;
      }

      const built = this.buildQuestionData({
        libelle,
        propositions: row?.propositions ?? [],
        response: row?.response,
        img: row?.img,
        commentaire: row?.commentaire,
        source: row?.source,
        // Imposés par le serveur : ce que le client a pu envoyer est ignoré.
        themes: [theme.slug],
        difficulty: SUBMISSION_CSV_DEFAULT_DIFFICULTY,
      });

      if ("error" in built) {
        results.push({ line, libelle, status: "REJECTED", error: built.error });
        continue;
      }

      const normalized = normalizeLibelle(libelle);
      if (seenInFile.has(normalized)) {
        results.push({
          line,
          libelle,
          status: "REJECTED",
          error: "Cette question est présente en double dans le fichier.",
        });
        continue;
      }
      if (existingLibelles.has(normalized)) {
        results.push({
          line,
          libelle,
          status: "REJECTED",
          error: "Une question identique existe déjà ou est en cours de relecture.",
        });
        continue;
      }

      seenInFile.add(normalized);
      toCreate.push({ row, data: built.data, source: built.source });
    }

    if (toCreate.length > 0) {
      const created = await prisma.questionSubmission.createManyAndReturn({
        data: toCreate.map(({ data, source }) => ({
          userId,
          data: data as any,
          themes: [theme.slug],
          difficulty: SUBMISSION_CSV_DEFAULT_DIFFICULTY,
          source,
          status: "PENDING",
        })),
      });

      created.forEach((submission, index) => {
        const origin = toCreate[index];
        if (!origin) return;
        results.push({
          line: Number(origin.row?.line) || 0,
          libelle: origin.data.libelle,
          status: "CREATED",
          submissionId: submission.id,
        });
      });
    }

    results.sort((a, b) => a.line - b.line);

    return {
      importedCount: results.filter((r) => r.status === "CREATED").length,
      rejectedCount: results.filter((r) => r.status === "REJECTED").length,
      rows: results,
    };
  }

  /**
   * Renvoie l'ensemble des libellés (normalisés) déjà présents parmi les questions officielles
   * ou les soumissions en cours de relecture.
   */
  private async findExistingLibelles(libelles: string[]): Promise<Set<string>> {
    if (libelles.length === 0) return new Set();

    const orFilters = libelles.map((libelle) => ({
      data: { path: ["libelle"], equals: libelle },
    }));

    const [questions, submissions] = await Promise.all([
      prisma.question.findMany({
        where: { deleted: false, OR: orFilters as any },
        select: { data: true },
      }),
      prisma.questionSubmission.findMany({
        where: { deleted: false, status: "PENDING", OR: orFilters as any },
        select: { data: true },
      }),
    ]);

    const found = new Set<string>();
    for (const record of [...questions, ...submissions]) {
      const libelle = (record.data as any)?.libelle;
      if (typeof libelle === "string") found.add(normalizeLibelle(libelle));
    }
    return found;
  }

  /**
   * Récupère la liste des soumissions de l'utilisateur avec statistiques et redevances.
   */
  async getMySubmissions(userId: string): Promise<{
    submissions: QuestionSubmissionDTO[];
    authorTrust: ContributorTrustScoreDTO | null;
  }> {
    const [submissions, authorTrust, user] = await Promise.all([
      prisma.questionSubmission.findMany({
        where: { userId, deleted: false },
        include: {
          votes: {
            where: { vote: "REJECT" },
            select: { rejectionReason: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createDate: "desc" },
      }),
      this.getContributorTrustScore(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, slug: true },
      }),
    ]);

    const approvedQuestionIds = submissions
      .map((s) => s.createdQuestionId)
      .filter((id): id is number => id !== null && id !== undefined);

    let answersCountMap = new Map<number, number>();
    if (approvedQuestionIds.length > 0) {
      const responseCounts = await prisma.questionResponse.groupBy({
        by: ["questionId"],
        where: {
          questionId: { in: approvedQuestionIds },
          userId: { not: userId },
        },
        _count: {
          id: true,
        },
      });

      for (const rc of responseCounts) {
        answersCountMap.set(rc.questionId, rc._count.id);
      }
    }

    const dtoList: QuestionSubmissionDTO[] = submissions.map((sub) => {
      const questionId = sub.createdQuestionId;
      const royalties = questionId ? (answersCountMap.get(questionId) ?? 0) : 0;

      const rejectionComments = (sub.votes || [])
        .filter((v) => v.rejectionReason && v.rejectionReason.trim().length > 0)
        .map((v) => ({
          reason: v.rejectionReason!,
          createdAt: v.createdAt,
        }));

      return {
        id: sub.id,
        userId: sub.userId,
        userName: user?.name,
        userSlug: user?.slug,
        data: sub.data as any as QuestionDataDTO,
        themes: sub.themes,
        difficulty: sub.difficulty,
        source: sub.source,
        status: sub.status as SubmissionStatus,
        approvalCount: sub.approvalCount,
        rejectionCount: sub.rejectionCount,
        rejectionReason: sub.rejectionReason,
        rejectionComments,
        createdQuestionId: sub.createdQuestionId,
        createDate: sub.createDate,
        updateDate: sub.updateDate,
        answersReceivedCount: royalties,
        royaltiesEarned: royalties,
      };
    });

    return {
      submissions: dtoList,
      authorTrust,
    };
  }

  /**
   * Sélectionne la prochaine question à relire pour un relecteur (requiert Niveau >= 3, sauf Admin).
   * Priorise les auteurs à haut score de confiance tout en garantissant l'équité.
   * Si l'utilisateur est admin, il peut également relire ses propres questions.
   */
  async getNextForReview(reviewerUserId: string): Promise<ReviewQuestionDTO | null> {
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerUserId },
      include: {
        UserProgress: { select: { levelId: true } },
      },
    });

    if (!reviewer) {
      throw createError({ statusCode: 404, statusMessage: "Utilisateur non trouvé." });
    }
    const reviewerLevel = reviewer.UserProgress?.levelId ?? 1;
    if (!reviewer.admin && reviewerLevel < REVIEW_MIN_LEVEL) {
      throw createError({
        statusCode: 403,
        statusMessage: `Vous devez être au moins Niveau ${REVIEW_MIN_LEVEL} pour relire des questions. (Niveau actuel : ${reviewerLevel})`,
      });
    }

    // Récupérer les soumissions PENDING non supprimées que le relecteur n'a pas encore votées
    const whereClause: any = {
      status: "PENDING",
      deleted: false,
      votes: {
        none: {
          userId: reviewerUserId,
        },
      },
    };

    // Si l'utilisateur n'est pas admin, il ne peut pas relire ses propres questions
    if (!reviewer.admin) {
      whereClause.userId = { not: reviewerUserId };
    }

    const pendingSubmissions = await prisma.questionSubmission.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      take: 20,
    });

    if (pendingSubmissions.length === 0) {
      return null;
    }

    // Récupérer les scores de confiance des auteurs pour prioriser les meilleurs contributeurs
    const authorIds = Array.from(new Set(pendingSubmissions.map((s) => s.userId)));
    const trustScores = await Promise.all(
      authorIds.map((aid) => this.getContributorTrustScore(aid)),
    );
    const trustScoreMap = new Map<string, ContributorTrustScoreDTO | null>();
    authorIds.forEach((aid, idx) => {
      trustScoreMap.set(aid, trustScores[idx] ?? null);
    });

    const tierRankValue: Record<ContributorTrustTier, number> = {
      ELITE: 4,
      RELIABLE: 3,
      NEWBIE: 2,
      WATCH: 1,
    };

    // Trier les questions : Tier le plus élevé en premier, puis date de création croissante
    const sorted = [...pendingSubmissions].sort((a, b) => {
      const trustA = trustScoreMap.get(a.userId);
      const trustB = trustScoreMap.get(b.userId);
      const rankA = trustA ? tierRankValue[trustA.trustTier] : 2;
      const rankB = trustB ? tierRankValue[trustB.trustTier] : 2;

      if (rankB !== rankA) {
        return rankB - rankA;
      }
      return a.createDate.getTime() - b.createDate.getTime();
    });

    const chosen = sorted[0];
    if (!chosen) {
      return null;
    }
    const data = chosen.data as any as QuestionDataDTO;
    const authorTrust = trustScoreMap.get(chosen.userId) ?? null;

    // Retourner en aveugle : pas de champ response, pas de commentaire ni de source
    return {
      submissionId: chosen.id,
      libelle: data.libelle,
      propositions: data.propositions.map((p) => ({
        id: p.id,
        value: p.value,
        img: p.img || "",
      })),
      themes: chosen.themes,
      difficulty: chosen.difficulty,
      img: data.img || null,
      authorName: chosen.user.name || "Joueur",
      authorSlug: chosen.user.slug,
      authorTrust,
    };
  }

  /**
   * Retourne le nombre de questions en attente de relecture pour l'utilisateur.
   */
  async getPendingReviewCount(reviewerUserId?: string): Promise<number> {
    if (!reviewerUserId) {
      return prisma.questionSubmission.count({
        where: {
          status: "PENDING",
          deleted: false,
        },
      });
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { admin: true },
    });

    const whereClause: any = {
      status: "PENDING",
      deleted: false,
      votes: {
        none: {
          userId: reviewerUserId,
        },
      },
    };

    if (!reviewer?.admin) {
      whereClause.userId = { not: reviewerUserId };
    }

    return prisma.questionSubmission.count({
      where: whereClause,
    });
  }

  /**
   * Retourne les statistiques de relecture :
   * - pendingCount : questions à relire pour l'utilisateur
   * - validatedCount : total des questions validées par la communauté
   */
  async getReviewStats(reviewerUserId?: string): Promise<{
    pendingCount: number;
    validatedCount: number;
  }> {
    const [pendingCount, validatedCount] = await Promise.all([
      this.getPendingReviewCount(reviewerUserId),
      prisma.questionSubmission.count({
        where: {
          status: "APPROVED",
        },
      }),
    ]);

    return {
      pendingCount,
      validatedCount,
    };
  }

  /**
   * Révèle la correction et les explications après que le relecteur a soumis sa réponse de test.
   */
  async revealForReview(
    reviewerUserId: string,
    submissionId: number,
    userResponseId: number,
  ): Promise<ReviewRevealDTO> {
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerUserId },
      include: { UserProgress: { select: { levelId: true } } },
    });

    if (
      !reviewer ||
      (!reviewer.admin && (reviewer.UserProgress?.levelId ?? 1) < REVIEW_MIN_LEVEL)
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: `Niveau ${REVIEW_MIN_LEVEL} requis pour la relecture.`,
      });
    }

    const submission = await prisma.questionSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.deleted) {
      throw createError({ statusCode: 404, statusMessage: "Question introuvable ou supprimée." });
    }

    const data = submission.data as any as QuestionDataDTO;
    const isCorrect = data.response === userResponseId;

    return {
      submissionId: submission.id,
      isCorrect,
      userResponseId,
      correctResponseId: data.response,
      commentaire: data.commentaire || "",
      commentaireImg: data.commentaireImg || "",
      source: submission.source || null,
    };
  }

  /**
   * Enregistre le vote du relecteur.
   * Si 3 votes positifs sont atteints, la question est promue en Question officielle.
   */
  async submitReviewVote(
    reviewerUserId: string,
    submissionId: number,
    vote: SubmissionVoteType,
    rejectionReason?: string,
  ): Promise<{
    voteRegistered: boolean;
    promotedToOfficial: boolean;
    approvalCount: number;
    rejectionCount: number;
  }> {
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerUserId },
      include: { UserProgress: { select: { levelId: true } } },
    });

    if (
      !reviewer ||
      (!reviewer.admin && (reviewer.UserProgress?.levelId ?? 1) < REVIEW_MIN_LEVEL)
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: `Niveau ${REVIEW_MIN_LEVEL} requis pour voter.`,
      });
    }

    const submission = await prisma.questionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!submission || submission.deleted) {
      throw createError({ statusCode: 404, statusMessage: "Question introuvable ou supprimée." });
    }

    if (submission.userId === reviewerUserId && !reviewer.admin) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous ne pouvez pas évaluer votre propre question.",
      });
    }

    if (submission.status !== "PENDING") {
      throw createError({
        statusCode: 400,
        statusMessage: "Cette question a déjà été traitée.",
      });
    }

    const existingVote = await prisma.questionSubmissionVote.findUnique({
      where: {
        submissionId_userId: {
          submissionId,
          userId: reviewerUserId,
        },
      },
    });

    if (existingVote) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous avez déjà voté pour cette question.",
      });
    }

    // Enregistrer le vote
    await prisma.questionSubmissionVote.create({
      data: {
        submissionId,
        userId: reviewerUserId,
        vote,
        rejectionReason: rejectionReason?.trim() || null,
      },
    });

    // Mettre à jour les compteurs
    const isApprove = vote === "APPROVE";
    const updated = await prisma.questionSubmission.update({
      where: { id: submissionId },
      data: {
        approvalCount: { increment: isApprove ? 1 : 0 },
        rejectionCount: { increment: !isApprove ? 1 : 0 },
      },
    });

    let promotedToOfficial = false;

    // Promotion automatique si seuil d'approbation atteint (3 votes)
    if (updated.approvalCount >= APPROVAL_THRESHOLD && updated.status === "PENDING") {
      promotedToOfficial = true;
      const data = submission.data as any as QuestionDataDTO;

      const createdQuestion = await prisma.question.create({
        data: {
          difficulty: submission.difficulty,
          data: submission.data as any,
          picture: data.img || "",
          source: submission.source || "",
          language: "fr",
          xp_earned: 10,
          authorId: submission.userId,
          userCreate: submission.user.name || "Communauté",
          userUpdate: submission.user.name || "Communauté",
        },
      });

      await prisma.questionSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          createdQuestionId: createdQuestion.id,
        },
      });

      // Notifier le créateur de la question
      sendPushToUser(submission.userId, {
        title: "🎉 Question validée !",
        body: `Votre question "${data.libelle.slice(0, 50)}..." a été validée par la communauté et est désormais en jeu !`,
        url: "/community",
        metadata: {
          type: "community_question_approved",
          submissionId: submission.id,
          questionId: createdQuestion.id,
        },
      }).catch((e) => console.error("Erreur notification validation question:", e));
    }

    return {
      voteRegistered: true,
      promotedToOfficial,
      approvalCount: updated.approvalCount,
      rejectionCount: updated.rejectionCount,
    };
  }

  /**
   * Action de modération Admin (validation directe, modification ou rejet).
   */
  async adminReview(
    adminUserId: string,
    submissionId: number,
    action: "APPROVE" | "REJECT",
    editedData?: QuestionDataDTO,
    rejectionReason?: string,
  ): Promise<QuestionSubmissionDTO> {
    const submission = await prisma.questionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!submission) {
      throw createError({ statusCode: 404, statusMessage: "Question introuvable." });
    }

    const currentData = (editedData || submission.data) as any as QuestionDataDTO;

    if (action === "APPROVE") {
      let questionId = submission.createdQuestionId;

      if (!questionId) {
        const createdQuestion = await prisma.question.create({
          data: {
            difficulty: submission.difficulty,
            data: currentData as any,
            picture: currentData.img || "",
            source: submission.source || "",
            language: "fr",
            xp_earned: 10,
            authorId: submission.userId,
            userCreate: submission.user.name || "Communauté",
            userUpdate: "Admin",
          },
        });
        questionId = createdQuestion.id;
      } else {
        await prisma.question.update({
          where: { id: questionId },
          data: {
            data: currentData as any,
            picture: currentData.img || "",
            difficulty: submission.difficulty,
          },
        });
      }

      const updated = await prisma.questionSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          data: currentData as any,
          createdQuestionId: questionId,
        },
      });

      sendPushToUser(submission.userId, {
        title: "🎉 Question validée !",
        body: `Votre question "${currentData.libelle.slice(0, 50)}..." a été validée et est désormais en jeu !`,
        url: "/community",
        metadata: {
          type: "community_question_approved",
          submissionId: submission.id,
          questionId,
        },
      }).catch((e) => console.error("Erreur notification validation admin:", e));

      return {
        id: updated.id,
        userId: updated.userId,
        userName: submission.user.name,
        userSlug: submission.user.slug,
        data: currentData,
        themes: updated.themes,
        difficulty: updated.difficulty,
        source: updated.source,
        status: updated.status as SubmissionStatus,
        approvalCount: updated.approvalCount,
        rejectionCount: updated.rejectionCount,
        rejectionReason: updated.rejectionReason,
        createdQuestionId: updated.createdQuestionId,
        deleted: updated.deleted,
        deletedAt: updated.deletedAt,
        createDate: updated.createDate,
        updateDate: updated.updateDate,
      };
    } else {
      const updated = await prisma.questionSubmission.update({
        where: { id: submissionId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason?.trim() || "Non conforme aux critères de sélection.",
        },
      });

      sendPushToUser(submission.userId, {
        title: "Question non retenue",
        body: `Votre question "${currentData.libelle.slice(0, 40)}..." n'a pas été retenue : ${updated.rejectionReason}`,
        url: "/community",
        metadata: {
          type: "community_question_rejected",
          submissionId: submission.id,
        },
      }).catch((e) => console.error("Erreur notification rejet admin:", e));

      return {
        id: updated.id,
        userId: updated.userId,
        userName: submission.user.name,
        userSlug: submission.user.slug,
        data: currentData,
        themes: updated.themes,
        difficulty: updated.difficulty,
        source: updated.source,
        status: updated.status as SubmissionStatus,
        approvalCount: updated.approvalCount,
        rejectionCount: updated.rejectionCount,
        rejectionReason: updated.rejectionReason,
        createdQuestionId: updated.createdQuestionId,
        deleted: updated.deleted,
        deletedAt: updated.deletedAt,
        createDate: updated.createDate,
        updateDate: updated.updateDate,
      };
    }
  }

  /**
   * Modifie une contribution existante non encore validée (statut PENDING).
   * Réinitialise les votes existants pour recommencer la validation à 0.
   */
  async updateSubmission(
    submissionId: number,
    userId: string,
    payload: CreateSubmissionPayload,
  ): Promise<QuestionSubmissionDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { UserProgress: { select: { levelId: true } } },
    });

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "Utilisateur non trouvé." });
    }

    const submission = await prisma.questionSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.deleted) {
      throw createError({ statusCode: 404, statusMessage: "Soumission introuvable ou supprimée." });
    }

    // Seul l'auteur ou un admin peut modifier la soumission
    if (submission.userId !== userId && !user.admin) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous n'avez pas la permission de modifier cette contribution.",
      });
    }

    if (submission.status !== "PENDING") {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Seules les soumissions en attente (non encore validées ou refusées) peuvent être modifiées.",
      });
    }

    // Même validateur que la création : la modification écrit dans la même colonne Json et
    // doit donc appliquer exactement les mêmes contrôles de type et de longueur.
    const built = this.buildQuestionData(payload);
    if ("error" in built) {
      throw createError({ statusCode: 400, statusMessage: built.error });
    }
    const { data: questionData, themes, difficulty, source } = built;

    // Supprimer les votes existants pour repartir de 0
    await prisma.questionSubmissionVote.deleteMany({
      where: { submissionId },
    });

    const updated = await prisma.questionSubmission.update({
      where: { id: submissionId },
      data: {
        data: questionData as any,
        themes,
        difficulty,
        source,
        approvalCount: 0,
        rejectionCount: 0,
        rejectionReason: null,
        updateDate: new Date(),
      },
    });

    const authorTrust = await this.getContributorTrustScore(submission.userId);

    return {
      id: updated.id,
      userId: updated.userId,
      userName: user.name,
      userSlug: user.slug,
      data: questionData,
      themes: updated.themes,
      difficulty: updated.difficulty,
      source: updated.source,
      status: updated.status as SubmissionStatus,
      approvalCount: updated.approvalCount,
      rejectionCount: updated.rejectionCount,
      rejectionReason: updated.rejectionReason,
      createdQuestionId: updated.createdQuestionId,
      deleted: updated.deleted,
      deletedAt: updated.deletedAt,
      createDate: updated.createDate,
      updateDate: updated.updateDate,
      authorTrust,
      answersReceivedCount: 0,
      royaltiesEarned: 0,
    };
  }

  /**
   * Supprime une contribution non encore validée (statut PENDING).
   * Suppression logique (soft delete) : conserve la soumission et ses votes
   * pour que la réputation et le score de confiance du créateur ne soient pas faussés.
   */
  async deleteSubmission(submissionId: number, userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "Utilisateur non trouvé." });
    }

    const submission = await prisma.questionSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: "Soumission introuvable ou déjà supprimée.",
      });
    }

    // Seul l'auteur ou un admin peut supprimer la soumission
    if (submission.userId !== userId && !user.admin) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous n'avez pas la permission de supprimer cette contribution.",
      });
    }

    if (submission.status !== "PENDING") {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Seules les soumissions en attente (non encore validées ou refusées) peuvent être supprimées.",
      });
    }

    // Suppression logique : on conserve la question et ses votes pour la réputation
    await prisma.questionSubmission.update({
      where: { id: submissionId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Récupère toutes les soumissions pour l'interface Admin.
   */
  async getAllForAdmin(status?: string): Promise<QuestionSubmissionDTO[]> {
    const where: any = status ? { status } : {};
    const submissions = await prisma.questionSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createDate: "desc" },
    });

    const authorIds = Array.from(new Set(submissions.map((s) => s.userId)));
    const trustScores = await Promise.all(
      authorIds.map((aid) => this.getContributorTrustScore(aid)),
    );
    const trustScoreMap = new Map<string, ContributorTrustScoreDTO | null>();
    authorIds.forEach((aid, idx) => {
      trustScoreMap.set(aid, trustScores[idx] ?? null);
    });

    return submissions.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      userName: sub.user.name,
      userSlug: sub.user.slug,
      data: sub.data as any as QuestionDataDTO,
      themes: sub.themes,
      difficulty: sub.difficulty,
      source: sub.source,
      status: sub.status as SubmissionStatus,
      approvalCount: sub.approvalCount,
      rejectionCount: sub.rejectionCount,
      rejectionReason: sub.rejectionReason,
      createdQuestionId: sub.createdQuestionId,
      createDate: sub.createDate,
      updateDate: sub.updateDate,
      authorTrust: trustScoreMap.get(sub.userId) ?? null,
    }));
  }
}

export const questionSubmissionService = new QuestionSubmissionService();
