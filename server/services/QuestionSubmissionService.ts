import { createError } from "h3";
import prisma from "../utils/prisma";
import type {
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
import { sendPushToUser } from "../utils/pushNotification";

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
   * Crée une nouvelle soumission de question (requiert Niveau >= 5).
   */
  async createSubmission(
    userId: string,
    payload: CreateSubmissionPayload,
  ): Promise<QuestionSubmissionDTO> {
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

    // Validation du contenu
    const libelle = payload.libelle?.trim();
    if (!libelle || libelle.length < 5 || libelle.length > 300) {
      throw createError({
        statusCode: 400,
        statusMessage: "L'intitulé de la question doit comporter entre 5 et 300 caractères.",
      });
    }

    if (!Array.isArray(payload.propositions) || payload.propositions.length !== 4) {
      throw createError({
        statusCode: 400,
        statusMessage: "La question doit comporter exactement 4 propositions de réponse.",
      });
    }

    for (let i = 0; i < payload.propositions.length; i++) {
      const p = payload.propositions[i];
      if (!p || !p.value || p.value.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `La proposition n°${i + 1} ne peut pas être vide.`,
        });
      }
    }

    const validResponseIds = payload.propositions.map((p) => p.id);
    if (!validResponseIds.includes(payload.response)) {
      throw createError({
        statusCode: 400,
        statusMessage: "La bonne réponse sélectionnée est invalide.",
      });
    }

    const themes =
      Array.isArray(payload.themes) && payload.themes.length > 0
        ? payload.themes
        : ["culture_generale"];

    const difficulty = Math.min(Math.max(Number(payload.difficulty) || 1, 1), 5);

    const questionData: QuestionDataDTO = {
      type: "simple",
      difficulty,
      theme: themes,
      libelle,
      img: payload.img?.trim() || "",
      response: payload.response,
      propositions: payload.propositions.map((p) => ({
        id: p.id,
        value: p.value.trim(),
        img: "",
      })),
      commentaire: payload.commentaire?.trim() || "",
      commentaireImg: "",
    };

    const submission = await prisma.questionSubmission.create({
      data: {
        userId,
        data: questionData as any,
        themes,
        difficulty,
        source: payload.source?.trim() || null,
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

    // Validation du contenu
    const libelle = payload.libelle?.trim();
    if (!libelle || libelle.length < 5 || libelle.length > 300) {
      throw createError({
        statusCode: 400,
        statusMessage: "L'intitulé de la question doit comporter entre 5 et 300 caractères.",
      });
    }

    if (!Array.isArray(payload.propositions) || payload.propositions.length !== 4) {
      throw createError({
        statusCode: 400,
        statusMessage: "La question doit comporter exactement 4 propositions de réponse.",
      });
    }

    for (let i = 0; i < payload.propositions.length; i++) {
      const p = payload.propositions[i];
      if (!p || !p.value || p.value.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `La proposition n°${i + 1} ne peut pas être vide.`,
        });
      }
    }

    if (payload.response < 0 || payload.response > 3) {
      throw createError({
        statusCode: 400,
        statusMessage: "La réponse correcte doit être désignée parmi les 4 propositions (0 à 3).",
      });
    }

    // Supprimer les votes existants pour repartir de 0
    await prisma.questionSubmissionVote.deleteMany({
      where: { submissionId },
    });

    const questionData: QuestionDataDTO = {
      type: "unique",
      difficulty: Math.min(5, Math.max(1, payload.difficulty || 1)),
      theme: payload.themes && payload.themes.length > 0 ? payload.themes : ["culture_generale"],
      libelle,
      img: payload.img?.trim() || "",
      propositions: payload.propositions.map((p, idx) => ({
        id: idx,
        value: p.value.trim(),
        img: p.img || "",
      })),
      response: payload.response,
      commentaire: payload.commentaire?.trim() || "",
      commentaireImg: payload.commentaireImg || "",
    };

    const updated = await prisma.questionSubmission.update({
      where: { id: submissionId },
      data: {
        data: questionData as any,
        themes: payload.themes && payload.themes.length > 0 ? payload.themes : ["culture_generale"],
        difficulty: Math.min(5, Math.max(1, payload.difficulty || 1)),
        source: payload.source?.trim() || null,
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
