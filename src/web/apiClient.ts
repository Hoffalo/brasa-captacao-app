import type { Recording, RecordingKey, SeriesGoal, Status } from "@/domain/recording";
import { uploadResumable } from "./resumableUpload";

/** Browser-side calls to the app's own API routes. */

export interface Board {
  recordings: Recording[];
  goals: SeriesGoal[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(response.status, payload.error ?? "Algo deu errado.");
  return payload as T;
}

export function loadBoard(): Promise<Board> {
  return call<Board>("/api/recordings");
}

export function setStatus(key: RecordingKey, status: Status, link?: string): Promise<void> {
  return call("/api/recordings/status", { ...key, status, link });
}

export type UploadOutcome = { kind: "uploaded"; fileName: string; link: string } | { kind: "duplicate"; fileName: string; link: string };

export async function uploadTake(key: RecordingKey, file: File, onProgress: (fraction: number) => void): Promise<UploadOutcome> {
  const start = await call<{ kind: "session"; uploadUrl: string; fileName: string } | { kind: "duplicate"; fileName: string; link: string }>(
    "/api/upload/start",
    { ...key, originalName: file.name, size: file.size, lastModified: file.lastModified, mimeType: file.type },
  );
  if (start.kind === "duplicate") return start;
  const { id } = await uploadResumable(start.uploadUrl, file, onProgress);
  const { link } = await call<{ link: string }>("/api/upload/complete", { ...key, fileId: id });
  return { kind: "uploaded", fileName: start.fileName, link };
}
