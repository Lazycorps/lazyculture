import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { brainrunService } from "./BrainrunService";
import prisma from "../utils/prisma";
import { grantCoins } from "../utils/walletHelper";
import { recordUserStreakActivity } from "../utils/activityStreakHelper";
import { dailyRewardService } from "./DailyRewardService";

vi.mock("../utils/prisma", () => {
  return {
    default: {
      brainrunRun: {
        findFirst: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      brainrunRoom: {
        update: vi.fn(),
      },
      question: {
        findFirstOrThrow: vi.fn(),
      },
      questionResponse: {
        create: vi.fn(),
      },
      brainrunMetaProgress: {
        findUnique: vi.fn(),
      },
      questionTheme: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

vi.mock("../utils/walletHelper", () => ({
  grantCoins: vi.fn().mockResolvedValue(undefined),
  coinsFromXp: vi.fn().mockReturnValue(1),
}));

vi.mock("../utils/activityStreakHelper", () => ({
  recordUserStreakActivity: vi.fn().mockResolvedValue(1),
}));

vi.mock("./DailyRewardService", () => ({
  dailyRewardService: {
    handleQuestionAnswered: vi.fn().mockResolvedValue([]),
    getActivityStreakMultiplier: vi.fn().mockResolvedValue(1),
  },
}));

describe("BrainrunService - submitAnswer and theme progression tracking", () => {
  const userId = "user-test-brainrun-1";
  const runId = "run-test-1";
  const questionId = 42;

  const mockRoom = {
    id: "room-1",
    runId,
    act: 1,
    row: 1,
    col: 0,
    type: "STANDARD",
    status: "ACTIVE",
    questionIds: [questionId],
    responses: [],
    questionStartedAt: new Date(),
  };

  const createMockRun = (isDebugRun = false) => ({
    id: runId,
    userId,
    status: "IN_PROGRESS",
    currentAct: 1,
    currentRow: 1,
    currentCol: 0,
    healthPoint: 3,
    maxHealthPoint: 3,
    gold: 0,
    xpEarned: 0,
    knowledgePointsEarned: 0,
    knowledgePointsBonus: 0,
    coinsEarned: 0,
    createDate: new Date(),
    endDate: null,
    shieldCharges: 0,
    fiftyFiftyCharges: 0,
    relics: [],
    consumables: {},
    themeCoefficients: {},
    bannedThemes: [],
    pendingThemeBanChoice: false,
    erudition: 0,
    isDebugRun,
    rooms: [mockRoom],
  });

  const mockQuestion = {
    id: questionId,
    authorId: "author-user-99",
    xp_earned: 10,
    data: {
      theme: ["cinema", "culture-pop"],
      response: 1,
      commentaire: "Bravo !",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.question.findFirstOrThrow as any).mockResolvedValue(mockQuestion);
    (prisma.brainrunMetaProgress.findUnique as any).mockResolvedValue({
      userId,
      knowledgePoints: 0,
      maxEruditionUnlocked: 0,
      unlockedTalents: [],
      discoveredRelics: [],
      discoveredConsumables: [],
    });
    (prisma.brainrunRoom.update as any).mockResolvedValue({});
    (prisma.brainrunRun.update as any).mockResolvedValue({});
    (prisma.questionResponse.create as any).mockResolvedValue({ id: 1 });
  });

  it("should create QuestionResponse, grant author royalties and record streak on standard run", async () => {
    (prisma.brainrunRun.findFirst as any).mockResolvedValue(createMockRun(false));
    (prisma.brainrunRun.findUniqueOrThrow as any).mockResolvedValue({
      ...createMockRun(false),
      rooms: [
        {
          ...mockRoom,
          status: "CLEARED",
          responses: [
            {
              questionId,
              responseId: 1,
              success: true,
              hpLoss: 0,
              correctResponseId: 1,
            },
          ],
        },
      ],
    });

    await brainrunService.submitAnswer(runId, questionId, 1, userId);

    expect(prisma.questionResponse.create).toHaveBeenCalledWith({
      data: {
        userId,
        questionId,
        success: true,
        date: expect.any(Date),
      },
    });
    expect(grantCoins).toHaveBeenCalledWith("author-user-99", 1, false, false);
    expect(recordUserStreakActivity).toHaveBeenCalledWith(userId);
    expect(dailyRewardService.handleQuestionAnswered).toHaveBeenCalledWith(
      userId,
      ["cinema", "culture-pop"],
      1,
    );
  });

  it("should NOT create QuestionResponse, grant author royalties or record streak on debug run", async () => {
    (prisma.brainrunRun.findFirst as any).mockResolvedValue(createMockRun(true));
    (prisma.brainrunRun.findUniqueOrThrow as any).mockResolvedValue({
      ...createMockRun(true),
      rooms: [
        {
          ...mockRoom,
          status: "CLEARED",
          responses: [
            {
              questionId,
              responseId: 1,
              success: true,
              hpLoss: 0,
              correctResponseId: 1,
            },
          ],
        },
      ],
    });

    await brainrunService.submitAnswer(runId, questionId, 1, userId);

    expect(prisma.questionResponse.create).not.toHaveBeenCalled();
    expect(grantCoins).not.toHaveBeenCalled();
    expect(recordUserStreakActivity).not.toHaveBeenCalled();
    expect(dailyRewardService.handleQuestionAnswered).not.toHaveBeenCalled();
  });
});
