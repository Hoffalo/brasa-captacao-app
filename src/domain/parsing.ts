import type { ScheduleSlot } from "./recording";

/**
 * Parsers for the free-text cells of the capture sheet. The sheet is written by people,
 * so every parser tolerates blanks and returns empty values instead of throwing.
 */

export interface ParsedContent {
  series: string;
  question: string;
}

export interface Owners {
  video: string;
  photos: string;
}

const UPPERCASE = "A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ";
// The series name is written in capitals, optionally followed by a note in parentheses, then a colon.
const SERIES_PATTERN = new RegExp(`([${UPPERCASE}][${UPPERCASE} ]{2,}?)(?: \\([^)]*\\))?:\\s*(.*)$`, "s");
const QUOTED = /^'(.*)'$/s;

export function parseContent(text: string): ParsedContent {
  const match = text.trim().match(SERIES_PATTERN);
  if (!match) return { series: "", question: text.trim() };
  const [, series, rest] = match;
  const question = rest.trim().replace(QUOTED, "$1");
  return { series: series.trim(), question };
}

export function parseOwners(text: string): Owners {
  const video = text.match(/Vídeo:\s*([^|]+)/)?.[1]?.trim() ?? "";
  const photos = text.match(/Fotos:\s*([^|]+)/)?.[1]?.trim() ?? "";
  return { video, photos };
}

const DAY_BY_WORD: Record<string, number> = { qui: 4, sex: 5, sáb: 6, sab: 6 };
const DEFAULT_DAY = DAY_BY_WORD.sáb; // the conference itself is on Saturday
const TIME_PATTERN = /(\d{1,2})h(\d{2})?/;

/** Finds the first time in a "where and when" cell and the day mentioned before it. */
export function parseSchedule(text: string): ScheduleSlot | null {
  const time = text.match(TIME_PATTERN);
  if (!time || time.index === undefined) return null;
  const before = text.slice(0, time.index).toLowerCase();
  const day = Object.entries(DAY_BY_WORD)
    .map(([word, value]) => ({ value, position: before.lastIndexOf(word) }))
    .filter((candidate) => candidate.position >= 0)
    .sort((a, b) => b.position - a.position)[0]?.value ?? DEFAULT_DAY;
  const minutes = Number(time[1]) * 60 + Number(time[2] ?? 0);
  return { day, minutes };
}
