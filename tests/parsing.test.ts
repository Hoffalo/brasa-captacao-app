import { describe, expect, it } from "vitest";
import { parseContent, parseOwners, parseSchedule } from "@/domain/parsing";

describe("parseContent", () => {
  it("reads the series name and the exact question of a speaker row", () => {
    const content = "PRIMEIRO DEGRAU: 'Em uma frase, que conselho você daria para você mesmo no primeiro dia de estágio?'";

    const parsed = parseContent(content);

    expect(parsed).toEqual({
      series: "PRIMEIRO DEGRAU",
      question: "Em uma frase, que conselho você daria para você mesmo no primeiro dia de estágio?",
    });
  });

  it("skips the lowercase prefix of a collective BL take", () => {
    const content = "Take coletivo no Encontro de BLs: REDE EM UMA FRASE: 'Qual foi o momento mais inesquecível da sua BRASA Local este ano?'";

    expect(parseContent(content).series).toBe("REDE EM UMA FRASE");
  });

  it("keeps the free text when an anchor row has no quoted question", () => {
    const content = "AFTERMOVIE (âncora): pergunta própria no briefing da Monking.";

    expect(parseContent(content)).toEqual({ series: "AFTERMOVIE", question: "pergunta própria no briefing da Monking." });
  });

  it("returns empty fields for an empty cell", () => {
    expect(parseContent("")).toEqual({ series: "", question: "" });
  });
});

describe("parseOwners", () => {
  it("splits video and photo owners", () => {
    expect(parseOwners("Vídeo: Carol Novaes | Fotos: Domênica Augusta Corradi")).toEqual({
      video: "Carol Novaes",
      photos: "Domênica Augusta Corradi",
    });
  });

  it("returns empty owners when the cell is blank", () => {
    expect(parseOwners("")).toEqual({ video: "", photos: "" });
  });
});

describe("parseSchedule", () => {
  it.each([
    ["Sáb 14/11, nos corredores ~9h, antes do Painel", { day: 6, minutes: 540 }],
    ["Encontro de Bolsistas (sáb 13h10, Cafeteria)", { day: 6, minutes: 790 }],
    ["Coquetel (sex 13/11, 19h, Colegio Mayor Casa do Brasil) ou Feira", { day: 5, minutes: 1140 }],
    ["Tour de Rede (qui 12/11 a partir das 17h, ou sex 13/11 das 9h50 às 12h)", { day: 4, minutes: 1020 }],
  ])("finds the first slot in %s", (text, expected) => {
    expect(parseSchedule(text)).toEqual(expected);
  });

  it("returns null when there is no time", () => {
    expect(parseSchedule("Speed Mentoring, Cafeteria")).toBeNull();
  });
});
