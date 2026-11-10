import { createHash } from "node:crypto";
import type { DriveFolders, DriveUploads } from "@/contracts";
import { buildFileName } from "@/domain/naming";
import type { Recording, RecordingKey } from "@/domain/recording";
import type { RecordingsService } from "./recordingsService";

export interface UploadStartRequest {
  key: RecordingKey;
  originalName: string;
  size: number;
  lastModified: number;
  mimeType: string;
  origin: string;
}

export type UploadStartResult =
  | { kind: "session"; uploadUrl: string; fileName: string }
  | { kind: "duplicate"; fileName: string; link: string };

export class SeriesFolderNotFoundError extends Error {
  constructor(series: string) {
    super(`Não achei a pasta da série "${series}" no Drive. Avise o Lorenzo.`);
    this.name = "SeriesFolderNotFoundError";
  }
}

const DRIVE_FOLDER_LINK = /\/folders\/([A-Za-z0-9_-]+)/;
const DRIVE_FILE_LINK = /\/file\/d\/([A-Za-z0-9_-]+)/;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Same original file, size and date = the same phone video, even if picked twice. */
export function uploadSignature(originalName: string, size: number, lastModified: number): string {
  return createHash("sha256").update(`${originalName}|${size}|${lastModified}`).digest("hex").slice(0, 32);
}

/**
 * Prepares uploads (destination folder, final name, duplicate check, resumable session) and
 * records the result in the sheet. The video bytes never pass through this server: a Vercel
 * function body is limited to a few MB and the videos have 100 to 400 MB.
 */
export class UploadService {
  constructor(
    private readonly folders: DriveFolders,
    private readonly uploads: DriveUploads,
    private readonly recordings: RecordingsService,
    private readonly seriesRootFolderId: string,
  ) {}

  async start(request: UploadStartRequest): Promise<UploadStartResult> {
    const recording = await this.recordings.find(request.key);
    const folderId = await this.destinationFolder(recording);
    const signature = uploadSignature(request.originalName, request.size, request.lastModified);

    const duplicate = await this.uploads.findBySignature(folderId, signature);
    if (duplicate) return { kind: "duplicate", fileName: duplicate.name, link: duplicate.webViewLink };

    const fileName = buildFileName({
      series: recording.series,
      personName: recording.key.name,
      originalFileName: request.originalName,
      existingNames: await this.uploads.listFileNames(folderId),
    });
    const uploadUrl = await this.uploads.startResumableUpload({
      folderId, fileName, mimeType: request.mimeType, size: request.size, signature, origin: request.origin,
    });
    await this.recordings.updateStatus(request.key, "Gravando");
    return { kind: "session", uploadUrl, fileName };
  }

  async complete(key: RecordingKey, fileId: string): Promise<string> {
    const file = await this.folders.getFile(fileId);
    await this.recordings.updateStatus(key, "Gravado", file.webViewLink);
    return file.webViewLink;
  }

  /**
   * The row's own link decides the folder: a folder link is the person's folder; a file link
   * means an earlier take, so the new take goes next to it. Without a link, the person's folder
   * is created inside the series folder.
   */
  private async destinationFolder(recording: Recording): Promise<string> {
    const folderLink = recording.driveLink.match(DRIVE_FOLDER_LINK);
    if (folderLink) return folderLink[1];
    const fileLink = recording.driveLink.match(DRIVE_FILE_LINK);
    if (fileLink) {
      const file = await this.folders.getFile(fileLink[1]);
      if (file.parents[0]) return file.parents[0];
    }
    const seriesFolder = await this.seriesFolder(recording.series);
    const existing = (await this.folders.listChildFolders(seriesFolder)).find(
      (folder) => normalize(folder.name) === normalize(recording.key.name),
    );
    return existing?.id ?? (await this.folders.createFolder(seriesFolder, recording.key.name)).id;
  }

  /** Series folders are named "[Campanha] Série"; match on the series title inside the name. */
  private async seriesFolder(series: string): Promise<string> {
    const wanted = normalize(series);
    const folders = await this.folders.listChildFolders(this.seriesRootFolderId);
    const match = folders.find((folder) => normalize(folder.name).includes(wanted));
    if (!match || !wanted) throw new SeriesFolderNotFoundError(series);
    return match.id;
  }
}
