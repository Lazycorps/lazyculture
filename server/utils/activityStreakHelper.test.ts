import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  computeActivityStreak,
  getStreakTimeline,
  toLocalDateStr,
  getPastLocalDateStr,
} from "./activityStreakHelper";
import prisma from "~~/server/utils/prisma";

vi.mock("~~/server/utils/prisma", () => {
  return {
    default: {
      userStreakDay: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      questionResponse: {
        findMany: vi.fn(),
      },
      questionSeriesResponse: {
        findMany: vi.fn(),
      },
      userWallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

describe("activityStreakHelper", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.questionResponse.findMany as any).mockResolvedValue([]);
    (prisma.questionSeriesResponse.findMany as any).mockResolvedValue([]);
  });

  it("should return streak 0 if no days were played", async () => {
    (prisma.userStreakDay.findMany as any).mockResolvedValue([]);

    const streak = await computeActivityStreak(userId);
    expect(streak).toBe(0);
  });

  it("should return streak 3 if 3 consecutive days were played (including today)", async () => {
    const today = new Date();
    const day1 = toLocalDateStr(today);
    const day2 = getPastLocalDateStr(1, today);
    const day3 = getPastLocalDateStr(2, today);

    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: day1, status: "PLAYED", streakCount: 3, claimed: true },
      { dateStr: day2, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day3, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const streak = await computeActivityStreak(userId);
    expect(streak).toBe(3);
  });

  it("should maintain streak from yesterday if user has not played today yet", async () => {
    const today = new Date();
    const dayYesterday = getPastLocalDateStr(1, today);
    const dayBeforeYesterday = getPastLocalDateStr(2, today);

    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: dayYesterday, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: dayBeforeYesterday, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const streak = await computeActivityStreak(userId);
    expect(streak).toBe(2);
  });

  it("should connect broken streak through a REPAIRED day", async () => {
    const today = new Date();
    const dayToday = toLocalDateStr(today);
    const dayYesterday = getPastLocalDateStr(1, today);
    const day2 = getPastLocalDateStr(2, today);
    const day3 = getPastLocalDateStr(3, today);

    // Day 1: PLAYED (today)
    // Day 2: REPAIRED (yesterday was missed and repaired)
    // Day 3 & 4: PLAYED
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: dayToday, status: "PLAYED", streakCount: 4, claimed: false },
      { dateStr: dayYesterday, status: "REPAIRED", streakCount: 3, claimed: false },
      { dateStr: day2, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day3, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const streak = await computeActivityStreak(userId);
    expect(streak).toBe(4);
  });

  it("should correctly build timeline data and detect repair eligibility", async () => {
    const today = new Date();
    const day2 = getPastLocalDateStr(2, today);
    const day3 = getPastLocalDateStr(3, today);

    // User played J-2 and J-3, missed yesterday (J-1), has not played today
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: day2, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day3, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const timelineData = await getStreakTimeline(userId, 7);

    expect(timelineData.currentStreak).toBe(0); // Streak broken because yesterday not played
    expect(timelineData.hasAnsweredToday).toBe(false);
    expect(timelineData.canRepair).toBe(true);
    expect(timelineData.missedDaysCount).toBe(1);
    expect(timelineData.repairCost).toBe(20);
    expect(timelineData.previousStreakToRestore).toBe(2);
    expect(timelineData.timeline.length).toBe(7);

    const todayItem = timelineData.timeline[timelineData.timeline.length - 1];
    expect(todayItem?.isToday).toBe(true);
    expect(todayItem?.status).toBe("TODAY_PENDING");

    const yesterdayItem = timelineData.timeline[timelineData.timeline.length - 2];
    expect(yesterdayItem?.status).toBe("MISSED");
  });

  it("should allow repair for up to 3 missed days with progressive costs", async () => {
    const today = new Date();
    const day3 = getPastLocalDateStr(3, today);
    const day4 = getPastLocalDateStr(4, today);

    // Scenario: User missed 2 days (J-1 and J-2), played J-3 and J-4
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: day3, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day4, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const timeline2Days = await getStreakTimeline(userId, 7);
    expect(timeline2Days.canRepair).toBe(true);
    expect(timeline2Days.missedDaysCount).toBe(2);
    expect(timeline2Days.repairCost).toBe(50); // 2 days = 50 🪙
    expect(timeline2Days.previousStreakToRestore).toBe(2);

    // Scenario: User missed 3 days (J-1, J-2, J-3), played 5 consecutive days before that (J-4 to J-8)
    const day5 = getPastLocalDateStr(5, today);
    const day6 = getPastLocalDateStr(6, today);
    const day7 = getPastLocalDateStr(7, today);
    const day8 = getPastLocalDateStr(8, today);
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: day4, status: "PLAYED", streakCount: 5, claimed: true },
      { dateStr: day5, status: "PLAYED", streakCount: 4, claimed: true },
      { dateStr: day6, status: "PLAYED", streakCount: 3, claimed: true },
      { dateStr: day7, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day8, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const timeline3Days = await getStreakTimeline(userId, 7);
    expect(timeline3Days.canRepair).toBe(true);
    expect(timeline3Days.missedDaysCount).toBe(3);
    expect(timeline3Days.repairCost).toBe(90); // 3 days = 90 🪙
    expect(timeline3Days.previousStreakToRestore).toBe(5);

    // Scenario: User missed 4 days (J-1, J-2, J-3, J-4)
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: day5, status: "PLAYED", streakCount: 5, claimed: true },
    ]);

    const timeline4Days = await getStreakTimeline(userId, 7);
    expect(timeline4Days.canRepair).toBe(false); // 4 days > max 3 days
  });

  it("should allow repair and compute full streak when user has ALREADY played today", async () => {
    const today = new Date();
    const dayToday = toLocalDateStr(today);
    const day2 = getPastLocalDateStr(2, today);
    const day3 = getPastLocalDateStr(3, today);

    // User played J-3, J-2 (streak was 2), missed yesterday (J-1), but played today (J0)
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: dayToday, status: "PLAYED", streakCount: 1, claimed: false },
      { dateStr: day2, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day3, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    // 1. Prior to repair: canRepair is true, previous streak was 2, current streak is 1
    const timelineData = await getStreakTimeline(userId, 7);
    expect(timelineData.canRepair).toBe(true);
    expect(timelineData.missedDaysCount).toBe(1);
    expect(timelineData.previousStreakToRestore).toBe(2);
    expect(timelineData.currentStreak).toBe(1);

    // 2. Once yesterday is repaired:
    const dayYesterday = getPastLocalDateStr(1, today);
    (prisma.userStreakDay.findMany as any).mockResolvedValue([
      { dateStr: dayToday, status: "PLAYED", streakCount: 4, claimed: false },
      { dateStr: dayYesterday, status: "REPAIRED", streakCount: 3, claimed: false },
      { dateStr: day2, status: "PLAYED", streakCount: 2, claimed: true },
      { dateStr: day3, status: "PLAYED", streakCount: 1, claimed: true },
    ]);

    const streakAfterRepair = await computeActivityStreak(userId);
    expect(streakAfterRepair).toBe(4); // 2 past + 1 repaired + 1 today = 4
  });
});
