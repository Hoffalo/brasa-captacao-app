import { describe, expect, it } from "vitest";
import { nextOffset } from "@/web/resumableUpload";

describe("nextOffset", () => {
  it("continues right after the last byte Google confirmed", () => {
    expect(nextOffset("bytes=0-8388607", 0)).toBe(8388608);
  });

  it("uses the fallback when the Range header is not readable", () => {
    expect(nextOffset(null, 4096)).toBe(4096);
  });
});
