/**
 * File naming rule: SÉRIE_Nome_Sobrenome_n.ext. In BSA26 files arrived as IMG_xxxx.MOV and were
 * impossible to find later, so the app renames every upload with this rule.
 */

/** Short codes the team already uses in file names (e.g. DEGRAU_Fabio_Kapitanovas). Data, not code: add a row for a new series. */
export const SERIES_CODES: Readonly<Record<string, string>> = {
  "POR QUE VIR": "VIR",
  "PRIMEIRO DEGRAU": "DEGRAU",
  "O QUE NINGUÉM TE CONTA": "NINGUEM",
  "PARA QUEM ESTÁ NO BRASIL": "BRASIL",
  "SONHAR SEM LIMITES": "SONHAR",
  "REDE EM UMA FRASE": "REDE",
};

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function seriesCode(series: string): string {
  return SERIES_CODES[series] ?? slugify(series).toUpperCase();
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot).toLowerCase() : "";
}

export interface FileNameRequest {
  series: string;
  personName: string;
  originalFileName: string;
  /** Names already in the destination folder, so a retake gets the next number. */
  existingNames: readonly string[];
}

export function buildFileName(request: FileNameRequest): string {
  const base = `${seriesCode(request.series)}_${slugify(request.personName)}`;
  const takes = request.existingNames.filter((name) => name.startsWith(`${base}_`)).length;
  return `${base}_${takes + 1}${extensionOf(request.originalFileName)}`;
}
