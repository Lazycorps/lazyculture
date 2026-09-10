import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { userService } from "./UserService";
import prisma from "../utils/prisma";
import { USERNAME_CHANGE_COST } from "#shared/user";
import { spendCoins } from "../utils/walletHelper";
import { checkAndAwardAchievements } from "../utils/achievementHelper";

const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userWallet: {
      updateMany: vi.fn(),
    },
  };
  return { mockTx };
});

vi.mock("../utils/prisma", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      userWallet: {
        updateMany: vi.fn(),
      },
      battleRoyaleMatch: {
        updateMany: vi.fn(),
      },
      showdownMatch: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
    },
  };
});

vi.mock("../utils/walletHelper", () => ({
  coinsFromXp: vi.fn((xp: number) => Math.ceil(xp / 10)),
  grantCoins: vi.fn(),
  spendCoins: vi.fn(),
}));

vi.mock("../utils/achievementHelper", () => ({
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
}));

describe("UserService - setUsername", () => {
  const userId = "user-123";
  const email = "user@test.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation d'unicité", () => {
    it("doit refuser le changement si un autre joueur a déjà le même pseudonyme (insensible à la casse)", async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: userId,
        name: "OldName",
        slug: "oldname",
        Wallet: { coins: 1000 },
      });

      mockTx.user.findFirst.mockResolvedValue({
        id: "other-user-999",
        name: "NewPseudo",
        slug: "newpseudo",
      });

      await expect(userService.setUsername(userId, email, "newpseudo")).rejects.toMatchObject({
        statusCode: 409,
        statusMessage: "Ce pseudonyme est déjà utilisé par un autre joueur.",
      });

      expect(mockTx.user.update).not.toHaveBeenCalled();
      expect(spendCoins).not.toHaveBeenCalled();
    });

    it("doit refuser le changement si un autre joueur a déjà le même slug généré", async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: userId,
        name: "OldName",
        slug: "oldname",
        Wallet: { coins: 1000 },
      });

      // Simule un conflit sur le slug (ex: "Alex-Pro" vs "Alex Pro")
      mockTx.user.findFirst.mockResolvedValue({
        id: "other-user-888",
        name: "Alex-Pro",
        slug: "alex_pro",
      });

      await expect(userService.setUsername(userId, email, "Alex Pro")).rejects.toMatchObject({
        statusCode: 409,
        statusMessage: "Ce pseudonyme est déjà utilisé par un autre joueur.",
      });

      expect(mockTx.user.update).not.toHaveBeenCalled();
      expect(spendCoins).not.toHaveBeenCalled();
    });
  });

  describe("Règle de facturation en pièces (gold)", () => {
    it("doit autoriser gratuitement le 1er choix de pseudo quand l'utilisateur a un name vide", async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: userId,
        name: "",
        slug: "",
        Wallet: { coins: 0 },
      });
      mockTx.user.findFirst.mockResolvedValue(null);
      mockTx.user.update.mockResolvedValue({
        id: userId,
        name: "FirstPseudo",
        slug: "firstpseudo",
        Wallet: { coins: 0 },
      });

      const result = await userService.setUsername(userId, email, "FirstPseudo");

      expect(spendCoins).not.toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            name: "FirstPseudo",
            slug: "firstpseudo",
          }),
        }),
      );
      expect(result.name).toBe("FirstPseudo");
      expect(result.email).toBe(email);
    });

    it("doit refuser la modification si l'utilisateur possède déjà un pseudo et a moins de 500 pièces", async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: userId,
        name: "CurrentPseudo",
        slug: "currentpseudo",
        Wallet: { coins: 350 },
      });
      mockTx.user.findFirst.mockResolvedValue(null);

      await expect(userService.setUsername(userId, email, "BrandNewPseudo")).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: expect.stringContaining(
          "Pièces insuffisantes : vous possédez 350 🪙 sur les 500 🪙",
        ),
      });

      expect(spendCoins).not.toHaveBeenCalled();
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    it("doit débiter 500 pièces et mettre à jour le pseudonyme si le solde est suffisant", async () => {
      mockTx.user.findUnique.mockResolvedValue({
        id: userId,
        name: "CurrentPseudo",
        slug: "currentpseudo",
        Wallet: { coins: 800 },
      });
      mockTx.user.findFirst.mockResolvedValue(null);
      mockTx.user.update.mockResolvedValue({
        id: userId,
        name: "BrandNewPseudo",
        slug: "brandnewpseudo",
        Wallet: { coins: 300 },
      });

      const result = await userService.setUsername(userId, email, "BrandNewPseudo");

      expect(spendCoins).toHaveBeenCalledWith(mockTx, userId, USERNAME_CHANGE_COST);
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            name: "BrandNewPseudo",
            slug: "brandnewpseudo",
          }),
        }),
      );
      expect(result.name).toBe("BrandNewPseudo");
      expect(checkAndAwardAchievements).toHaveBeenCalledWith(userId, "changePseudo", 1);
    });

    it("ne doit rien débiter ni modifier si le nouveau pseudo est identique au pseudo actuel", async () => {
      const existingUser = {
        id: userId,
        name: "IdenticalPseudo",
        slug: "identicalpseudo",
        Wallet: { coins: 1000 },
      };
      mockTx.user.findUnique.mockResolvedValue(existingUser);

      const result = await userService.setUsername(userId, email, "IdenticalPseudo");

      expect(mockTx.user.findFirst).not.toHaveBeenCalled();
      expect(spendCoins).not.toHaveBeenCalled();
      expect(mockTx.user.update).not.toHaveBeenCalled();
      expect(result.name).toBe("IdenticalPseudo");
    });
  });

  describe("Méthode slugify", () => {
    it("doit générer un slug valide en minuscules avec des underscores", () => {
      expect(userService.slugify("Super Player")).toBe("super_player");
      expect(userService.slugify("  Alpha-Beta  ")).toBe("alpha_beta");
      expect(userService.slugify("Gamer#123!")).toBe("gamer123");
    });
  });
});
