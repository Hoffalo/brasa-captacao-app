/**
 * Per-conference configuration, read from environment variables. Reusing the app for another
 * conference means changing these values on Vercel, not the code.
 */

export interface AppConfig {
  conferenceName: string;
  sheetId: string;
  seriesFolderId: string;
  allowedDomain: string;
  googleClientId: string;
  googleClientSecret: string;
  authSecret: string;
}

export class MissingConfigError extends Error {
  constructor(names: string[]) {
    super(`Faltam variáveis de ambiente: ${names.join(", ")}.`);
    this.name = "MissingConfigError";
  }
}

const DEFAULT_DOMAIN = "gobrasa.org";

export function allowedDomain(): string {
  return process.env.ALLOWED_DOMAIN?.trim() || DEFAULT_DOMAIN;
}

/** Read at request time, not at import, so the build succeeds before the secrets are set. */
export function loadConfig(): AppConfig {
  const required = {
    SHEET_ID: process.env.SHEET_ID,
    SERIES_FOLDER_ID: process.env.SERIES_FOLDER_ID,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
  };
  const missing = Object.entries(required).filter(([, value]) => !value?.trim()).map(([name]) => name);
  if (missing.length > 0) throw new MissingConfigError(missing);
  return {
    conferenceName: process.env.CONFERENCE_NAME?.trim() || "Conferência BRASA",
    sheetId: required.SHEET_ID!.trim(),
    seriesFolderId: required.SERIES_FOLDER_ID!.trim(),
    allowedDomain: allowedDomain(),
    googleClientId: required.AUTH_GOOGLE_ID!.trim(),
    googleClientSecret: required.AUTH_GOOGLE_SECRET!.trim(),
    authSecret: required.AUTH_SECRET!.trim(),
  };
}
