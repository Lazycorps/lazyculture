import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  questionSubmissionService,
  SUBMISSION_MIN_LEVEL,
  REVIEW_MIN_LEVEL,
} from "./QuestionSubmissionService";
import prisma from "../utils/prisma";
import {
  SUBMISSION_CSV_DEFAULT_DIFFICULTY,
  SUBMISSION_CSV_MAX_ROWS,
} from "../../shared/community/submissionCsvTemplate";
import type { BulkSubmissionRowPayload } from "../../shared/DTO/questionSubmissionDTO";
import {
  COMMENTAIRE_MAX_LENGTH,
  PROPOSITION_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
} from "../../shared/community/questionContentRules";

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
        createManyAndReturn: vi.fn(),
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
        findMany: vi.fn(),
      },
      questionTheme: {
        findFirst: vi.fn(),
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

  describe("Import CSV en lot", () => {
    /** Construit une ligne de CSV valide, surchargée par les champs passés. */
    function bulkRow(line: number, overrides: Partial<BulkSubmissionRowPayload> = {}) {
      return {
        line,
        libelle: `Quel est le plus grand océan n°${line} ?`,
        propositions: [
          { id: 0, value: "Pacifique" },
          { id: 1, value: "Atlantique" },
          { id: 2, value: "Indien" },
          { id: 3, value: "Arctique" },
        ],
        response: 0,
        ...overrides,
      } as BulkSubmissionRowPayload;
    }

    /** Prépare un contributeur de niveau suffisant, un thème existant et aucun doublon en base. */
    function mockHappyPath() {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        name: "Vétéran",
        slug: "veteran",
        UserProgress: { levelId: SUBMISSION_MIN_LEVEL },
      });
      (prisma.questionTheme.findFirst as any).mockResolvedValue({
        id: 1,
        slug: "geographie",
        name: "Géographie",
      });
      (prisma.question.findMany as any).mockResolvedValue([]);
      (prisma.questionSubmission.findMany as any).mockResolvedValue([]);
      (prisma.questionSubmission.createManyAndReturn as any).mockImplementation(
        ({ data }: { data: any[] }) => Promise.resolve(data.map((_, i) => ({ id: 100 + i }))),
      );
    }

    it("devrait refuser l'import si l'utilisateur a un niveau < 5", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        name: "Débutant",
        UserProgress: { levelId: SUBMISSION_MIN_LEVEL - 1 },
      });

      await expect(
        questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [bulkRow(2)]),
      ).rejects.toThrow(`Niveau ${SUBMISSION_MIN_LEVEL}`);
      expect(prisma.questionSubmission.createManyAndReturn).not.toHaveBeenCalled();
    });

    it("devrait refuser un import dépassant le plafond de lignes", async () => {
      mockHappyPath();
      const rows = Array.from({ length: SUBMISSION_CSV_MAX_ROWS + 1 }, (_, i) => bulkRow(i + 2));

      await expect(
        questionSubmissionService.createSubmissionsBulk(authorId, "geographie", rows),
      ).rejects.toThrow(`plus de ${SUBMISSION_CSV_MAX_ROWS} questions`);
      expect(prisma.questionSubmission.createManyAndReturn).not.toHaveBeenCalled();
    });

    it("devrait refuser un import sans aucune ligne", async () => {
      mockHappyPath();

      await expect(
        questionSubmissionService.createSubmissionsBulk(authorId, "geographie", []),
      ).rejects.toThrow("Aucune question à importer.");
    });

    it("devrait refuser un thème inexistant", async () => {
      mockHappyPath();
      (prisma.questionTheme.findFirst as any).mockResolvedValue(null);

      await expect(
        questionSubmissionService.createSubmissionsBulk(authorId, "theme-fantome", [bulkRow(2)]),
      ).rejects.toThrow("thème sélectionné est introuvable");
      expect(prisma.questionSubmission.createManyAndReturn).not.toHaveBeenCalled();
    });

    it("devrait imposer le thème choisi et la difficulté par défaut, en ignorant ce que le client envoie", async () => {
      mockHappyPath();

      await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        // Champs parasites : ils ne doivent pas se retrouver en base.
        { ...bulkRow(2), themes: ["hacking"], difficulty: 5 } as any,
      ]);

      const created = (prisma.questionSubmission.createManyAndReturn as any).mock.calls[0][0].data;
      expect(created).toHaveLength(1);
      expect(created[0].themes).toEqual(["geographie"]);
      expect(created[0].difficulty).toBe(SUBMISSION_CSV_DEFAULT_DIFFICULTY);
      expect(created[0].data.theme).toEqual(["geographie"]);
      expect(created[0].data.difficulty).toBe(SUBMISSION_CSV_DEFAULT_DIFFICULTY);
      expect(created[0].status).toBe("PENDING");
    });

    it("devrait importer les lignes valides et rejeter les autres individuellement", async () => {
      mockHappyPath();

      const result = await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        bulkRow(2),
        bulkRow(3, { libelle: "Qui" }),
        bulkRow(4, { response: 9 }),
        bulkRow(5),
      ]);

      expect(result.importedCount).toBe(2);
      expect(result.rejectedCount).toBe(2);
      expect(result.rows.map((r) => r.line)).toEqual([2, 3, 4, 5]);
      expect(result.rows.filter((r) => r.status === "REJECTED").map((r) => r.line)).toEqual([3, 4]);

      const created = (prisma.questionSubmission.createManyAndReturn as any).mock.calls[0][0].data;
      expect(created).toHaveLength(2);
    });

    it("devrait rejeter un doublon interne au fichier en gardant la première occurrence", async () => {
      mockHappyPath();

      const result = await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        bulkRow(2, { libelle: "Quelle est la capitale de l'Australie ?" }),
        bulkRow(3, { libelle: "  quelle EST la Capitale de l'Australie ?  " }),
      ]);

      expect(result.importedCount).toBe(1);
      expect(result.rows.find((r) => r.line === 2)?.status).toBe("CREATED");
      expect(result.rows.find((r) => r.line === 3)?.error).toContain("double dans le fichier");
    });

    it("devrait rejeter une question déjà présente en base", async () => {
      mockHappyPath();
      (prisma.question.findMany as any).mockResolvedValue([
        { data: { libelle: "Quel est le plus grand océan n°2 ?" } },
      ]);

      const result = await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        bulkRow(2),
        bulkRow(3),
      ]);

      expect(result.importedCount).toBe(1);
      expect(result.rows.find((r) => r.line === 2)?.error).toContain("existe déjà");
      expect(result.rows.find((r) => r.line === 3)?.status).toBe("CREATED");
    });

    it("devrait rejeter une image_url non http(s) envoyée directement à l'API", async () => {
      mockHappyPath();

      const result = await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        bulkRow(2, { img: "javascript:alert(1)" }),
        bulkRow(3, { img: "https://ok.fr/a.png" }),
      ]);

      expect(result.rows.find((r) => r.line === 2)?.error).toContain("image_url");
      expect(result.rows.find((r) => r.line === 3)?.status).toBe("CREATED");
      expect(result.importedCount).toBe(1);
    });

    // Le contenu finit dans une colonne Json qu'aucun schéma ne contraint : ces cas vérifient
    // qu'un corps de requête forgé ne peut ni faire planter l'import ni écrire de données douteuses.
    describe("Contenu forgé envoyé directement à l'API", () => {
      it("devrait rejeter une proposition dont la valeur n'est pas du texte, sans faire échouer l'import", async () => {
        mockHappyPath();

        const result = await questionSubmissionService.createSubmissionsBulk(
          authorId,
          "geographie",
          [
            bulkRow(2, {
              propositions: [
                { id: 0, value: { evil: 1 } },
                { id: 1, value: "b" },
                { id: 2, value: "c" },
                { id: 3, value: "d" },
              ],
            } as any),
            bulkRow(3),
          ],
        );

        expect(result.rows.find((r) => r.line === 2)?.status).toBe("REJECTED");
        expect(result.rows.find((r) => r.line === 3)?.status).toBe("CREATED");
      });

      it("devrait rejeter un libellé non textuel au lieu de planter", async () => {
        mockHappyPath();

        const result = await questionSubmissionService.createSubmissionsBulk(
          authorId,
          "geographie",
          [bulkRow(2, { libelle: { $ne: null } } as any)],
        );

        expect(result.importedCount).toBe(0);
        expect(result.rows[0]?.status).toBe("REJECTED");
      });

      it("devrait rejeter des identifiants de proposition non entiers ou dupliqués", async () => {
        mockHappyPath();

        const result = await questionSubmissionService.createSubmissionsBulk(
          authorId,
          "geographie",
          [
            // Ids textuels : la bonne réponse serait introuvable au moment de jouer.
            bulkRow(2, {
              propositions: [
                { id: "x", value: "a" },
                { id: "x", value: "b" },
                { id: "x", value: "c" },
                { id: "x", value: "d" },
              ],
              response: "x",
            } as any),
            // Ids entiers mais dupliqués.
            bulkRow(3, {
              propositions: [
                { id: 0, value: "a" },
                { id: 0, value: "b" },
                { id: 1, value: "c" },
                { id: 2, value: "d" },
              ],
              response: 0,
            }),
          ],
        );

        expect(result.importedCount).toBe(0);
        expect(result.rejectedCount).toBe(2);
        expect(prisma.questionSubmission.createManyAndReturn).not.toHaveBeenCalled();
      });

      it("devrait rejeter des champs textuels démesurés plutôt que de les stocker", async () => {
        mockHappyPath();

        const result = await questionSubmissionService.createSubmissionsBulk(
          authorId,
          "geographie",
          [
            bulkRow(2, {
              propositions: [
                { id: 0, value: "z".repeat(PROPOSITION_MAX_LENGTH + 1) },
                { id: 1, value: "b" },
                { id: 2, value: "c" },
                { id: 3, value: "d" },
              ],
            }),
            bulkRow(3, { commentaire: "c".repeat(COMMENTAIRE_MAX_LENGTH + 1) }),
            bulkRow(4, { source: "s".repeat(SOURCE_MAX_LENGTH + 1) }),
          ],
        );

        expect(result.importedCount).toBe(0);
        expect(result.rejectedCount).toBe(3);
      });
    });

    it("devrait appliquer les mêmes contrôles à la modification d'une contribution", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: authorId,
        name: "Vétéran",
        admin: false,
        UserProgress: { levelId: SUBMISSION_MIN_LEVEL },
      });
      (prisma.questionSubmission.findUnique as any).mockResolvedValue({
        id: 42,
        userId: authorId,
        status: "PENDING",
        deleted: false,
      });

      await expect(
        questionSubmissionService.updateSubmission(42, authorId, {
          libelle: "Une question tout à fait valable ?",
          propositions: [
            { id: 0, value: "a" },
            { id: 0, value: "b" },
            { id: 1, value: "c" },
            { id: 2, value: "d" },
          ],
          response: 0,
          themes: ["geographie"],
          difficulty: 2,
        }),
      ).rejects.toThrow("identifiant de la proposition");
      expect(prisma.questionSubmission.update).not.toHaveBeenCalled();
    });

    it("ne devrait insérer aucune ligne si toutes sont invalides", async () => {
      mockHappyPath();

      const result = await questionSubmissionService.createSubmissionsBulk(authorId, "geographie", [
        bulkRow(2, { libelle: "Qui" }),
        bulkRow(3, { response: 9 }),
      ]);

      expect(result.importedCount).toBe(0);
      expect(result.rejectedCount).toBe(2);
      expect(prisma.questionSubmission.createManyAndReturn).not.toHaveBeenCalled();
    });
  });
});
