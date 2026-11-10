import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/domain/access";

describe("isAllowedEmail", () => {
  it.each([
    ["lorenzo.hoffmann@gobrasa.org", true, true],
    ["Carol.Novaes@GOBRASA.org", true, true],
    ["alguem@gmail.com", true, false],
    ["lorenzo.hoffmann@gobrasa.org", false, false],
    ["fake@notgobrasa.org", true, false],
  ])("%s (verified: %s) -> %s", (email, verified, expected) => {
    expect(isAllowedEmail(email, verified, "gobrasa.org")).toBe(expected);
  });

  it("rejects a missing email", () => {
    expect(isAllowedEmail(undefined, true, "gobrasa.org")).toBe(false);
  });
});
