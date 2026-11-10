/**
 * Abstract interfaces the services depend on. The Google implementations live in src/adapters;
 * tests and other conferences can swap them without touching the services.
 */

export interface CellUpdate {
  /** A1 range of a single cell, e.g. 'Bolsistas'!J7 */
  range: string;
  value: string;
}

export interface SpreadsheetReader {
  /** Returns one matrix per range, in the same order; each matrix starts at the first row of its range. */
  readRanges(ranges: readonly string[]): Promise<string[][][]>;
}

export interface SpreadsheetWriter {
  writeCells(updates: readonly CellUpdate[]): Promise<void>;
}

export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  parents: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface ResumableUploadRequest {
  folderId: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Stored on the file so the same phone video is never uploaded twice. */
  signature: string;
  /** Origin of the web app; Google only accepts the browser's chunk uploads from this origin. */
  origin: string;
}

export interface DriveFolders {
  getFile(fileId: string): Promise<DriveFile>;
  listChildFolders(parentId: string): Promise<DriveFolder[]>;
  createFolder(parentId: string, name: string): Promise<DriveFolder>;
}

export interface DriveUploads {
  listFileNames(folderId: string): Promise<string[]>;
  findBySignature(folderId: string, signature: string): Promise<DriveFile | null>;
  /** Opens a resumable session and returns its URL; the browser sends the bytes straight to Google. */
  startResumableUpload(request: ResumableUploadRequest): Promise<string>;
}
