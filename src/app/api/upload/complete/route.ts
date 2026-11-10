import { handle, readJson, requireString } from "@/web/apiHandler";

export async function POST(request: Request) {
  return handle(request, async (services) => {
    const body = await readJson(request);
    const key = { tab: requireString(body, "tab"), name: requireString(body, "name") };
    const link = await services.uploads.complete(key, requireString(body, "fileId"));
    return { link };
  });
}
