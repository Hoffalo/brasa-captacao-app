import { describe, expect, it } from "vitest";
import { buildFileName, slugify } from "@/domain/naming";

describe("slugify", () => {
  it("removes accents and joins words with underscores", () => {
    expect(slugify("Domênica Augusta Corradi")).toBe("Domenica_Augusta_Corradi");
  });

  it("drops punctuation", () => {
    expect(slugify("Podpah (Igão, Mítico e Victor Assis)")).toBe("Podpah_Igao_Mitico_e_Victor_Assis");
  });
});

describe("buildFileName", () => {
  it("names the first take with the series code, the person and number 1", () => {
    const name = buildFileName({
      series: "PRIMEIRO DEGRAU",
      personName: "Fabio Kapitanovas",
      originalFileName: "IMG_4512.MOV",
      existingNames: [],
    });

    expect(name).toBe("DEGRAU_Fabio_Kapitanovas_1.mov");
  });

  it("numbers a retake after the takes already in the folder", () => {
    const name = buildFileName({
      series: "SONHAR SEM LIMITES",
      personName: "Pietro de Souza",
      originalFileName: "video.mp4",
      existingNames: ["SONHAR_Pietro_de_Souza_1.mp4", "SONHAR_Pietro_de_Souza_2.mov", "outro.mp4"],
    });

    expect(name).toBe("SONHAR_Pietro_de_Souza_3.mp4");
  });

  it("falls back to a slug of the series when the series has no short code", () => {
    const name = buildFileName({
      series: "UMA PALAVRA",
      personName: "Ana",
      originalFileName: "a.mov",
      existingNames: [],
    });

    expect(name).toBe("UMA_PALAVRA_Ana_1.mov");
  });
});
