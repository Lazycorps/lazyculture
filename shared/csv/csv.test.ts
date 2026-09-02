import { describe, expect, it } from "vite-plus/test";
import { detectDelimiter, parseCsv, serializeCsv } from "./csv";

describe("detectDelimiter", () => {
  it("détecte le point-virgule d'Excel FR", () => {
    expect(detectDelimiter("libelle;proposition_1;source")).toBe(";");
  });

  it("détecte la virgule des exports anglo-saxons", () => {
    expect(detectDelimiter("libelle,proposition_1,source")).toBe(",");
  });

  it("ignore les séparateurs situés dans un champ quoté", () => {
    // Une seule virgule réelle, deux à l'intérieur du champ quoté.
    expect(detectDelimiter('"a, b, c";libelle')).toBe(";");
  });
});

describe("parseCsv", () => {
  it("parse un fichier simple", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("gère les fins de ligne CRLF", () => {
    expect(parseCsv("a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("retire le BOM UTF-8", () => {
    expect(parseCsv("﻿libelle;source")).toEqual([["libelle", "source"]]);
  });

  it("préserve le séparateur à l'intérieur d'un champ quoté", () => {
    expect(parseCsv('libelle;source\n"Paris, Lyon ou Nice ?";Atlas')).toEqual([
      ["libelle", "source"],
      ["Paris, Lyon ou Nice ?", "Atlas"],
    ]);
  });

  it("décode les guillemets échappés", () => {
    expect(parseCsv('a\n"Il a dit ""bonjour"""')).toEqual([["a"], ['Il a dit "bonjour"']]);
  });

  it("préserve un retour à la ligne à l'intérieur d'un champ quoté", () => {
    expect(parseCsv('a;b\n"ligne 1\nligne 2";x')).toEqual([
      ["a", "b"],
      ["ligne 1\nligne 2", "x"],
    ]);
  });

  it("écarte le saut de ligne final sans ajouter de ligne fantôme", () => {
    expect(parseCsv("a;b\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("conserve les lignes vides intermédiaires pour ne pas décaler la numérotation", () => {
    expect(parseCsv("a;b\n\n1;2\n")).toEqual([["a", "b"], [""], ["1", "2"]]);
  });

  it("retourne un tableau vide pour un contenu vide", () => {
    expect(parseCsv("   \n  ")).toEqual([]);
  });
});

describe("serializeCsv", () => {
  it("échappe les champs contenant le séparateur, un guillemet ou un saut de ligne", () => {
    const csv = serializeCsv([["a;b", 'il a dit "oui"', "ligne1\nligne2", "choix"]]);
    expect(csv).toBe('"a;b";"il a dit ""oui""";"ligne1\nligne2";choix');
  });

  it("ajoute le BOM à la demande", () => {
    expect(serializeCsv([["a"]], ";", true).startsWith("﻿")).toBe(true);
  });

  it("fait un aller-retour fidèle", () => {
    const rows = [
      ["libelle", "source"],
      ['Qui a dit "je pense donc je suis" ?', "Descartes; Discours de la méthode"],
      ["Une question\nsur deux lignes", ""],
    ];
    expect(parseCsv(serializeCsv(rows, ";", true))).toEqual(rows);
  });
});
