import { describe, expect, it } from "vitest";

import {
  entryTypeDefinitions,
  entryTypeOwnsFolder,
  getEntryType,
  graphConfig,
  isHubType,
  publicationsConfig,
  siteConfig,
  validateEntryTypes,
  writingConfig
} from "../../src/config/resolve";
import type { EntryTypeDefinition } from "../../src/config/types";

describe("resolved config", () => {
  it("derives graph metadata from the entry type registry", () => {
    expect(entryTypeDefinitions.map((entryType) => entryType.id)).toContain("hub");
    expect(isHubType("hub")).toBe(true);
    expect(entryTypeOwnsFolder("sub-hub")).toBe(true);
    expect(getEntryType("paper").label).toBe("Paper");
    expect(graphConfig.nodeTypes.paper).toEqual(getEntryType("paper").graph);
  });

  it("leaves every built-in entry type in the standard article mode", () => {
    // Article mode is a presentation axis layered onto the existing
    // registry. No built-in type opts into abstract mode, so adding the
    // axis must not change how any existing entry renders.
    expect(writingConfig.entryLayout.mode.default).toBe("article");
    for (const entryType of entryTypeDefinitions) {
      expect(writingConfig.entryLayout.mode.byType[entryType.id]).toBe("article");
    }
  });

  it("defaults publication abstracts to popup display on publication surfaces", () => {
    expect(publicationsConfig.abstractDisplay).toBe("popup");
    expect(siteConfig.homepage.selectedPublications.abstractDisplay).toBe("popup");
  });

  it("validates invalid entry type registries", () => {
    expect(() => validateEntryTypes([])).toThrow(/At least one/);
    expect(() =>
      validateEntryTypes([
        validType("essay"),
        validType("essay")
      ])
    ).toThrow(/Duplicate/);
    expect(() =>
      validateEntryTypes([
        {
          ...validType("essay"),
          graph: undefined
        } as unknown as EntryTypeDefinition
      ])
    ).toThrow(/graph metadata/);
  });

  it("accepts custom entry type labels and graph styling", () => {
    const [entryType] = validateEntryTypes([
      {
        id: "essay",
        label: "Essay",
        role: "entry",
        graph: {
          shape: "diamond",
          size: 8,
          color: "#123456",
          labelVisibility: "always"
        }
      }
    ]);

    expect(entryType).toMatchObject({
      id: "essay",
      label: "Essay",
      ownsFolder: false,
      includeInRss: true,
      includeInRecent: true,
      graph: {
        shape: "diamond",
        color: "#123456"
      }
    });
  });
});

function validType(id: string): EntryTypeDefinition {
  return {
    id,
    label: id,
    role: "entry",
    graph: {
      shape: "circle",
      size: 8,
      color: "var(--graph-note)",
      labelVisibility: "hover"
    }
  };
}
