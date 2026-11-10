import { NextResponse } from "next/server";
import { GoogleApiError } from "@/adapters/googleHttp";
import { createServices, type Services } from "@/composition";
import { MissingConfigError } from "@/config";
import { UnknownTabError } from "@/domain/sheetLayout";
import { googleAccessToken, NotSignedInError } from "@/googleToken";
import { MissingColumnError, RecordingNotFoundError } from "@/services/recordingsService";
import { SeriesFolderNotFoundError } from "@/services/uploadService";

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

/** Maps each known failure to an HTTP status; the message is already written for the team. */
const STATUS_BY_ERROR: [new (...args: never[]) => Error, number][] = [
  [NotSignedInError, 401],
  [InvalidRequestError, 400],
  [UnknownTabError, 400],
  [RecordingNotFoundError, 404],
  [SeriesFolderNotFoundError, 404],
  [MissingColumnError, 409],
  [MissingConfigError, 500],
];

/** Web glue shared by every API route: auth, wiring and error translation. */
export async function handle(request: Request, action: (services: Services) => Promise<unknown>): Promise<NextResponse> {
  try {
    const services = createServices(await googleAccessToken(request));
    return NextResponse.json(await action(services));
  } catch (error) {
    const known = STATUS_BY_ERROR.find(([type]) => error instanceof type);
    if (known) return NextResponse.json({ error: (error as Error).message }, { status: known[1] });
    if (error instanceof GoogleApiError) {
      console.error("Google API error", error.status, error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error", error);
    return NextResponse.json({ error: "Erro inesperado. Tente de novo ou avise o Lorenzo." }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    // falls through to the validation error below
  }
  throw new InvalidRequestError("Corpo da requisição inválido.");
}

export function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw new InvalidRequestError(`Campo "${field}" é obrigatório.`);
  return value.trim();
}

export function requireNumber(body: Record<string, unknown>, field: string): number {
  const value = body[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new InvalidRequestError(`Campo "${field}" inválido.`);
  return value;
}
