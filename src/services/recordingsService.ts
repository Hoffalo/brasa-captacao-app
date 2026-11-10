import type { CellUpdate, SpreadsheetReader, SpreadsheetWriter } from "@/contracts";
import { sameKey, type Recording, type RecordingKey, type SeriesGoal, type Status } from "@/domain/recording";
import {
  columnLetter, COLUMNS, findRowNumber, layoutOf, mapRecordingRows, mapSeriesGoals, RECORDING_TABS, SERIES_TAB, tabRange,
} from "@/domain/sheetLayout";

export interface CaptureBoard {
  recordings: Recording[];
  goals: SeriesGoal[];
}

export class RecordingNotFoundError extends Error {
  constructor(key: RecordingKey) {
    super(`"${key.name}" não está mais na aba ${key.tab}. Recarregue a lista.`);
    this.name = "RecordingNotFoundError";
  }
}

export class MissingColumnError extends Error {
  constructor(tab: string, column: string) {
    super(`A aba ${tab} não tem a coluna "${column}".`);
    this.name = "MissingColumnError";
  }
}

/**
 * Reads the capture board from the sheet and writes status changes back.
 * The sheet stays the source of truth: every write locates the row again by name right before
 * writing, because someone may have sorted or edited the tab since the list was loaded.
 */
export class RecordingsService {
  constructor(
    private readonly reader: SpreadsheetReader,
    private readonly writer: SpreadsheetWriter,
  ) {}

  async loadBoard(): Promise<CaptureBoard> {
    const ranges = [...RECORDING_TABS.map((layout) => tabRange(layout.tab)), tabRange(SERIES_TAB.tab)];
    const matrices = await this.reader.readRanges(ranges);
    const recordings = RECORDING_TABS.flatMap((layout, index) => mapRecordingRows(layout, matrices[index]));
    const goals = mapSeriesGoals(matrices[RECORDING_TABS.length]);
    return { recordings, goals };
  }

  async find(key: RecordingKey): Promise<Recording> {
    const layout = layoutOf(key.tab);
    const [rows] = await this.reader.readRanges([tabRange(layout.tab)]);
    const recording = mapRecordingRows(layout, rows).find((candidate) => sameKey(candidate.key, key));
    if (!recording) throw new RecordingNotFoundError(key);
    return recording;
  }

  /** Writes the status and, when given, the Drive link. An undefined link leaves the cell as it is. */
  async updateStatus(key: RecordingKey, status: Status, driveLink?: string): Promise<void> {
    const layout = layoutOf(key.tab);
    const [rows] = await this.reader.readRanges([tabRange(layout.tab)]);
    const header = (rows[layout.headerRow - 1] ?? []).map((label) => label.trim());
    const keyColumn = rows.map((row) => row[header.indexOf(layout.keyHeader)] ?? "");
    const rowNumber = findRowNumber(keyColumn, layout.headerRow, key.name);
    if (rowNumber === null) throw new RecordingNotFoundError(key);

    const cellOf = (column: string) => {
      const index = header.indexOf(column);
      if (index < 0) throw new MissingColumnError(layout.tab, column);
      return `${tabRange(layout.tab)}!${columnLetter(index)}${rowNumber}`;
    };
    const updates: CellUpdate[] = [{ range: cellOf(COLUMNS.status), value: status }];
    if (driveLink !== undefined) updates.push({ range: cellOf(COLUMNS.driveLink), value: driveLink });
    await this.writer.writeCells(updates);
  }
}
