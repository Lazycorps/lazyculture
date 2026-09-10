import { describe, it, expect } from "vite-plus/test";
import { validateUsername, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "./user";

describe("validateUsername", () => {
  it("rejette les types non string", () => {
    expect(validateUsername(null).valid).toBe(false);
    expect(validateUsername(undefined).valid).toBe(false);
    expect(validateUsername(123).valid).toBe(false);
    expect(validateUsername({}).valid).toBe(false);
  });

  it("rejette les pseudos de moins de 4 caractères", () => {
    const res = validateUsername("abc");
    expect(res.valid).toBe(false);
    expect(res.error).toContain(`entre ${USERNAME_MIN_LENGTH} et ${USERNAME_MAX_LENGTH}`);
  });

  it("rejette les pseudos de plus de 16 caractères", () => {
    const res = validateUsername("abcdefghijklmnopq");
    expect(res.valid).toBe(false);
    expect(res.error).toContain(`entre ${USERNAME_MIN_LENGTH} et ${USERNAME_MAX_LENGTH}`);
  });

  it("rejette les pseudos avec des caractères interdits comme balises ou symboles", () => {
    expect(validateUsername("<script>").valid).toBe(false);
    expect(validateUsername("Jean#123").valid).toBe(false);
    expect(validateUsername("User@Name").valid).toBe(false);
    expect(validateUsername("Joueur*").valid).toBe(false);
  });

  it("rejette les pseudos avec moins de 3 lettres/chiffres alphanumériques", () => {
    expect(validateUsername("---a").valid).toBe(false);
    expect(validateUsername("  ab  ").valid).toBe(false);
    expect(validateUsername("__12__").valid).toBe(false);
  });

  it("accepte les pseudos valides avec lettres, chiffres, tirets, underscores et accents français", () => {
    expect(validateUsername("Paul").valid).toBe(true);
    expect(validateUsername("Jean-Luc").valid).toBe(true);
    expect(validateUsername("Élise_99").valid).toBe(true);
    expect(validateUsername("Cédric D").valid).toBe(true);
    expect(validateUsername("Gaël-123").valid).toBe(true);
    expect(validateUsername("Super_Gamer_01").valid).toBe(true);
  });

  it("retire les espaces aux extrémités (trim)", () => {
    const res = validateUsername("  SuperHero  ");
    expect(res.valid).toBe(true);
    expect(res.trimmed).toBe("SuperHero");
  });
});
