import { describe, expect, it } from "vitest";
import { findRowNumber, mapRecordingRows, mapSeriesGoals, RECORDING_TABS } from "@/domain/sheetLayout";

const speakersTab = RECORDING_TABS.find((tab) => tab.tab === "Palestrantes e Reps")!;
// Rows 1 to 3 hold the title and the source line; the header is on row 4, like in the real sheet.
const titleRows = [["BSE26 | Palestrantes"], ["Fonte: Master"], []];
const header = [
  "Nome", "Status", "Tipo", "Empresa / Org.", "Dia", "Sessão na grade", "Onde / quando captar",
  "Coquetel (sex)", "Conteúdo", "Prioridade", "Responsável", "Link do Drive", "Observações",
];

describe("mapRecordingRows", () => {
  it("maps a speaker row by header name, not by position", () => {
    const rows = [
      ...titleRows,
      header,
      ["Karla Felmanas", "Para gravar", "Palestrante", "Cimed", "Sáb", "Painel", "Sáb 14/11 ~15h50", "A confirmar",
        "PRIMEIRO DEGRAU: 'Pergunta?'", "Média", "Vídeo: Carol Novaes | Fotos: Domênica Augusta Corradi", "", ""],
    ];

    const [recording] = mapRecordingRows(speakersTab, rows);

    expect(recording).toMatchObject({
      key: { tab: "Palestrantes e Reps", name: "Karla Felmanas" },
      kind: "Palestrante",
      organization: "Cimed",
      series: "PRIMEIRO DEGRAU",
      videoOwner: "Carol Novaes",
      status: "Para gravar",
      isAnchor: false,
    });
  });

  it("marks rows recorded only by Monking as anchors", () => {
    const rows = [...titleRows, header, ["Sergio Fajerman", "Para gravar", "Âncora", "Itaú", "", "", "", "", "AFTERMOVIE (âncora): x", "Alta", "Vídeo: Monking | Fotos: Lorenzo Hoffmann", "", ""]];

    expect(mapRecordingRows(speakersTab, rows)[0].isAnchor).toBe(true);
  });

  it("skips blank rows and unknown statuses fall back to Para gravar", () => {
    const rows = [...titleRows, header, ["", "", "", "", "", "", "", "", "", "", "", "", ""], ["Ana", "???", "", "", "", "", "", "", "", "", "", "", ""]];

    const recordings = mapRecordingRows(speakersTab, rows);

    expect(recordings).toHaveLength(1);
    expect(recordings[0].status).toBe("Para gravar");
  });
});

describe("mapSeriesGoals", () => {
  it("reads the numeric goal of each series", () => {
    const rows = [["Série", "Pergunta (ler igual para todo mundo)", "Para que serve", "Quem responde", "Formato final", "Meta de respostas"],
      ["POR QUE VIR", "Pergunta", "", "", "", "6+"], ["AFTERMOVIE (ÂNCORAS)", "", "", "", "", "3"], ["Como gravar", "regras", "", "", "", ""]];

    expect(mapSeriesGoals(rows)).toEqual([
      { series: "POR QUE VIR", question: "Pergunta", goal: 6 },
      { series: "AFTERMOVIE (ÂNCORAS)", question: "", goal: 3 },
    ]);
  });
});

describe("findRowNumber", () => {
  it("returns the 1-based sheet row of a name below the header", () => {
    const keyColumn = ["BSE26 | x", "", "", "Nome", "Ana", "Karla Felmanas"];

    expect(findRowNumber(keyColumn, 4, "Karla Felmanas")).toBe(6);
  });

  it("returns null when the name is not in the tab anymore", () => {
    expect(findRowNumber(["", "", "", "Nome", "Ana"], 4, "Bia")).toBeNull();
  });
});
