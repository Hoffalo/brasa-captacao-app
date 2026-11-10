import { handle, readJson, requireNumber, requireString } from "@/web/apiHandler";

export async function POST(request: Request) {
  return handle(request, async (services) => {
    const body = await readJson(request);
    return services.uploads.start({
      key: { tab: requireString(body, "tab"), name: requireString(body, "name") },
      originalName: requireString(body, "originalName"),
      size: requireNumber(body, "size"),
      lastModified: requireNumber(body, "lastModified"),
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "",
      // The browser will send the chunks from this same origin.
      origin: request.headers.get("origin") ?? new URL(request.url).origin,
    });
  });
}
