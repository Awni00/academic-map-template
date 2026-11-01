import { describe, expect, it } from "vitest";

import { formatDate } from "../../src/lib/dates";

describe("formatDate", () => {
  it("spells out the month", () => {
    expect(formatDate("2026-05-12")).toBe("May 12, 2026");
    expect(formatDate("2026-01-03")).toBe("Jan 3, 2026");
  });

  it("returns anything that is not a full date unchanged", () => {
    expect(formatDate("2026-05")).toBe("2026-05");
    expect(formatDate("soon")).toBe("soon");
    expect(formatDate(undefined)).toBeUndefined();
  });
});
