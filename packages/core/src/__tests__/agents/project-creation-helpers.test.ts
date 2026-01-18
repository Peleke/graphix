/**
 * Project Creation Agent Helper Tests
 *
 * Tests for the conversation helper functions.
 */

import { describe, it, expect } from "vitest";
import {
  getInitialWorkingMemory,
  buildSystemPrompt,
  getPhasePrompt,
  getNextPhase,
  updateWorkingMemory,
  canCreateProject,
  getSuggestionsForPhase,
} from "../../agents/project-creation.agent.js";
import type { ChatWorkingMemory } from "../../db/schema.js";

describe("getInitialWorkingMemory", () => {
  it("returns correct initial state", () => {
    const memory = getInitialWorkingMemory();

    expect(memory.phase).toBe("greeting");
    expect(memory.gathered).toEqual({});
    expect(memory.skipped).toEqual([]);
  });
});

describe("buildSystemPrompt", () => {
  it("includes phase in prompt", () => {
    const memory = getInitialWorkingMemory();
    const prompt = buildSystemPrompt(memory);

    expect(prompt).toContain("greeting");
  });

  it("includes gathered information", () => {
    const memory: ChatWorkingMemory = {
      phase: "characters",
      gathered: {
        concept: "A story about otters",
      },
      skipped: [],
    };

    const prompt = buildSystemPrompt(memory);

    expect(prompt).toContain("concept");
    expect(prompt).toContain("otters");
  });
});

describe("getPhasePrompt", () => {
  it("returns prompt for greeting phase", () => {
    const prompt = getPhasePrompt("greeting");

    expect(prompt).toContain("greeting");
    expect(prompt.length).toBeGreaterThan(10);
  });

  it("returns prompt for each phase", () => {
    const phases = [
      "greeting",
      "characters",
      "setting",
      "arc",
      "style",
      "scope",
      "confirmation",
      "complete",
    ] as const;

    for (const phase of phases) {
      const prompt = getPhasePrompt(phase);
      expect(prompt).toBeTruthy();
    }
  });
});

describe("getNextPhase", () => {
  it("progresses from greeting to characters", () => {
    const memory = getInitialWorkingMemory();
    const next = getNextPhase(memory);

    expect(next).toBe("characters");
  });

  it("skips phases with existing data", () => {
    const memory: ChatWorkingMemory = {
      phase: "greeting",
      gathered: {
        characters: [
          { name: "Oliver" },
          { name: "Olivia" },
        ],
        setting: "A riverside village",
      },
      skipped: [],
    };

    const next = getNextPhase(memory);

    // Should skip characters (has 2) and setting (has data)
    expect(next).toBe("arc");
  });

  it("skips explicitly skipped phases", () => {
    const memory: ChatWorkingMemory = {
      phase: "characters",
      gathered: {},
      skipped: ["setting", "arc"],
    };

    const next = getNextPhase(memory);

    expect(next).toBe("style");
  });

  it("returns complete for final phase", () => {
    const memory: ChatWorkingMemory = {
      phase: "confirmation",
      gathered: {},
      skipped: [],
    };

    const next = getNextPhase(memory);

    expect(next).toBe("complete");
  });
});

describe("updateWorkingMemory", () => {
  it("updates gathered data", () => {
    const memory = getInitialWorkingMemory();
    const updated = updateWorkingMemory(memory, {
      concept: "A story about otters",
    });

    expect(updated.gathered.concept).toBe("A story about otters");
    expect(updated.phase).toBe("greeting");
  });

  it("preserves existing data", () => {
    const memory: ChatWorkingMemory = {
      phase: "characters",
      gathered: {
        concept: "Existing concept",
      },
      skipped: [],
    };

    const updated = updateWorkingMemory(memory, {
      characters: [{ name: "Oliver" }],
    });

    expect(updated.gathered.concept).toBe("Existing concept");
    expect(updated.gathered.characters).toHaveLength(1);
  });
});

describe("canCreateProject", () => {
  it("returns false with no info", () => {
    const memory = getInitialWorkingMemory();
    expect(canCreateProject(memory)).toBe(false);
  });

  it("returns false with only concept", () => {
    const memory: ChatWorkingMemory = {
      phase: "characters",
      gathered: {
        concept: "A story",
      },
      skipped: [],
    };

    expect(canCreateProject(memory)).toBe(false);
  });

  it("returns true with characters", () => {
    const memory: ChatWorkingMemory = {
      phase: "confirmation",
      gathered: {
        characters: [{ name: "Oliver" }],
      },
      skipped: [],
    };

    expect(canCreateProject(memory)).toBe(true);
  });

  it("returns true with concept and characters", () => {
    const memory: ChatWorkingMemory = {
      phase: "confirmation",
      gathered: {
        concept: "A story about otters",
        characters: [
          { name: "Oliver" },
          { name: "Olivia" },
        ],
      },
      skipped: [],
    };

    expect(canCreateProject(memory)).toBe(true);
  });
});

describe("getSuggestionsForPhase", () => {
  it("returns suggestions for greeting", () => {
    const suggestions = getSuggestionsForPhase("greeting", getInitialWorkingMemory());

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.toLowerCase().includes("create"))).toBe(true);
  });

  it("returns suggestions for confirmation", () => {
    const suggestions = getSuggestionsForPhase("confirmation", getInitialWorkingMemory());

    expect(suggestions).toContain("Create Project");
  });

  it("returns skip options for optional phases", () => {
    const settingSuggestions = getSuggestionsForPhase("setting", getInitialWorkingMemory());
    expect(settingSuggestions.some((s) => s.toLowerCase().includes("skip"))).toBe(true);
  });
});
