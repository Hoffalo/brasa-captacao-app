/**
 * Browser side of the Drive resumable upload: sends the file in chunks straight to Google and
 * resumes from the last confirmed byte when the venue Wi-Fi drops.
 */

// Google requires chunks in multiples of 256 KiB; 8 MiB keeps progress smooth on 4G.
const CHUNK_SIZE = 32 * 256 * 1024;
const MAX_RETRIES = 6;
const RESUME_INCOMPLETE = 308;

export class UploadFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadFailedError";
  }
}

/** "bytes=0-524287" means everything up to byte 524287 arrived; the next chunk starts after it. */
export function nextOffset(rangeHeader: string | null, fallback: number): number {
  const lastByte = rangeHeader?.match(/bytes=\d+-(\d+)/)?.[1];
  return lastByte === undefined ? fallback : Number(lastByte) + 1;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function confirmedOffset(sessionUrl: string, total: number): Promise<number | { id: string }> {
  const response = await fetch(sessionUrl, { method: "PUT", headers: { "Content-Range": `bytes */${total}` } });
  if (response.status === 200 || response.status === 201) return (await response.json()) as { id: string };
  if (response.status === RESUME_INCOMPLETE) return nextOffset(response.headers.get("Range"), 0);
  throw new UploadFailedError(`O Drive recusou o upload (${response.status}).`);
}

export async function uploadResumable(sessionUrl: string, file: File, onProgress: (fraction: number) => void): Promise<{ id: string }> {
  let offset = 0;
  let retries = 0;
  while (true) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    try {
      const response = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "Content-Range": `bytes ${offset}-${end - 1}/${file.size}` },
        body: file.slice(offset, end),
      });
      if (response.status === 200 || response.status === 201) {
        onProgress(1);
        return (await response.json()) as { id: string };
      }
      if (response.status !== RESUME_INCOMPLETE) throw new UploadFailedError(`O Drive recusou o upload (${response.status}).`);
      offset = nextOffset(response.headers.get("Range"), end);
      retries = 0;
      onProgress(offset / file.size);
    } catch (error) {
      if (error instanceof UploadFailedError || retries >= MAX_RETRIES) throw error;
      retries += 1;
      await wait(1000 * 2 ** retries);
      const confirmed = await confirmedOffset(sessionUrl, file.size).catch(() => offset);
      if (typeof confirmed !== "number") return confirmed;
      offset = confirmed;
    }
  }
}
