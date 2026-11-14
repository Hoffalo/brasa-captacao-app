import { describe, expect, it } from "vitest";
import { highPriorityPending, pendingByOwner, progressByOwner, seriesProgress } from "@/domain/dashboard";
import type { Recording } from "@/domain/recording";

function recording(overrides: Partial<Recording>): Recording {
  return {
    key: { tab: "Palestrantes e Reps", name: "Pessoa" },
    kind: "Palestrante",
    organization: "",
    series: "PRIMEIRO DEGRAU",
    question: "",
    whereWhen: "",
    priority: "Média",
    videoOwner: "Carol Novaes",
    photoOwner: "",
    status: "Para gravar",
    driveLink: "",
    notes: "",
    isAnchor: false,
    schedule: null,
    ...overrides,
  };
}

describe("seriesProgress", () => {
  it("counts recorded takes against the goal of each series", () => {
    const recordings = [recording({ status: "Gravado" }), recording({}), recording({ series: "POR QUE VIR", status: "Gravado" })];

    const progress = seriesProgress(recordings, [{ series: "PRIMEIRO DEGRAU", question: "", goal: 8 }]);

    expect(progress).toEqual([{ series: "PRIMEIRO DEGRAU", recorded: 1, listed: 2, goal: 8 }]);
  });
});

describe("pendingByOwner", () => {
  it("groups open and done recordings by the video owner, leaving anchors out", () => {
    const recordings = [
      recording({}), recording({ status: "Gravado" }), recording({ videoOwner: "Ana Dantas", status: "Não veio" }),
      recording({ videoOwner: "Monking", isAnchor: true }),
    ];

    expect(pendingByOwner(recordings)).toEqual([
      { owner: "Ana Dantas", pending: 0, done: 1 },
      { owner: "Carol Novaes", pending: 1, done: 1 },
    ]);
  });
});

describe("progressByOwner", () => {
  it("counts recorded, missed and total takes for each video owner", () => {
    const recordings = [
      recording({ status: "Gravado" }), recording({ status: "Não veio" }), recording({}),
      recording({ videoOwner: "Ana Dantas", status: "Gravado" }),
    ];

    const progress = progressByOwner(recordings).map(({ owner, recorded, missed, total }) => ({ owner, recorded, missed, total }));

    expect(progress).toEqual([
      { owner: "Ana Dantas", recorded: 1, missed: 0, total: 1 },
      { owner: "Carol Novaes", recorded: 1, missed: 1, total: 3 },
    ]);
  });

  it("puts the external videomaker after the team", () => {
    const recordings = [recording({ videoOwner: "Monking", isAnchor: true }), recording({ videoOwner: "Ana Dantas" })];

    expect(progressByOwner(recordings).map((progress) => progress.owner)).toEqual(["Ana Dantas", "Monking"]);
  });

  it("leaves out rows that nobody records on video", () => {
    expect(progressByOwner([recording({ videoOwner: "" })])).toEqual([]);
  });

  it("lists open recordings before closed ones, in schedule order", () => {
    const recordings = [
      recording({ key: { tab: "t", name: "Gravada" }, status: "Gravado" }),
      recording({ key: { tab: "t", name: "Tarde" }, schedule: { day: 6, minutes: 900 } }),
      recording({ key: { tab: "t", name: "Manhã" }, schedule: { day: 6, minutes: 540 } }),
    ];

    const [carol] = progressByOwner(recordings);

    expect(carol.recordings.map((item) => item.key.name)).toEqual(["Manhã", "Tarde", "Gravada"]);
  });
});

describe("highPriorityPending", () => {
  it("lists only high priority rows that were not recorded yet", () => {
    const recordings = [recording({ priority: "Alta" }), recording({ priority: "Alta", status: "Gravado" }), recording({ priority: "Baixa" })];

    expect(highPriorityPending(recordings)).toHaveLength(1);
  });
});
