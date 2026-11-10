import { handle } from "@/web/apiHandler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, (services) => services.recordings.loadBoard());
}
