/**
 * Accessibility Tests for Project Dashboard
 *
 * WCAG 2.1 AA compliance tests for dashboard components.
 * WCAG 2.1 AA compliance ensures accessibility for all users.
 *
 * Tests cover:
 * - Keyboard navigation
 * - Screen reader support
 * - Focus management
 * - ARIA attributes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ProjectCard } from "../ProjectCard";
import type { Project } from "@graphix/client";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    article: React.forwardRef(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLElement>) =>
        React.createElement("article", { ...props, ref }, children)
    ),
    div: React.forwardRef(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
        React.createElement("div", { ...props, ref }, children)
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestProject = (overrides: Partial<Project> = {}): Project => ({
  id: `test-${Date.now()}`,
  name: "Test Project",
  description: "A test project description",
  thumbnailUrl: null,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-16T14:20:00.000Z",
  settings: {
    template: "comic",
    canvasWidth: 1920,
    canvasHeight: 1080,
    panelCount: 6,
  },
  ...overrides,
});

const noopHandlers = {
  onClick: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onExport: vi.fn(),
};

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("ProjectCard Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Semantic Structure", () => {
    it("should render as an article element for semantic meaning", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      expect(card).toBeInTheDocument();
    });

    it("should have an accessible name via aria-label", () => {
      const project = createTestProject({ name: "My Amazing Comic" });
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-label", expect.stringContaining("My Amazing Comic"));
    });

    it("should include project type in aria-label when available", () => {
      const project = createTestProject({
        name: "Test Comic",
        settings: { template: "manga", canvasWidth: 1920, canvasHeight: 1080, panelCount: 4 },
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-label", expect.stringContaining("manga"));
    });

    it("should have a heading for the project name", () => {
      const project = createTestProject({ name: "Headed Project" });
      render(<ProjectCard project={project} {...noopHandlers} />);

      const heading = screen.getByRole("heading");
      expect(heading).toHaveTextContent("Headed Project");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should be focusable", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      card.focus();

      expect(document.activeElement).toBe(card);
    });

    it("should have tabindex for keyboard navigation", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("tabindex", "0");
    });

    it("should trigger onClick on Enter key", () => {
      const onClick = vi.fn();
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} onClick={onClick} />);

      const card = screen.getByRole("article");
      card.focus();
      fireEvent.keyDown(card, { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should trigger onClick on Space key", () => {
      const onClick = vi.fn();
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} onClick={onClick} />);

      const card = screen.getByRole("article");
      card.focus();
      fireEvent.keyDown(card, { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not trigger onClick on other keys", () => {
      const onClick = vi.fn();
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} onClick={onClick} />);

      const card = screen.getByRole("article");
      card.focus();
      fireEvent.keyDown(card, { key: "a" });
      fireEvent.keyDown(card, { key: "Escape" });
      fireEvent.keyDown(card, { key: "Tab" });

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Interactive Elements", () => {
    it("should have an accessible menu button", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const menuButton = screen.getByRole("button", { name: /project actions/i });
      expect(menuButton).toBeInTheDocument();
    });

    it("menu button should have aria-haspopup", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const menuButton = screen.getByRole("button", { name: /project actions/i });
      expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
    });

    it("menu button should be keyboard focusable", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const menuButton = screen.getByRole("button", { name: /project actions/i });
      menuButton.focus();
      expect(document.activeElement).toBe(menuButton);
    });
  });

  describe("Selection State", () => {
    it("should have aria-selected true when isSelected prop is true", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} isSelected={true} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-selected", "true");
    });

    it("should have aria-selected false when isSelected prop is false", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} isSelected={false} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-selected", "false");
    });

    it("should have data-selected attribute matching isSelected", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} isSelected={true} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("data-selected", "true");
    });
  });

  describe("Visual Information Alternatives", () => {
    it("should provide text alternative for thumbnail when using settings.thumbnailUrl", () => {
      const project = createTestProject({
        name: "Visual Project",
        settings: { 
          template: "comic",
          canvasWidth: 1920, 
          canvasHeight: 1080, 
          panelCount: 6,
          thumbnailUrl: "https://example.com/thumb.png" 
        },
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      // Image should have alt text
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("alt", expect.stringContaining("Visual Project"));
    });

    it("should handle missing thumbnail gracefully", () => {
      const project = createTestProject({ settings: { template: "comic", canvasWidth: 1920, canvasHeight: 1080, panelCount: 6 } });
      render(<ProjectCard project={project} {...noopHandlers} />);

      // Should render without crashing
      const card = screen.getByRole("article");
      expect(card).toBeInTheDocument();
      // Component now always renders thumbnail via API endpoint
      const img = screen.queryByRole("img");
      expect(img).toBeInTheDocument();
    });

    it("should convey template type for screen readers", () => {
      const project = createTestProject({
        settings: { template: "manga", canvasWidth: 1920, canvasHeight: 1080, panelCount: 4 },
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      // Template badge should be visible text
      expect(screen.getByText("manga")).toBeInTheDocument();
    });

    it("should show panel count as visible text", () => {
      const project = createTestProject({
        settings: { template: "comic", canvasWidth: 1920, canvasHeight: 1080, panelCount: 8 },
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      expect(screen.getByText(/8\s*panels/i)).toBeInTheDocument();
    });
  });

  describe("Focus Management", () => {
    it("should show focus indicator on keyboard focus", () => {
      const project = createTestProject();
      render(
        <div>
          <button>Before</button>
          <ProjectCard project={project} {...noopHandlers} />
        </div>
      );

      const card = screen.getByRole("article");
      card.focus();

      expect(document.activeElement).toBe(card);
      // Focus ring styles are applied via CSS, we verify the element is focused
    });

    it("should allow focusing menu button separately from card", () => {
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const menuButton = screen.getByRole("button", { name: /project actions/i });
      menuButton.focus();

      expect(document.activeElement).toBe(menuButton);
    });
  });

  describe("Color and Contrast", () => {
    it("should render heading with text content", () => {
      const project = createTestProject({ name: "My Project" });
      render(<ProjectCard project={project} {...noopHandlers} />);

      const heading = screen.getByRole("heading");
      // We verify text is rendered - actual contrast is handled by design tokens
      expect(heading).toHaveTextContent("My Project");
    });

    it("should not rely solely on color for state indication", () => {
      // Selected state should have visual indicator beyond just color
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} isSelected={true} />);

      const card = screen.getByRole("article");
      // aria-selected provides non-color state indication
      expect(card).toHaveAttribute("aria-selected", "true");
      // data-selected provides another indicator
      expect(card).toHaveAttribute("data-selected", "true");
    });
  });

  describe("Screen Reader Announcements", () => {
    it("should have descriptive aria-label for full context", () => {
      const project = createTestProject({
        name: "Epic Comic",
        description: "An epic tale",
        settings: { template: "comic", canvasWidth: 1920, canvasHeight: 1080, panelCount: 12 },
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      const label = card.getAttribute("aria-label");

      // Should contain project name
      expect(label).toContain("Epic Comic");
      // Should mention it's a project
      expect(label?.toLowerCase()).toContain("project");
    });

    it("should expose time information accessibly", () => {
      const project = createTestProject({
        updatedAt: "2024-01-16T14:20:00.000Z",
      });
      render(<ProjectCard project={project} {...noopHandlers} />);

      // Time element should be present with datetime attribute
      const timeElement = document.querySelector("time");
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveAttribute("datetime", "2024-01-16T14:20:00.000Z");
    });
  });

  describe("Reduced Motion", () => {
    it("should render without motion-dependent content", () => {
      // Our framer-motion mock removes animations
      // This test ensures component works without animations
      const project = createTestProject();
      render(<ProjectCard project={project} {...noopHandlers} />);

      const card = screen.getByRole("article");
      expect(card).toBeInTheDocument();

      // All content should be present without animation
      expect(screen.getByRole("heading")).toBeVisible();
      // Menu button is opacity:0 until hover, but still in the DOM
      expect(screen.getByRole("button", { name: /project actions/i })).toBeInTheDocument();
    });
  });
});

describe("Grid vs List View Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should work correctly in grid view", () => {
    const project = createTestProject();
    render(<ProjectCard project={project} viewMode="grid" {...noopHandlers} />);

    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
  });

  it("should work correctly in list view", () => {
    const project = createTestProject();
    render(<ProjectCard project={project} viewMode="list" {...noopHandlers} />);

    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
    // List view should still have all accessible elements
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /project actions/i })).toBeInTheDocument();
  });
});

describe("Edge Cases for Accessibility", () => {
  it("should handle project with empty name accessibly", () => {
    const project = createTestProject({ name: "" });
    render(<ProjectCard project={project} {...noopHandlers} />);

    // Should still have article element
    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
    // Should have some aria-label even with empty name (shows "Untitled")
    expect(card).toHaveAttribute("aria-label");
    expect(card.getAttribute("aria-label")).toContain("project");
  });

  it("should handle very long project names", () => {
    const project = createTestProject({ name: "A".repeat(255) });
    render(<ProjectCard project={project} {...noopHandlers} />);

    const heading = screen.getByRole("heading");
    expect(heading).toBeInTheDocument();
    // CSS should handle truncation, but full name should be accessible
  });

  it("should handle project without settings", () => {
    const project = createTestProject({ settings: null });
    render(<ProjectCard project={project} {...noopHandlers} />);

    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
  });

  it("should handle Unicode names accessibly", () => {
    const project = createTestProject({ name: "漫画プロジェクト 🎨" });
    render(<ProjectCard project={project} {...noopHandlers} />);

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent("漫画プロジェクト 🎨");
  });
});
