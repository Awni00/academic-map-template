import { describe, expect, it } from "vitest";

import { overflowSides } from "../../src/lib/article/overflowHint";

describe("overflowSides", () => {
  it("reports nothing when the content fits", () => {
    expect(overflowSides(0, 300, 300)).toBeNull();
    expect(overflowSides(0, 301, 300)).toBeNull();
  });

  it("names the sides that hide content", () => {
    expect(overflowSides(0, 600, 300)).toBe("end");
    expect(overflowSides(150, 600, 300)).toBe("both");
    expect(overflowSides(300, 600, 300)).toBe("start");
  });
});
