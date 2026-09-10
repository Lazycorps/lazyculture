import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { seriesService } from "./SeriesService";
import prisma from "../utils/prisma";

vi.mock("../utils/prisma", () => {
  return {
    default: {
      questionSeries: {
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      questionSeriesResponse: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      question: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      questionTheme: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("../utils/walletHelper", () => ({
  coinsFromXp: vi.fn((xp: number) => Math.ceil(xp / 10)),
  grantCoins: vi.fn(),
}));

vi.mock("./DailyRewardService", () => ({
  dailyRewardService: {
    handleQuestionAnswered: vi.fn(),
  },
}));

vi.mock("../utils/activityStreakHelper", () => ({
  recordUserStreakActivity: vi.fn().mockResolvedValue(undefined),
}));

describe("SeriesService - getDailyReview", () => {
  const userId = "user-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devrait renvoyer 404 si la série quotidienne n'existe pas", async () => {
    vi.mocked(prisma.questionSeries.findFirst).mockResolvedValue(null);

    await expect(seriesService.getDailyReview(userId, 999)).rejects.toThrow(
      "Série quotidienne introuvable.",
    );
  });

  it("devrait refuser (403) la consultation si l'utilisateur n'a pas répondu à toutes les questions", async () => {
    vi.mocked(prisma.questionSeries.findFirst).mockResolvedValue({
      id: 10,
      type: "daily",
      title: "Daily 10",
      date: new Date("2026-09-10"),
      data: {
        id: 10,
        questionsIds: [101, 102, 103],
      },
    } as any);

    // L'utilisateur n'a répondu qu'à 1 question sur 3
    vi.mocked(prisma.questionSeriesResponse.findFirst).mockResolvedValue({
      id: 50,
      seriesId: 10,
      userId,
      data: {
        responses: [{ questionId: 101, responseId: 1, success: true, elapsedTime: 0 }],
      },
    } as any);

    await expect(seriesService.getDailyReview(userId, 10)).rejects.toThrow(
      "Vous devez terminer la série quotidienne avant de pouvoir consulter les réponses",
    );
  });

  it("devrait retourner la revue complète avec questions, réponses et explications quand la série est terminée", async () => {
    const mockSeries = {
      id: 12,
      type: "daily",
      title: "Daily 12",
      date: new Date("2026-09-10"),
      data: {
        id: 12,
        questionsIds: [101, 102],
      },
    };

    const mockUserResponse = {
      id: 55,
      seriesId: 12,
      userId,
      data: {
        score: 5,
        responses: [
          { questionId: 101, responseId: 1, success: true, elapsedTime: 0 },
          { questionId: 102, responseId: 4, success: false, elapsedTime: 0 },
        ],
      },
    };

    const mockQuestions = [
      {
        id: 101,
        picture: "https://example.com/q1.jpg",
        data: {
          libelle: "Capitale de la France ?",
          img: "https://example.com/q1.jpg",
          theme: ["geographie"],
          response: 1,
          commentaire: "Paris est la capitale et la plus grande ville de France.",
          commentaireImg: "https://example.com/paris.jpg",
          propositions: [
            { id: 1, value: "Paris" },
            { id: 2, value: "Lyon" },
          ],
        },
        author: {
          id: "author-1",
          name: "JeanDupont",
          slug: "jean-dupont",
        },
      },
      {
        id: 102,
        picture: "",
        data: {
          libelle: "Année de la chute du mur de Berlin ?",
          img: "",
          theme: ["histoire"],
          response: 3,
          commentaire: "Le mur de Berlin est tombé le 9 novembre 1989.",
          commentaireImg: "",
          propositions: [
            { id: 3, value: "1989" },
            { id: 4, value: "1991" },
          ],
        },
        author: null,
      },
    ];

    vi.mocked(prisma.questionSeries.findFirst).mockResolvedValue(mockSeries as any);
    vi.mocked(prisma.questionSeriesResponse.findFirst).mockResolvedValue(mockUserResponse as any);
    vi.mocked(prisma.question.findMany).mockResolvedValue(mockQuestions as any);
    vi.mocked(prisma.questionTheme.findMany).mockResolvedValue([
      { id: 1, name: "Géographie", slug: "geographie" },
      { id: 2, name: "Histoire", slug: "histoire" },
    ] as any);

    const result = await seriesService.getDailyReview(userId, 12);

    expect(result.seriesId).toBe(12);
    expect(result.title).toBe("Daily 12");
    expect(result.score).toBe(5);
    expect(result.totalQuestions).toBe(2);
    expect(result.questions).toHaveLength(2);

    // Question 1 : réussie
    const q1 = result.questions[0]!;
    expect(q1.questionId).toBe(101);
    expect(q1.order).toBe(1);
    expect(q1.libelle).toBe("Capitale de la France ?");
    expect(q1.isCorrect).toBe(true);
    expect(q1.userResponseId).toBe(1);
    expect(q1.correctResponseId).toBe(1);
    expect(q1.commentaire).toBe("Paris est la capitale et la plus grande ville de France.");
    expect(q1.commentaireImg).toBe("https://example.com/paris.jpg");
    expect(q1.themes).toEqual(["Géographie"]);
    expect(q1.authorName).toBe("JeanDupont");

    // Question 2 : erreur
    const q2 = result.questions[1]!;
    expect(q2.questionId).toBe(102);
    expect(q2.order).toBe(2);
    expect(q2.libelle).toBe("Année de la chute du mur de Berlin ?");
    expect(q2.isCorrect).toBe(false);
    expect(q2.userResponseId).toBe(4);
    expect(q2.correctResponseId).toBe(3);
    expect(q2.commentaire).toBe("Le mur de Berlin est tombé le 9 novembre 1989.");
    expect(q2.themes).toEqual(["Histoire"]);
    expect(q2.authorName).toBeUndefined();
  });
});
