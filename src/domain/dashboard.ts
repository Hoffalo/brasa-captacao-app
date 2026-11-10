import { isResolved, type Recording, type SeriesGoal } from "./recording";

/** Read-only summaries for the coordination panel. Pure functions over the recordings. */

export interface SeriesProgress {
  series: string;
  recorded: number;
  listed: number;
  goal: number | null;
}

export interface OwnerLoad {
  owner: string;
  pending: number;
  done: number;
}

export function seriesProgress(recordings: readonly Recording[], goals: readonly SeriesGoal[]): SeriesProgress[] {
  return goals.map(({ series, goal }) => {
    const inSeries = recordings.filter((recording) => recording.series === series);
    return {
      series,
      recorded: inSeries.filter((recording) => recording.status === "Gravado").length,
      listed: inSeries.length,
      goal,
    };
  });
}

export function pendingByOwner(recordings: readonly Recording[]): OwnerLoad[] {
  const loads = new Map<string, OwnerLoad>();
  for (const recording of recordings) {
    if (recording.isAnchor || !recording.videoOwner) continue;
    const load = loads.get(recording.videoOwner) ?? { owner: recording.videoOwner, pending: 0, done: 0 };
    if (isResolved(recording)) load.done += 1;
    else load.pending += 1;
    loads.set(recording.videoOwner, load);
  }
  return [...loads.values()].sort((a, b) => a.owner.localeCompare(b.owner, "pt-BR"));
}

export function highPriorityPending(recordings: readonly Recording[]): Recording[] {
  return recordings.filter((recording) => recording.priority === "Alta" && !isResolved(recording));
}

/** Sort for "what comes next": by day, then time; rows without a time go last. */
export function bySchedule(a: Recording, b: Recording): number {
  const keyOf = (recording: Recording) =>
    recording.schedule ? recording.schedule.day * 24 * 60 + recording.schedule.minutes : Number.MAX_SAFE_INTEGER;
  return keyOf(a) - keyOf(b);
}
