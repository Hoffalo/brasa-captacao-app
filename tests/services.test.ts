import { describe, expect, it } from "vitest";
import type {
  CellUpdate, DriveFile, DriveFolder, DriveFolders, DriveUploads, ResumableUploadRequest, SpreadsheetReader, SpreadsheetWriter,
} from "@/contracts";
import { RecordingNotFoundError, RecordingsService } from "@/services/recordingsService";
import { UploadService } from "@/services/uploadService";

const TITLE = [["BSE26 | Bolsistas"], ["Fonte"], []];
const HEADER = ["Nome", "Programa", "Presença", "Universidade", "Contexto (fontes cruzadas)", "Conteúdo",
  "Onde / quando captar", "Prioridade", "Responsável", "Status", "Link do Drive", "Observações"];

function bolsista(name: string, link = ""): string[] {
  return [name, "Bolsas BRASA", "", "", "", "SONHAR SEM LIMITES: 'Complete: sonhar sem limites, para mim, é...'",
    "Encontro de Bolsistas (sáb 13h10, Cafeteria)", "Alta", "Vídeo: Ana Dantas | Fotos: Ana Dantas", "Para gravar", link, ""];
}

/** In-memory fake of the sheet: answers reads from fixed tabs and records every write. */
class FakeSheet implements SpreadsheetReader, SpreadsheetWriter {
  readonly writes: CellUpdate[] = [];
  constructor(private readonly tabs: Record<string, string[][]>) {}
  async readRanges(ranges: readonly string[]): Promise<string[][][]> {
    return ranges.map((range) => this.tabs[range.replace(/^'|'$/g, "")] ?? []);
  }
  async writeCells(updates: readonly CellUpdate[]): Promise<void> {
    this.writes.push(...updates);
  }
}

/** In-memory fake of Drive with one shared drive tree. */
class FakeDrive implements DriveFolders, DriveUploads {
  readonly sessions: ResumableUploadRequest[] = [];
  readonly createdFolders: { parentId: string; name: string }[] = [];
  constructor(
    private readonly children: Record<string, DriveFolder[]>,
    private readonly fileNames: Record<string, string[]> = {},
    private readonly files: Record<string, DriveFile> = {},
    private readonly signatures: Record<string, DriveFile> = {},
  ) {}
  async getFile(fileId: string) { return this.files[fileId]; }
  async listChildFolders(parentId: string) { return this.children[parentId] ?? []; }
  async createFolder(parentId: string, name: string) {
    this.createdFolders.push({ parentId, name });
    return { id: `new-${name}`, name };
  }
  async listFileNames(folderId: string) { return this.fileNames[folderId] ?? []; }
  async findBySignature(_folderId: string, signature: string) { return this.signatures[signature] ?? null; }
  async startResumableUpload(request: ResumableUploadRequest) {
    this.sessions.push(request);
    return "https://upload.example/session";
  }
}

const startRequest = {
  key: { tab: "Bolsistas", name: "Pietro de Souza" },
  originalName: "IMG_0001.MOV",
  size: 1000,
  lastModified: 1,
  mimeType: "video/quicktime",
  origin: "https://captacao.example",
};

describe("RecordingsService.updateStatus", () => {
  it("writes status and link in the row found by name, even after the tab was reordered", async () => {
    const sheet = new FakeSheet({ Bolsistas: [...TITLE, HEADER, bolsista("José Ricardo Araújo"), bolsista("Pietro de Souza")] });

    await new RecordingsService(sheet, sheet).updateStatus({ tab: "Bolsistas", name: "Pietro de Souza" }, "Gravado", "https://drive/x");

    expect(sheet.writes).toEqual([
      { range: "'Bolsistas'!J6", value: "Gravado" },
      { range: "'Bolsistas'!K6", value: "https://drive/x" },
    ]);
  });

  it("refuses to write when the person is no longer in the tab", async () => {
    const sheet = new FakeSheet({ Bolsistas: [...TITLE, HEADER] });

    const write = new RecordingsService(sheet, sheet).updateStatus({ tab: "Bolsistas", name: "Pietro de Souza" }, "Gravado");

    await expect(write).rejects.toBeInstanceOf(RecordingNotFoundError);
  });
});

describe("UploadService.start", () => {
  it("creates the person's folder inside the series folder and names the take", async () => {
    const sheet = new FakeSheet({ Bolsistas: [...TITLE, HEADER, bolsista("Pietro de Souza")] });
    const drive = new FakeDrive({ root: [{ id: "sonhar", name: "[Programa de Bolsas BRASA] Sonhar sem limites" }] });
    const service = new UploadService(drive, drive, new RecordingsService(sheet, sheet), "root");

    const result = await service.start(startRequest);

    expect(result).toEqual({ kind: "session", uploadUrl: "https://upload.example/session", fileName: "SONHAR_Pietro_de_Souza_1.mov" });
    expect(drive.createdFolders).toEqual([{ parentId: "sonhar", name: "Pietro de Souza" }]);
    expect(sheet.writes).toEqual([{ range: "'Bolsistas'!J5", value: "Gravando" }]);
  });

  it("uploads into the folder already linked in the row", async () => {
    const sheet = new FakeSheet({ Bolsistas: [...TITLE, HEADER, bolsista("Pietro de Souza", "https://drive.google.com/drive/folders/pietro123")] });
    const drive = new FakeDrive({}, { pietro123: ["SONHAR_Pietro_de_Souza_1.mov"] });
    const service = new UploadService(drive, drive, new RecordingsService(sheet, sheet), "root");

    const result = await service.start(startRequest);

    expect(drive.sessions[0].folderId).toBe("pietro123");
    expect(result).toMatchObject({ fileName: "SONHAR_Pietro_de_Souza_2.mov" });
  });

  it("does not upload the same phone video twice", async () => {
    const { uploadSignature } = await import("@/services/uploadService");
    const signature = uploadSignature("IMG_0001.MOV", 1000, 1);
    const sheet = new FakeSheet({ Bolsistas: [...TITLE, HEADER, bolsista("Pietro de Souza", "https://drive.google.com/drive/folders/p")] });
    const existing = { id: "f1", name: "SONHAR_Pietro_de_Souza_1.mov", webViewLink: "https://drive/f1", parents: ["p"] };
    const drive = new FakeDrive({}, {}, {}, { [signature]: existing });
    const service = new UploadService(drive, drive, new RecordingsService(sheet, sheet), "root");

    const result = await service.start(startRequest);

    expect(result).toEqual({ kind: "duplicate", fileName: existing.name, link: existing.webViewLink });
    expect(drive.sessions).toHaveLength(0);
  });
});
