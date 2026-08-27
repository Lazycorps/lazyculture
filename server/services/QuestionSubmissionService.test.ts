import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  questionSubmissionService,
  SUBMISSION_MIN_LEVEL,
  REVIEW_MIN_LEVEL,
} from "./QuestionSubmissionService";
import prisma from "../utils/prisma";

vi.mock("../utils/prisma", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
      },
      questionSubmission: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      questionSubmissionVote: {
        findUnique: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      question: {
        create: vi.fn(),
        update: vi.fn(),
      },
      questionResponse: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
    },
  };
});

vi.mock("../utils/pushNotification", () => ({
  sendPushToUser: vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
}));

describe("QuestionSubmissionService", () => {
  const authorId = "user-author-1";
  const reviewerId = "user-reviewer-2";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paliers de Niveau", () => {
    it("devrait refuser la soumission si l'utilisateur a un niveau < 5", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        name: "Débutant",
        UserProgress: { levelId: 4 },
      });

      await expect(
        questionSubmissionService.createSubmission(authorId, {
          libelle: "Quel est le plus grand océan ?",
          propositions: [
            { id: 0, value: "Pacifique" },
            { id: 1, value: "Atlantique" },
            { id: 2, value: "Indien" },
            { id: 3, value: "Arctique" },
          ],
          response: 0,
          themes: ["geographie"],
          difficulty: 1,
        }),
      ).rejects.toThrow(`Niveau ${SUBMISSION_MIN_LEVEL}`);
    });

    it("devrait accepter la soumission si l'utilisateur a un niveau >= 5", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        name: "Vétéran",
        slug: "veteran",
        UserProgress: { levelId: 5 },
      });

      (prisma.questionSubmission.create as any).mockResolvedValue({
        id: 10,
        userId: authorId,
        themes: ["geographie"],
        difficulty: 1,
        source: "Encyclopédie",
        status: "PENDING",
        approvalCount: 0,
        rejectionCount: 0,
        createDate: new Date(),
        updateDate: new Date(),
      });

      (prisma.questionSubmission.findMany as any).mockResolvedValue([]);

      const result = await questionSubmissionService.createSubmission(authorId, {
        libelle: "Quel est le plus grand océan ?",
        propositions: [
          { id: 0, value: "Pacifique" },
          { id: 1, value: "Atlantique" },
          { id: 2, value: "Indien" },
          { id: 3, value: "Arctique" },
        ],
        response: 0,
        themes: ["geographie"],
        difficulty: 1,
        source: "Encyclopédie",
      });

      expect(result.id).toBe(10);
      expect(result.status).toBe("PENDING");
    });

    it("devrait refuser la relecture si le relecteur a un niveau < 3", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: reviewerId,
        UserProgress: { levelId: 2 },
      });

      await expect(questionSubmissionService.getNextForReview(reviewerId)).rejects.toThrow(
        `Niveau ${REVIEW_MIN_LEVEL}`,
      );
    });
  });

  describe("Calcul de l'Indice de Confiance Contributeur", () => {
    it("devrait retourner null si l'utilisateur n'a jamais soumis de question", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: authorId, name: "Joueur" });
      (prisma.questionSubmission.findMany as any).mockResolvedValue([]);

      const score = await questionSubmissionService.getContributorTrustScore(authorId);
      expect(score).toBeNull();
    });

    it("devrait attribuer le rang ELITE si >=10 approuvées et >=90% de taux", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: authorId, name: "Maître" });
      (prisma.questionSubmission.findMany as any).mockResolvedValue([
        ...Array(12).fill({ id: 1, status: "APPROVED", createdQuestionId: 101 }),
        { id: 2, status: "REJECTED", createdQuestionId: null },
      ]);
      (prisma.questionResponse.count as any).mockResolvedValue(140);

      const score = await questionSubmissionService.getContributorTrustScore(authorId);
      expect(score).not.toBeNull();
      expect(score?.trustTier).toBe("ELITE");
      expect(score?.tierLabel).toBe("Maître Rédacteur");
      expect(score?.totalApproved).toBe(12);
      expect(score?.totalRoyaltiesEarned).toBe(140);
    });
  });

  describe("Cycle de Vote & Promotion automatique à 3 Approbations", () => {
    it("devrait promouvoir la question au statut APPROVED dès le 3ème vote APPROVE", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: reviewerId,
        UserProgress: { levelId: 3 },
      });

      (prisma.questionSubmission.findUnique as any).mockResolvedValue({
        id: 42,
        userId: authorId,
        status: "PENDING",
        difficulty: 2,
        source: "Source vérifiée",
        data: {
          libelle: "Capitale de l'Australie ?",
          propositions: [{ id: 0, value: "Canberra" }],
          response: 0,
        },
        user: { id: authorId, name: "Auteur" },
      });

      (prisma.questionSubmissionVote.findUnique as any).mockResolvedValue(null);
      (prisma.questionSubmissionVote.create as any).mockResolvedValue({ id: 1 });

      (prisma.questionSubmission.update as any).mockResolvedValue({
        id: 42,
        approvalCount: 3,
        rejectionCount: 0,
        status: "PENDING",
      });

      (prisma.question.create as any).mockResolvedValue({
        id: 999,
      });

      const voteResult = await questionSubmissionService.submitReviewVote(
        reviewerId,
        42,
        "APPROVE",
      );

      expect(voteResult.promotedToOfficial).toBe(true);
      expect(prisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: authorId,
          }),
        }),
      );
    });
  });

  describe("Admin & Relecture de ses propres questions", () => {
    it("devrait permettre à un admin de relire et voter pour sa propre question", async () => {
      const adminId = "user-admin";
      (prisma.user.findUnique as any).mockResolvedValue({
        id: adminId,
        admin: true,
        UserProgress: { levelId: 1 },
      });

      (prisma.questionSubmission.findMany as any).mockResolvedValue([
        {
          id: 50,
          userId: adminId,
          themes: ["histoire"],
          difficulty: 2,
          data: {
            libelle: "Question de l'admin ?",
            propositions: [
              { id: 0, value: "Rep 1" },
              { id: 1, value: "Rep 2" },
            ],
            response: 0,
          },
          user: { id: adminId, name: "Admin", slug: "admin" },
          createDate: new Date(),
        },
      ]);

      const reviewQuestion = await questionSubmissionService.getNextForReview(adminId);
      expect(reviewQuestion).not.toBeNull();
      expect(reviewQuestion?.submissionId).toBe(50);
    });
  });

  describe("Modification et Suppression de Contribution PENDING", () => {
    it("devrait modifier une soumission PENDING et réinitialiser les votes à 0", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        admin: false,
        name: "Auteur",
        slug: "auteur",
      });

      (prisma.questionSubmission.findUnique as any).mockResolvedValue({
        id: 77,
        userId: authorId,
        status: "PENDING",
        approvalCount: 2,
        rejectionCount: 0,
      });

      (prisma.questionSubmissionVote.deleteMany as any).mockResolvedValue({ count: 2 });
      (prisma.questionSubmission.update as any).mockResolvedValue({
        id: 77,
        userId: authorId,
        themes: ["cinema"],
        difficulty: 3,
        source: "IMDB",
        status: "PENDING",
        approvalCount: 0,
        rejectionCount: 0,
        rejectionReason: null,
        createdQuestionId: null,
        createDate: new Date(),
        updateDate: new Date(),
      });

      (prisma.questionSubmission.findMany as any).mockResolvedValue([]);

      const updated = await questionSubmissionService.updateSubmission(77, authorId, {
        libelle: "Titre modifié ?",
        propositions: [
          { id: 0, value: "A" },
          { id: 1, value: "B" },
          { id: 2, value: "C" },
          { id: 3, value: "D" },
        ],
        response: 1,
        themes: ["cinema"],
        difficulty: 3,
      });

      expect(prisma.questionSubmissionVote.deleteMany).toHaveBeenCalledWith({
        where: { submissionId: 77 },
      });
      expect(updated.approvalCount).toBe(0);
    });

    it("devrait effectuer une suppression logique (soft delete) d'une soumission PENDING", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        admin: false,
      });

      (prisma.questionSubmission.findUnique as any).mockResolvedValue({
        id: 88,
        userId: authorId,
        status: "PENDING",
        deleted: false,
      });

      (prisma.questionSubmission.update as any).mockResolvedValue({
        id: 88,
        deleted: true,
        deletedAt: new Date(),
      });

      await questionSubmissionService.deleteSubmission(88, authorId);

      expect(prisma.questionSubmission.update).toHaveBeenCalledWith({
        where: { id: 88 },
        data: {
          deleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it("devrait préserver les questions rejetées ou supprimées avec rejets dans le calcul de réputation", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: authorId, name: "JoueurMalin" });
      (prisma.questionSubmission.findMany as any).mockResolvedValue([
        { id: 1, status: "APPROVED", createdQuestionId: 101, deleted: false, rejectionCount: 0 },
        { id: 2, status: "PENDING", createdQuestionId: null, deleted: true, rejectionCount: 2 }, // Supprimée par l'auteur après rejets
        { id: 3, status: "REJECTED", createdQuestionId: null, deleted: false, rejectionCount: 3 },
      ]);
      (prisma.questionResponse.count as any).mockResolvedValue(10);

      const score = await questionSubmissionService.getContributorTrustScore(authorId);
      expect(score).not.toBeNull();
      // Total décidé = 1 APPROVED + 1 REJECTED + 1 DELETED avec rejets = 3 décidées
      // Taux d'approbation = 1/3 = 33% -> Tier WATCH
      expect(score?.totalSubmitted).toBe(3);
      expect(score?.approvalRate).toBe(33);
      expect(score?.trustTier).toBe("WATCH");
    });

    it("devrait interdire la modification d'une soumission APPROVED", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        admin: false,
      });

      (prisma.questionSubmission.findUnique as any).mockResolvedValue({
        id: 99,
        userId: authorId,
        status: "APPROVED",
        deleted: false,
      });

      await expect(
        questionSubmissionService.updateSubmission(99, authorId, {
          libelle: "Tentative de modif",
          propositions: [
            { id: 0, value: "A" },
            { id: 1, value: "B" },
            { id: 2, value: "C" },
            { id: 3, value: "D" },
          ],
          response: 0,
          themes: ["divers"],
          difficulty: 1,
        }),
      ).rejects.toThrow("Seules les soumissions en attente");
    });
  });

  describe("Comptage des questions à relire", () => {
    it("devrait compter les questions PENDING non supprimées excluant les siennes et celles déjà votées", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: reviewerId,
        admin: false,
      });
      (prisma.questionSubmission.count as any).mockResolvedValue(5);

      const count = await questionSubmissionService.getPendingReviewCount(reviewerId);

      expect(prisma.questionSubmission.count).toHaveBeenCalledWith({
        where: {
          status: "PENDING",
          deleted: false,
          votes: { none: { userId: reviewerId } },
          userId: { not: reviewerId },
        },
      });
      expect(count).toBe(5);
    });

    it("devrait retourner à la fois pendingCount et validatedCount dans getReviewStats", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: reviewerId,
        admin: false,
      });
      (prisma.questionSubmission.count as any).mockImplementation((args: any) => {
        if (args?.where?.status === "APPROVED") return Promise.resolve(18);
        return Promise.resolve(4);
      });

      const stats = await questionSubmissionService.getReviewStats(reviewerId);

      expect(stats.pendingCount).toBe(4);
      expect(stats.validatedCount).toBe(18);
    });
  });
});
