import { GoogleDriveGateway } from "@/adapters/googleDrive";
import { GoogleSheetsGateway } from "@/adapters/googleSheets";
import { loadConfig } from "@/config";
import { RecordingsService } from "@/services/recordingsService";
import { UploadService } from "@/services/uploadService";

/** Composition root: the only place where concrete adapters are chosen and wired. */
export function createServices(accessToken: string) {
  const config = loadConfig();
  const sheets = new GoogleSheetsGateway(accessToken, config.sheetId);
  const drive = new GoogleDriveGateway(accessToken);
  const recordings = new RecordingsService(sheets, sheets);
  const uploads = new UploadService(drive, drive, recordings, config.seriesFolderId);
  return { recordings, uploads };
}

export type Services = ReturnType<typeof createServices>;
