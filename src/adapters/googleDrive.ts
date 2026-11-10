import type { DriveFile, DriveFolder, DriveFolders, DriveUploads, ResumableUploadRequest } from "@/contracts";
import { googleFetch, googleJson, GoogleApiError } from "./googleHttp";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const FILE_FIELDS = "id,name,webViewLink,parents";
/** The conference folders live in a shared drive; every call must opt in to shared drives. */
const SHARED_DRIVE_PARAMS = "supportsAllDrives=true&includeItemsFromAllDrives=true";
export const SIGNATURE_PROPERTY = "captacaoSig";

/** Adapter over the Google Drive API v3, acting as the signed-in team member. */
export class GoogleDriveGateway implements DriveFolders, DriveUploads {
  constructor(private readonly accessToken: string) {}

  async getFile(fileId: string): Promise<DriveFile> {
    const url = `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS}&supportsAllDrives=true`;
    return googleJson<DriveFile>(this.accessToken, url);
  }

  async listChildFolders(parentId: string): Promise<DriveFolder[]> {
    const files = await this.list(`'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`, "files(id,name)");
    return files.map(({ id, name }) => ({ id, name }));
  }

  async createFolder(parentId: string, name: string): Promise<DriveFolder> {
    return googleJson<DriveFolder>(this.accessToken, `${DRIVE_API}/files?fields=id,name&supportsAllDrives=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    });
  }

  async listFileNames(folderId: string): Promise<string[]> {
    const files = await this.list(`'${folderId}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, "files(name)");
    return files.map((file) => file.name);
  }

  async findBySignature(folderId: string, signature: string): Promise<DriveFile | null> {
    const query = `'${folderId}' in parents and trashed=false and appProperties has { key='${SIGNATURE_PROPERTY}' and value='${signature}' }`;
    const [match] = await this.list(query, `files(${FILE_FIELDS})`);
    return match ?? null;
  }

  async startResumableUpload(request: ResumableUploadRequest): Promise<string> {
    const url = `${UPLOAD_API}?uploadType=resumable&supportsAllDrives=true&fields=${FILE_FIELDS}`;
    const response = await googleFetch(this.accessToken, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": request.mimeType || "application/octet-stream",
        "X-Upload-Content-Length": String(request.size),
        // Without the app's Origin here, Google rejects the browser's chunk uploads (CORS).
        Origin: request.origin,
      },
      body: JSON.stringify({
        name: request.fileName,
        parents: [request.folderId],
        appProperties: { [SIGNATURE_PROPERTY]: request.signature },
      }),
    });
    const sessionUrl = response.headers.get("Location");
    if (!sessionUrl) throw new GoogleApiError(502, "O Google não devolveu a sessão de upload.");
    return sessionUrl;
  }

  private async list(query: string, fields: string): Promise<(DriveFile & { name: string })[]> {
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000&${SHARED_DRIVE_PARAMS}`;
    const body = await googleJson<{ files?: (DriveFile & { name: string })[] }>(this.accessToken, url);
    return body.files ?? [];
  }
}
