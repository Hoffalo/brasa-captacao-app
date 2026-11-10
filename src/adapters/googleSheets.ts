import type { CellUpdate, SpreadsheetReader, SpreadsheetWriter } from "@/contracts";
import { googleJson } from "./googleHttp";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

/** Adapter over the Google Sheets API v4, acting as the signed-in team member. */
export class GoogleSheetsGateway implements SpreadsheetReader, SpreadsheetWriter {
  constructor(
    private readonly accessToken: string,
    private readonly spreadsheetId: string,
  ) {}

  async readRanges(ranges: readonly string[]): Promise<string[][][]> {
    const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join("&");
    const url = `${SHEETS_API}/${this.spreadsheetId}/values:batchGet?${query}&valueRenderOption=FORMATTED_VALUE`;
    const body = await googleJson<{ valueRanges?: { values?: string[][] }[] }>(this.accessToken, url);
    return ranges.map((_, index) => body.valueRanges?.[index]?.values ?? []);
  }

  async writeCells(updates: readonly CellUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    await googleJson(this.accessToken, `${SHEETS_API}/${this.spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // RAW keeps links and names exactly as written; USER_ENTERED could turn text into dates.
        valueInputOption: "RAW",
        data: updates.map((update) => ({ range: update.range, values: [[update.value]] })),
      }),
    });
  }
}
