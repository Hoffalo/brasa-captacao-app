import { describe, expect, it } from "vitest";
import { highPriorityPending, pendingByOwner, seriesProgress } from "@/domain/dashboard";
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

describe("highPriorityPending", () => {
  it("lists only high priority rows that were not recorded yet", () => {
    const recordings = [recording({ priority: "Alta" }), recording({ priority: "Alta", status: "Gravado" }), recording({ priority: "Baixa" })];

    expect(highPriorityPending(recordings)).toHaveLength(1);
  });
});
