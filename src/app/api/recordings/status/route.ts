import { isStatus } from "@/domain/recording";
import { handle, InvalidRequestError, readJson, requireString } from "@/web/apiHandler";

// Only Drive links go into the sheet; anything else is a paste mistake.
const DRIVE_LINK = /^https:\/\/(drive|docs)\.google\.com\//;

export async function POST(request: Request) {
  return handle(request, async (services) => {
    const body = await readJson(request);
    const key = { tab: requireString(body, "tab"), name: requireString(body, "name") };
    const status = requireString(body, "status");
    if (!isStatus(status)) throw new InvalidRequestError(`Status "${status}" não existe.`);
    const link = typeof body.link === "string" ? body.link.trim() : undefined;
    if (link && !DRIVE_LINK.test(link)) throw new InvalidRequestError("Cole um link do Google Drive.");
    await services.recordings.updateStatus(key, status, link);
    return { ok: true };
  });
}
