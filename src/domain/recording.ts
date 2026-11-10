/**
 * Domain model of one recording: a person (or a BL) that the team must capture for a series.
 * Pure types and rules only; nothing here knows about Google, HTTP or React.
 */

export const STATUSES = ["Para gravar", "Gravando", "Gravado", "Não veio"] as const;
export type Status = (typeof STATUSES)[number];

/** Statuses that close a recording: nobody needs to chase this person anymore. */
export const RESOLVED_STATUSES: readonly Status[] = ["Gravado", "Não veio"];

export const PRIORITIES = ["Alta", "Média", "Baixa"] as const;
export type Priority = (typeof PRIORITIES)[number] | "";

/** The sheet has no ID column, so a row is found by its tab and the name in its first column. */
export interface RecordingKey {
  tab: string;
  name: string;
}

/** Day of week (4 = Thursday, 5 = Friday, 6 = Saturday) and minutes since midnight. */
export interface ScheduleSlot {
  day: number;
  minutes: number;
}

export interface Recording {
  key: RecordingKey;
  kind: string;
  organization: string;
  series: string;
  question: string;
  whereWhen: string;
  priority: Priority;
  videoOwner: string;
  photoOwner: string;
  status: Status;
  driveLink: string;
  notes: string;
  /** Anchors are interviewed only by the external videomakers, never by the team. */
  isAnchor: boolean;
  schedule: ScheduleSlot | null;
}

export interface SeriesGoal {
  series: string;
  question: string;
  goal: number | null;
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: string): value is Priority {
  return value === "" || (PRIORITIES as readonly string[]).includes(value);
}

export function isResolved(recording: Recording): boolean {
  return RESOLVED_STATUSES.includes(recording.status);
}

export function sameKey(a: RecordingKey, b: RecordingKey): boolean {
  return a.tab === b.tab && a.name.trim() === b.name.trim();
}
