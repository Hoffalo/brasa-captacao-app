import { parseContent, parseOwners, parseSchedule } from "./parsing";
import { isPriority, isStatus, type Recording, type SeriesGoal } from "./recording";

/**
 * Layout of the capture sheet (the "Captacao BSA26" format: one tab per group, header on row 4).
 * Columns are found by their header text, so moving a column in the sheet does not break the app.
 * Adding a tab is adding an entry to RECORDING_TABS.
 */

export interface TabLayout {
  tab: string;
  headerRow: number;
  keyHeader: string;
  /** Label used when the tab has no "Tipo" column. */
  defaultKind: string;
  kindHeader?: string;
  organizationHeader?: string;
}

export const RECORDING_TABS: readonly TabLayout[] = [
  { tab: "Palestrantes e Reps", headerRow: 4, keyHeader: "Nome", defaultKind: "Palestrante", kindHeader: "Tipo", organizationHeader: "Empresa / Org." },
  { tab: "Bolsistas", headerRow: 4, keyHeader: "Nome", defaultKind: "Bolsista", organizationHeader: "Universidade" },
  { tab: "BLs", headerRow: 4, keyHeader: "BL", defaultKind: "BL", organizationHeader: "Quem vai da liderança" },
];

export const COLUMNS = {
  status: "Status",
  content: "Conteúdo",
  whereWhen: "Onde / quando captar",
  priority: "Prioridade",
  owners: "Responsável",
  driveLink: "Link do Drive",
  notes: "Observações",
} as const;

export const SERIES_TAB = {
  tab: "Séries de conteúdo",
  headerRow: 1,
  seriesHeader: "Série",
  questionHeader: "Pergunta (ler igual para todo mundo)",
  goalHeader: "Meta de respostas",
} as const;

/** Rows below the series table ("Como gravar", "Com a Monking") are notes, not series. */
const SERIES_NOTE_ROWS = new Set(["Como gravar", "Com a Monking"]);

/** The anchors' videomakers. Rows whose video owner is this name never show up for the team. */
export const EXTERNAL_VIDEOMAKER = "Monking";

export function tabRange(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

export function columnLetter(index: number): string {
  let letter = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
}

function cellReader(header: readonly string[], row: readonly string[]) {
  const positions = new Map(header.map((label, index) => [label.trim(), index]));
  return (label: string | undefined): string => {
    if (!label) return "";
    const index = positions.get(label);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
}

/** `rows` starts at row 1 of the tab, exactly as the Sheets API returns it. */
export function mapRecordingRows(layout: TabLayout, rows: readonly (readonly string[])[]): Recording[] {
  const header = rows[layout.headerRow - 1] ?? [];
  return rows.slice(layout.headerRow).flatMap((row) => {
    const cell = cellReader(header, row);
    const name = cell(layout.keyHeader);
    if (!name) return [];
    const { series, question } = parseContent(cell(COLUMNS.content));
    const owners = parseOwners(cell(COLUMNS.owners));
    const status = cell(COLUMNS.status);
    const priority = cell(COLUMNS.priority);
    const whereWhen = cell(COLUMNS.whereWhen);
    const recording: Recording = {
      key: { tab: layout.tab, name },
      kind: cell(layout.kindHeader) || layout.defaultKind,
      organization: cell(layout.organizationHeader),
      series,
      question,
      whereWhen,
      priority: isPriority(priority) ? priority : "",
      videoOwner: owners.video,
      photoOwner: owners.photos,
      status: isStatus(status) ? status : "Para gravar",
      driveLink: cell(COLUMNS.driveLink),
      notes: cell(COLUMNS.notes),
      isAnchor: owners.video === EXTERNAL_VIDEOMAKER,
      schedule: parseSchedule(whereWhen),
    };
    return [recording];
  });
}

export function mapSeriesGoals(rows: readonly (readonly string[])[]): SeriesGoal[] {
  const header = rows[SERIES_TAB.headerRow - 1] ?? [];
  return rows.slice(SERIES_TAB.headerRow).flatMap((row) => {
    const cell = cellReader(header, row);
    const series = cell(SERIES_TAB.seriesHeader);
    if (!series || SERIES_NOTE_ROWS.has(series)) return [];
    const goal = Number.parseInt(cell(SERIES_TAB.goalHeader), 10);
    return [{ series, question: cell(SERIES_TAB.questionHeader), goal: Number.isNaN(goal) ? null : goal }];
  });
}

/** `keyColumn` starts at row 1. Returns the 1-based sheet row of `name`, or null if it is gone. */
export function findRowNumber(keyColumn: readonly string[], headerRow: number, name: string): number | null {
  const wanted = name.trim();
  for (let index = headerRow; index < keyColumn.length; index += 1) {
    if ((keyColumn[index] ?? "").trim() === wanted) return index + 1;
  }
  return null;
}

export function layoutOf(tab: string): TabLayout {
  const layout = RECORDING_TABS.find((candidate) => candidate.tab === tab);
  if (!layout) throw new UnknownTabError(tab);
  return layout;
}

export class UnknownTabError extends Error {
  constructor(tab: string) {
    super(`A aba "${tab}" não faz parte da captação.`);
    this.name = "UnknownTabError";
  }
}
