import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { updateUserRank } from "./rankHelper";
import { updateShowdownUserRank } from "./showdownRankHelper";
import prisma from "~~/server/utils/prisma";

vi.mock("~~/server/utils/prisma", () => {
  return {
    default: {
      battleRoyaleRank: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      showdownRank: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe("rankHelper - updateUserRank Protection Logic (Battle Royale)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not demote if user has points in division (> 0 LP)", async () => {
    const oldPoints = 420;

    (prisma.battleRoyaleRank.findUnique as any).mockResolvedValue({
      userId: "user_test",
      points: oldPoints,
      wins: 10,
      gamesPlayed: 20,
    });

    (prisma.battleRoyaleRank.update as any).mockImplementation(({ data }: any) => {
      return Promise.resolve({
        userId: "user_test",
        points: data.points,
        wins: 10,
        gamesPlayed: 21,
      });
    });

    const result = await updateUserRank("user_test", 10, 10);

    expect(result.oldPoints).toBe(420);
    expect(result.newPoints).toBe(400); // Capped at division base (Silver II)
    expect(result.lpChange).toBe(-20); // Adjusted from -25 to -20
    expect(result.isDemoted).toBe(false);
    expect(result.newRank.tier).toBe("Silver");
    expect(result.newRank.division).toBe("II");
    expect(result.newRank.pointsInDivision).toBe(0);
  });

  it("should demote if user is at 0 LP in division", async () => {
    const oldPoints = 400;

    (prisma.battleRoyaleRank.findUnique as any).mockResolvedValue({
      userId: "user_test",
      points: oldPoints,
      wins: 10,
      gamesPlayed: 20,
    });

    (prisma.battleRoyaleRank.update as any).mockImplementation(({ data }: any) => {
      return Promise.resolve({
        userId: "user_test",
        points: data.points,
        wins: 10,
        gamesPlayed: 21,
      });
    });

    const result = await updateUserRank("user_test", 10, 10);

    expect(result.oldPoints).toBe(400);
    expect(result.newPoints).toBe(375); // Demoted
    expect(result.lpChange).toBe(-25); // Full loss of 25
    expect(result.isDemoted).toBe(true);
    expect(result.newRank.tier).toBe("Silver");
    expect(result.newRank.division).toBe("III");
    expect(result.newRank.pointsInDivision).toBe(75);
  });
});

describe("showdownRankHelper - updateShowdownUserRank Protection Logic (Showdown)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not demote if user has points in division (> 0 LP)", async () => {
    const oldPoints = 420;

    (prisma.showdownRank.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.userId === "user_test") {
        return Promise.resolve({
          userId: "user_test",
          points: oldPoints,
          wins: 10,
          gamesPlayed: 20,
        });
      } else {
        return Promise.resolve({
          userId: "opponent_test",
          points: 200,
          wins: 10,
          gamesPlayed: 20,
        });
      }
    });

    (prisma.showdownRank.update as any).mockImplementation(({ data }: any) => {
      return Promise.resolve({
        userId: "user_test",
        points: data.points,
        wins: 10,
        gamesPlayed: 21,
      });
    });

    const result = await updateShowdownUserRank("user_test", "opponent_test", false);

    expect(result.oldPoints).toBe(420);
    expect(result.newPoints).toBe(400); // Capped at division base (Silver II)
    expect(result.lpChange).toBe(-20); // Adjusted from -25 to -20
    expect(result.isDemoted).toBe(false);
    expect(result.newRank.tier).toBe("Silver");
    expect(result.newRank.division).toBe("II");
    expect(result.newRank.pointsInDivision).toBe(0);
  });

  it("should demote if user is at 0 LP in division", async () => {
    const oldPoints = 400;

    (prisma.showdownRank.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.userId === "user_test") {
        return Promise.resolve({
          userId: "user_test",
          points: oldPoints,
          wins: 10,
          gamesPlayed: 20,
        });
      } else {
        return Promise.resolve({
          userId: "opponent_test",
          points: 200,
          wins: 10,
          gamesPlayed: 20,
        });
      }
    });

    (prisma.showdownRank.update as any).mockImplementation(({ data }: any) => {
      return Promise.resolve({
        userId: "user_test",
        points: data.points,
        wins: 10,
        gamesPlayed: 21,
      });
    });

    const result = await updateShowdownUserRank("user_test", "opponent_test", false);

    expect(result.oldPoints).toBe(400);
    expect(result.newPoints).toBe(375); // Demoted
    expect(result.lpChange).toBe(-25); // Full loss of 25
    expect(result.isDemoted).toBe(true);
    expect(result.newRank.tier).toBe("Silver");
    expect(result.newRank.division).toBe("III");
    expect(result.newRank.pointsInDivision).toBe(75);
  });
});
