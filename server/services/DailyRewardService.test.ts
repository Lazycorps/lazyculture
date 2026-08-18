import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { dailyRewardService } from "./DailyRewardService";
import prisma from "../utils/prisma";

vi.mock("../utils/prisma", () => {
  return {
    default: {
      userDailyQuest: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      questionTheme: {
        findMany: vi.fn(),
      },
      userWallet: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userStreakDay: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
      },
      questionResponse: {
        findMany: vi.fn(),
      },
      questionSeriesResponse: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callbacks) =>
        Array.isArray(callbacks) ? Promise.all(callbacks) : callbacks(),
      ),
    },
  };
});

describe("DailyRewardService - Multi-Quêtes, Auto-Claim & Reroll", () => {
  const userId = "test-user-quests-123";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.userWallet.findUnique as any).mockResolvedValue({
      userId,
      coins: 100,
      totalEarned: 200,
      questStreak: 3,
      lastQuestClaimStr: "2026-08-17",
      lastQuestRerollStr: null,
    });
    (prisma.questionTheme.findMany as any).mockResolvedValue([
      { slug: "cinema", name: "Cinéma" },
      { slug: "histoire", name: "Histoire" },
      { slug: "sciences", name: "Sciences" },
    ]);
  });

  it("should generate both a SHORT thematic quest and a LONG quest if none exist today", async () => {
    (prisma.userDailyQuest.findUnique as any).mockResolvedValue(null);
    (prisma.userDailyQuest.create as any)
      .mockResolvedValueOnce({
        id: 101,
        userId,
        category: "SHORT",
        questType: "ANSWER_THEME_QUESTIONS",
        targetTheme: "cinema",
        themeName: "Cinéma",
        title: "Spécialiste Cinéma",
        description: "Répondre correctement à 5 questions du thème Cinéma.",
        target: 5,
        progress: 0,
        claimed: false,
        coinsReward: 10,
        rerolled: false,
      })
      .mockResolvedValueOnce({
        id: 102,
        userId,
        category: "LONG",
        questType: "ANSWER_QUESTIONS",
        targetTheme: null,
        themeName: null,
        title: "Le Savant",
        description: "Répondre correctement à 30 questions de culture générale.",
        target: 30,
        progress: 0,
        claimed: false,
        coinsReward: 20,
        rerolled: false,
      });

    const { shortQuest, longQuest } = await dailyRewardService.getOrCreateDailyQuests(userId);

    expect(shortQuest).toBeDefined();
    expect(shortQuest.category).toBe("SHORT");
    expect(shortQuest.targetTheme).toBe("cinema");

    expect(longQuest).toBeDefined();
    expect(longQuest.category).toBe("LONG");
    expect(longQuest.target).toBe(30);
  });

  it("should increment theme quest when answering a matching theme question", async () => {
    const mockShort = {
      id: 101,
      userId,
      category: "SHORT",
      questType: "ANSWER_THEME_QUESTIONS",
      targetTheme: "cinema",
      themeName: "Cinéma",
      title: "Spécialiste Cinéma",
      target: 5,
      progress: 2,
      claimed: false,
      coinsReward: 10,
    };
    const mockLong = {
      id: 102,
      userId,
      category: "LONG",
      questType: "ANSWER_QUESTIONS",
      title: "Le Savant",
      target: 30,
      progress: 10,
      claimed: false,
      coinsReward: 20,
    };

    (prisma.userDailyQuest.findUnique as any)
      .mockResolvedValueOnce(mockShort)
      .mockResolvedValueOnce(mockLong);

    await dailyRewardService.handleQuestionAnswered(userId, ["cinema"], 1);

    expect(prisma.userDailyQuest.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { progress: 3 },
    });
    expect(prisma.userDailyQuest.update).toHaveBeenCalledWith({
      where: { id: 102 },
      data: { progress: 11 },
    });
  });

  it("should NOT increment theme quest if question does not match the target theme", async () => {
    const mockShort = {
      id: 101,
      userId,
      category: "SHORT",
      questType: "ANSWER_THEME_QUESTIONS",
      targetTheme: "histoire",
      themeName: "Histoire",
      target: 5,
      progress: 0,
      claimed: false,
      coinsReward: 10,
    };
    const mockLong = {
      id: 102,
      userId,
      category: "LONG",
      questType: "ANSWER_QUESTIONS",
      target: 30,
      progress: 0,
      claimed: false,
      coinsReward: 20,
    };

    (prisma.userDailyQuest.findUnique as any)
      .mockResolvedValueOnce(mockShort)
      .mockResolvedValueOnce(mockLong);

    await dailyRewardService.handleQuestionAnswered(userId, ["cinema"], 1);

    // Short quest should NOT be updated
    expect(prisma.userDailyQuest.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 101 } }),
    );
    // Long quest should be updated
    expect(prisma.userDailyQuest.update).toHaveBeenCalledWith({
      where: { id: 102 },
      data: { progress: 1 },
    });
  });

  it("should AUTO-CLAIM when a quest reaches target and return completedQuests", async () => {
    const mockShort = {
      id: 101,
      userId,
      category: "SHORT",
      questType: "ANSWER_THEME_QUESTIONS",
      targetTheme: "cinema",
      themeName: "Cinéma",
      title: "Spécialiste Cinéma",
      target: 5,
      progress: 4, // 4 + 1 = 5 (completed!)
      claimed: false,
      coinsReward: 10,
    };
    const mockLong = {
      id: 102,
      userId,
      category: "LONG",
      questType: "ANSWER_QUESTIONS",
      target: 30,
      progress: 0,
      claimed: false,
      coinsReward: 20,
    };

    (prisma.userDailyQuest.findUnique as any)
      .mockResolvedValueOnce(mockShort)
      .mockResolvedValueOnce(mockLong)
      .mockResolvedValueOnce(mockShort); // for autoClaimQuest

    const completed = await dailyRewardService.handleQuestionAnswered(userId, ["cinema"], 1);

    expect(completed).toHaveLength(1);
    expect(completed[0]?.id).toBe(101);
    expect(completed[0]?.coinsEarned).toBe(10);
    expect(completed[0]?.category).toBe("SHORT");

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should allow reroll of an uncompleted quest once per day", async () => {
    const today = new Date().toISOString().split("T")[0];
    const mockShort = {
      id: 101,
      userId,
      category: "SHORT",
      questType: "ANSWER_THEME_QUESTIONS",
      targetTheme: "cinema",
      themeName: "Cinéma",
      title: "Spécialiste Cinéma",
      target: 5,
      progress: 1,
      claimed: false,
      coinsReward: 10,
      dateStr: today,
    };

    (prisma.userDailyQuest.findUnique as any).mockResolvedValue(mockShort);
    (prisma.userDailyQuest.update as any).mockResolvedValue({
      ...mockShort,
      targetTheme: "histoire",
      themeName: "Histoire",
      title: "Spécialiste Histoire",
      progress: 0,
      rerolled: true,
    });

    const result = await dailyRewardService.rerollDailyQuest(userId, 101);

    expect(result.success).toBe(true);
    expect(result.canRerollToday).toBe(false);
    expect(prisma.userWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: { lastQuestRerollStr: today },
      }),
    );
  });

  it("should prevent reroll if user already rerolled today", async () => {
    const today = new Date().toISOString().split("T")[0];
    (prisma.userWallet.findUnique as any).mockResolvedValue({
      userId,
      lastQuestRerollStr: today, // already rerolled today
    });

    await expect(dailyRewardService.rerollDailyQuest(userId, 101)).rejects.toThrow(
      "Vous avez déjà remplacé une quête aujourd'hui",
    );
  });
});
