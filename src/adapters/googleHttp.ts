/**
 * Shared HTTP helper for the Google adapters: bearer auth, a timeout on every call and
 * errors that carry Google's own message, so the team sees why an action failed.
 */

// Google answers in well under a second; 15 s only trips on a dead connection at the venue.
const REQUEST_TIMEOUT_MS = 15_000;

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export async function googleFetch(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text();
    const detail = safeErrorMessage(body) ?? response.statusText;
    throw new GoogleApiError(response.status, `Google respondeu ${response.status}: ${detail}`);
  }
  return response;
}

export async function googleJson<T>(accessToken: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await googleFetch(accessToken, url, init);
  return (await response.json()) as T;
}

function safeErrorMessage(body: string): string | null {
  try {
    return (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? null;
  } catch {
    return body.slice(0, 200) || null;
  }
}
