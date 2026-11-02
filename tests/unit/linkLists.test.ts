import { describe, expect, it } from "vitest";

import { relatedRepeatsLinkedFrom } from "../../src/lib/article/linkLists";

const items = (...ids: string[]) => ids.map((id) => ({ id }));

describe("relatedRepeatsLinkedFrom", () => {
  it("is true when every related page also links here, in any order", () => {
    expect(relatedRepeatsLinkedFrom(items("a", "b", "c"), items("c", "a", "b"))).toBe(true);
  });

  it("is true when related is a subset of linked-from", () => {
    expect(relatedRepeatsLinkedFrom(items("a", "b"), items("a", "b", "hub"))).toBe(true);
  });

  it("is false when related names a page that does not link here", () => {
    expect(relatedRepeatsLinkedFrom(items("a", "outgoing-only"), items("a"))).toBe(false);
  });

  it("is false when there is no related list", () => {
    expect(relatedRepeatsLinkedFrom([], items("a"))).toBe(false);
    expect(relatedRepeatsLinkedFrom([], [])).toBe(false);
  });
});
