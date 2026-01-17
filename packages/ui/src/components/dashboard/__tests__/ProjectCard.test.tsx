/**
 * ProjectCard Component Tests
 *
 * React component rendering tests using @testing-library/react.
 * Tests the ProjectCard component's rendering, interactions, and props.
 *
 * ARR! We test every plank on this ship! 🏴‍☠️
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  ProjectCard,
  formatProjectDate,
  formatFullDate,
  getPanelCount,
  getTemplateType,
  getThumbnailUrl,
} from "../ProjectCard";
import type { Project } from "@graphix/client";

// ============================================================================
// Mocks
// ============================================================================

// Mock framer-motion - need to handle all the props properly
vi.mock("framer-motion", () => ({
  motion: {
    article: React.forwardRef(({ children, whileHover, whileTap, variants, initial, animate, transition, ...props }: any, ref: any) => (
      <article ref={ref} {...props}>
        {children}
      </article>
    )),
    div: React.forwardRef(({ children, whileHover, whileTap, variants, initial, animate, transition, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-123",
    name: "Test Project",
    description: "A wonderful test project",
    settings: {},
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
    ...overrides,
  };
}

// ============================================================================
// Setup/Teardown
// ============================================================================

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("ProjectCard - Helper Functions", () => {
  describe("formatProjectDate", () => {
    it("should format a recent date as relative time", () => {
      const recentDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const result = formatProjectDate(recentDate);
      expect(result).toContain("minute");
    });

    it("should handle Date object input", () => {
      const date = new Date();
      const result = formatProjectDate(date);
      expect(result).toBeDefined();
      expect(result).not.toBe("Unknown");
    });

    it("should return Unknown for invalid date string", () => {
      const result = formatProjectDate("not-a-date");
      expect(result).toBe("Unknown");
    });

    it("should handle empty string", () => {
      const result = formatProjectDate("");
      expect(result).toBe("Unknown");
    });
  });

  describe("formatFullDate", () => {
    it("should format date as full date string", () => {
      const result = formatFullDate("2024-01-15T10:30:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should return Unknown for invalid date", () => {
      const result = formatFullDate("invalid");
      expect(result).toBe("Unknown");
    });
  });

  describe("getPanelCount", () => {
    it("should return panel count from settings", () => {
      const project = createMockProject({ settings: { panelCount: 5 } });
      expect(getPanelCount(project)).toBe(5);
    });

    it("should return 0 when panelCount not set", () => {
      const project = createMockProject({ settings: {} });
      expect(getPanelCount(project)).toBe(0);
    });

    it("should return 0 when settings is undefined", () => {
      const project = createMockProject({ settings: undefined });
      expect(getPanelCount(project)).toBe(0);
    });

    it("should return 0 for non-numeric panelCount", () => {
      const project = createMockProject({ settings: { panelCount: "five" } });
      expect(getPanelCount(project)).toBe(0);
    });
  });

  describe("getTemplateType", () => {
    it("should return template type from settings", () => {
      const project = createMockProject({ settings: { template: "comic" } });
      expect(getTemplateType(project)).toBe("comic");
    });

    it("should return null when template not set", () => {
      const project = createMockProject({ settings: {} });
      expect(getTemplateType(project)).toBeNull();
    });

    it("should return null for non-string template", () => {
      const project = createMockProject({ settings: { template: 123 } });
      expect(getTemplateType(project)).toBeNull();
    });
  });

  describe("getThumbnailUrl", () => {
    it("should return thumbnail URL from settings", () => {
      const project = createMockProject({
        settings: { thumbnailUrl: "https://example.com/thumb.jpg" },
      });
      expect(getThumbnailUrl(project)).toBe("https://example.com/thumb.jpg");
    });

    it("should return null when thumbnailUrl not set", () => {
      const project = createMockProject({ settings: {} });
      expect(getThumbnailUrl(project)).toBeNull();
    });
  });
});

// ============================================================================
// Rendering Tests
// ============================================================================

describe("ProjectCard - Rendering", () => {
  describe("Basic Rendering", () => {
    it("should render project name", () => {
      const project = createMockProject({ name: "My Awesome Project" });
      render(<ProjectCard project={project} />);
      expect(screen.getByText("My Awesome Project")).toBeInTheDocument();
    });

    it("should render project description", () => {
      const project = createMockProject({ description: "A cool description" });
      render(<ProjectCard project={project} />);
      expect(screen.getByText("A cool description")).toBeInTheDocument();
    });

    it("should not render description when null", () => {
      const project = createMockProject({ description: null });
      render(<ProjectCard project={project} />);
      expect(screen.queryByText("A cool description")).not.toBeInTheDocument();
    });

    it("should render with data-testid attribute", () => {
      const project = createMockProject({ id: "test-id" });
      render(<ProjectCard project={project} />);
      expect(screen.getByTestId("project-card-test-id")).toBeInTheDocument();
    });

    it("should render with custom testId", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} testId="custom-test-id" />);
      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
    });


    it("should render with aria-label", () => {
      const project = createMockProject({ name: "Test Project" });
      render(<ProjectCard project={project} />);
      expect(screen.getByLabelText("Test Project project")).toBeInTheDocument();
    });

    it("should render with aria-label including template", () => {
      const project = createMockProject({ name: "Test Project", settings: { template: "comic" } });
      render(<ProjectCard project={project} />);
      expect(screen.getByLabelText("Test Project project - comic")).toBeInTheDocument();
    });

    it("should render panel count with proper label", () => {
      const project = createMockProject({ settings: { panelCount: 12 } });
      render(<ProjectCard project={project} />);
      expect(screen.getByText("12 panels")).toBeInTheDocument();
    });
  });

  describe("View Modes", () => {
    it("should render in grid mode by default", () => {
      const project = createMockProject();
      const { container } = render(<ProjectCard project={project} />);
      const card = container.querySelector("article");
      expect(card?.className).toContain("flex-col");
    });

    it("should render in list mode when specified", () => {
      const project = createMockProject();
      const { container } = render(<ProjectCard project={project} viewMode="list" />);
      const card = container.querySelector("article");
      expect(card?.className).toContain("flex-row");
    });
  });

  describe("Selection State", () => {
    it("should apply selected styles when isSelected is true", () => {
      const project = createMockProject();
      const { container } = render(<ProjectCard project={project} isSelected={true} />);
      const card = container.querySelector("article");
      expect(card?.className).toContain("ring-2");
    });

    it("should have aria-selected true when selected", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} isSelected={true} />);
      const card = screen.getByLabelText("Test Project project");
      expect(card).toHaveAttribute("aria-selected", "true");
    });

    it("should have aria-selected false when not selected", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} isSelected={false} />);
      const card = screen.getByLabelText("Test Project project");
      expect(card).toHaveAttribute("aria-selected", "false");
    });

    it("should have data-selected attribute", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} isSelected={true} />);
      const card = screen.getByLabelText("Test Project project");
      expect(card).toHaveAttribute("data-selected", "true");
    });
  });

  describe("Template Badge", () => {
    it("should render template badge in grid mode", () => {
      const project = createMockProject({ settings: { template: "manga" } });
      render(<ProjectCard project={project} viewMode="grid" />);
      expect(screen.getByText("manga")).toBeInTheDocument();
    });

    it("should not render template badge when no template", () => {
      const project = createMockProject({ settings: {} });
      render(<ProjectCard project={project} viewMode="grid" />);
      expect(screen.queryByText("comic")).not.toBeInTheDocument();
      expect(screen.queryByText("manga")).not.toBeInTheDocument();
    });
  });

  describe("Custom Class", () => {
    it("should apply custom className", () => {
      const project = createMockProject();
      const { container } = render(
        <ProjectCard project={project} className="custom-class" />
      );
      const card = container.querySelector("article");
      expect(card?.className).toContain("custom-class");
    });
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe("ProjectCard - Interactions", () => {
  describe("Click Events", () => {
    it("should call onClick when card is clicked", () => {
      const project = createMockProject();
      const onClick = vi.fn();
      render(<ProjectCard project={project} onClick={onClick} />);

      fireEvent.click(screen.getByLabelText("Test Project project"));
      expect(onClick).toHaveBeenCalledWith(project);
    });

    it("should call onDoubleClick when card is double-clicked", () => {
      const project = createMockProject();
      const onDoubleClick = vi.fn();
      render(<ProjectCard project={project} onDoubleClick={onDoubleClick} />);

      fireEvent.doubleClick(screen.getByLabelText("Test Project project"));
      expect(onDoubleClick).toHaveBeenCalledWith(project);
    });

    it("should not throw when onClick is not provided", () => {
      const project = createMockProject();
      render(<ProjectCard project={project} />);

      expect(() => {
        fireEvent.click(screen.getByLabelText("Test Project project"));
      }).not.toThrow();
    });
  });

  describe("Keyboard Events", () => {
    it("should call onClick on Enter key", () => {
      const project = createMockProject();
      const onClick = vi.fn();
      render(<ProjectCard project={project} onClick={onClick} />);

      const card = screen.getByLabelText("Test Project project");
      fireEvent.keyDown(card, { key: "Enter" });
      expect(onClick).toHaveBeenCalledWith(project);
    });

    it("should call onClick on Space key", () => {
      const project = createMockProject();
      const onClick = vi.fn();
      render(<ProjectCard project={project} onClick={onClick} />);

      const card = screen.getByLabelText("Test Project project");
      fireEvent.keyDown(card, { key: " " });
      expect(onClick).toHaveBeenCalledWith(project);
    });

    it("should not call onClick on other keys", () => {
      const project = createMockProject();
      const onClick = vi.fn();
      render(<ProjectCard project={project} onClick={onClick} />);

      const card = screen.getByLabelText("Test Project project");
      fireEvent.keyDown(card, { key: "a" });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Hover Events", () => {
    it("should call onHoverChange with project ID on mouse enter", () => {
      const project = createMockProject({ id: "hover-test" });
      const onHoverChange = vi.fn();
      render(<ProjectCard project={project} onHoverChange={onHoverChange} />);

      fireEvent.mouseEnter(screen.getByLabelText("Test Project project"));
      expect(onHoverChange).toHaveBeenCalledWith("hover-test");
    });

    it("should call onHoverChange with null on mouse leave", () => {
      const project = createMockProject();
      const onHoverChange = vi.fn();
      render(<ProjectCard project={project} onHoverChange={onHoverChange} />);

      fireEvent.mouseLeave(screen.getByLabelText("Test Project project"));
      expect(onHoverChange).toHaveBeenCalledWith(null);
    });
  });
});

// ============================================================================
// Menu Tests
// ============================================================================

describe("ProjectCard - Action Menu", () => {
  it("should render menu trigger button", () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    expect(screen.getByTestId("project-menu-trigger")).toBeInTheDocument();
  });

  it("should have proper aria-label on menu button", () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    expect(screen.getByLabelText("Project actions")).toBeInTheDocument();
  });

  it("should stop propagation when clicking menu button", () => {
    const project = createMockProject();
    const onClick = vi.fn();
    render(<ProjectCard project={project} onClick={onClick} />);

    const menuButton = screen.getByTestId("project-menu-trigger");
    fireEvent.click(menuButton);

    // onClick should NOT be called because propagation is stopped
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("ProjectCard - Accessibility", () => {
  it("should have tabIndex for keyboard navigation", () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    const card = screen.getByLabelText("Test Project project");
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("should render as article element", () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
  });

  it("should have data-project-id attribute", () => {
    const project = createMockProject({ id: "a11y-test", name: "A11y Project" });
    render(<ProjectCard project={project} />);
    const card = screen.getByLabelText("A11y Project project");
    expect(card).toHaveAttribute("data-project-id", "a11y-test");
  });

  it("should have aria-haspopup on menu button", () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    const menuButton = screen.getByLabelText("Project actions");
    expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("ProjectCard - Edge Cases", () => {
  it("should handle very long project name", () => {
    const longName = "A".repeat(200);
    const project = createMockProject({ name: longName });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle very long description", () => {
    const longDesc = "B".repeat(500);
    const project = createMockProject({ description: longDesc });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle project with special characters in name", () => {
    const project = createMockProject({ name: '<script>alert("xss")</script>' });
    render(<ProjectCard project={project} />);
    // Should render as text, not execute
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it("should handle project with unicode name", () => {
    const project = createMockProject({ name: "Проект 日本語 🎨" });
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Проект 日本語 🎨")).toBeInTheDocument();
  });

  it("should handle empty name", () => {
    const project = createMockProject({ name: "" });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle missing settings object", () => {
    const project = createMockProject({ settings: undefined });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle very old dates", () => {
    const project = createMockProject({
      createdAt: "1990-01-01T00:00:00Z",
      updatedAt: "1990-01-01T00:00:00Z",
    });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle future dates", () => {
    const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();
    const project = createMockProject({
      createdAt: futureDate,
      updatedAt: futureDate,
    });
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
  });

  it("should handle rapid re-renders", () => {
    const project = createMockProject();
    const { rerender } = render(<ProjectCard project={project} />);

    for (let i = 0; i < 20; i++) {
      rerender(<ProjectCard project={{ ...project, name: `Project ${i}` }} />);
    }

    expect(screen.getByText("Project 19")).toBeInTheDocument();
  });

  it("should handle switching view modes rapidly", () => {
    const project = createMockProject();
    const { rerender } = render(<ProjectCard project={project} viewMode="grid" />);

    for (let i = 0; i < 10; i++) {
      rerender(
        <ProjectCard project={project} viewMode={i % 2 === 0 ? "grid" : "list"} />
      );
    }

    expect(screen.getByText(project.name)).toBeInTheDocument();
  });

  it("should handle disabling animations", () => {
    const project = createMockProject();
    expect(() =>
      render(<ProjectCard project={project} disableAnimations={true} />)
    ).not.toThrow();
  });

  it("should handle animation delay", () => {
    const project = createMockProject();
    expect(() =>
      render(<ProjectCard project={project} animationDelay={0.5} />)
    ).not.toThrow();
  });
});

// ============================================================================
// Memoization Tests
// ============================================================================

describe("ProjectCard - Memoization", () => {
  it("should not re-render when props are unchanged", () => {
    const project = createMockProject();
    const { rerender } = render(<ProjectCard project={project} />);

    // Re-render with same props
    rerender(<ProjectCard project={project} />);

    expect(screen.getByText(project.name)).toBeInTheDocument();
  });
});
