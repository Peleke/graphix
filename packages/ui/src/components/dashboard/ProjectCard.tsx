/**
 * ProjectCard Component
 *
 * Displays a project in the dashboard grid/list view.
 * Professional "$2000 aesthetic" with smooth animations and dark theme.
 *
 * Designed for professional aesthetics with smooth animations.
 */

import React, { memo, useCallback, useMemo } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { Project } from "@graphix/client";
import {
  MoreVertical,
  Trash2,
  Copy,
  Download,
  FolderOpen,
  Clock,
  Layers,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDistanceToNow, format } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface ProjectCardProps {
  /** The project to display */
  project: Project;
  /** View mode - affects card layout */
  viewMode?: "grid" | "list";
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Whether this card is being hovered (external control) */
  isHovered?: boolean;
  /** Callback when card is clicked */
  onClick?: (project: Project) => void;
  /** Callback when card is double-clicked (open project) */
  onDoubleClick?: (project: Project) => void;
  /** Callback when delete is requested */
  onDelete?: (project: Project) => void;
  /** Callback when duplicate is requested */
  onDuplicate?: (project: Project) => void;
  /** Callback when export is requested */
  onExport?: (project: Project) => void;
  /** Callback when open is requested */
  onOpen?: (project: Project) => void;
  /** Callback when hover state changes */
  onHoverChange?: (projectId: string | null) => void;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Animation delay for staggered entrance */
  animationDelay?: number;
  /** Disable animations */
  disableAnimations?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Card animation variants */
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
  },
};


// ============================================================================
// Styles (CSS-in-JS for component encapsulation)
// ============================================================================

const styles = {
  card: {
    base: `
      relative overflow-hidden rounded-xl
      bg-[hsl(0_0%_9%)] border border-[hsl(0_0%_15%)]
      transition-all duration-200 ease-out
      cursor-pointer select-none
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(270_75%_55%)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(0_0%_4%)]
    `,
    grid: `
      flex flex-col
      w-full aspect-[4/3]
    `,
    list: `
      flex flex-row items-center
      w-full h-20
    `,
    selected: `
      ring-2 ring-[hsl(270_75%_55%)] border-[hsl(270_75%_55%)]
    `,
    hovered: `
      border-[hsl(0_0%_25%)] shadow-lg shadow-black/20
    `,
  },
  thumbnail: {
    grid: `
      relative w-full h-[60%] overflow-hidden
      bg-gradient-to-br from-[hsl(270_75%_25%)] to-[hsl(270_60%_15%)]
    `,
    list: `
      relative w-20 h-full overflow-hidden flex-shrink-0
      bg-gradient-to-br from-[hsl(270_75%_25%)] to-[hsl(270_60%_15%)]
      rounded-l-xl
    `,
    overlay: `
      absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
    `,
    pattern: `
      absolute inset-0 opacity-10
    `,
  },
  content: {
    grid: `
      flex flex-col justify-between p-3 flex-1
    `,
    list: `
      flex-1 flex items-center justify-between px-4 py-2
    `,
  },
  title: `
    text-sm font-semibold text-[hsl(0_0%_96%)] truncate
    group-hover:text-white transition-colors
  `,
  description: `
    text-xs text-[hsl(0_0%_45%)] truncate mt-0.5
  `,
  meta: {
    container: `
      flex items-center gap-3 text-xs text-[hsl(0_0%_45%)]
    `,
    item: `
      flex items-center gap-1
    `,
    icon: `
      w-3 h-3 opacity-60
    `,
  },
  menuButton: `
    absolute top-2 right-2 z-10
    p-1.5 rounded-lg
    bg-black/40 backdrop-blur-sm
    text-[hsl(0_0%_64%)] hover:text-white hover:bg-black/60
    opacity-0 group-hover:opacity-100
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(270_75%_55%)]
  `,
  dropdown: {
    content: `
      min-w-[180px] p-1.5 rounded-lg
      bg-[hsl(0_0%_12%)] border border-[hsl(0_0%_20%)]
      shadow-xl shadow-black/40
      animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
    `,
    item: `
      flex items-center gap-2 px-3 py-2 rounded-md
      text-sm text-[hsl(0_0%_83%)]
      outline-none cursor-pointer
      hover:bg-[hsl(0_0%_18%)] hover:text-white
      focus:bg-[hsl(0_0%_18%)] focus:text-white
      data-[highlighted]:bg-[hsl(0_0%_18%)] data-[highlighted]:text-white
      transition-colors
    `,
    itemDanger: `
      text-[hsl(0_84%_60%)]
      hover:bg-[hsl(0_84%_60%)/10] hover:text-[hsl(0_84%_60%)]
      focus:bg-[hsl(0_84%_60%)/10] focus:text-[hsl(0_84%_60%)]
      data-[highlighted]:bg-[hsl(0_84%_60%)/10] data-[highlighted]:text-[hsl(0_84%_60%)]
    `,
    separator: `
      h-px my-1 bg-[hsl(0_0%_20%)]
    `,
    icon: `
      w-4 h-4 opacity-70
    `,
  },
  badge: `
    absolute top-2 left-2 z-10
    px-2 py-0.5 rounded-md
    text-[10px] font-medium uppercase tracking-wider
    bg-[hsl(270_75%_55%)/20] text-[hsl(270_75%_65%)]
    backdrop-blur-sm border border-[hsl(270_75%_55%)/30]
  `,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date for display
 */
export function formatProjectDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Unknown";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

/**
 * Format a date as full date
 */
export function formatFullDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Unknown";
    return format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "Unknown";
  }
}

/**
 * Get panel count from project settings
 */
export function getPanelCount(project: Project): number {
  if (typeof project.settings?.panelCount === "number") {
    return project.settings.panelCount;
  }
  return 0;
}

/**
 * Get template type from project settings
 */
export function getTemplateType(project: Project): string | null {
  if (typeof project.settings?.template === "string") {
    return project.settings.template;
  }
  return null;
}

/**
 * Get thumbnail URL from project settings
 */
export function getThumbnailUrl(project: Project): string | null {
  if (typeof project.settings?.thumbnailUrl === "string") {
    return project.settings.thumbnailUrl;
  }
  return null;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ProjectMenuProps {
  project: Project;
  onOpen?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onExport?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const ProjectMenu = memo(function ProjectMenu({
  project,
  onOpen,
  onDuplicate,
  onExport,
  onDelete,
}: ProjectMenuProps) {
  const handleOpen = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onOpen?.(project);
    },
    [project, onOpen]
  );

  const handleDuplicate = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onDuplicate?.(project);
    },
    [project, onDuplicate]
  );

  const handleExport = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onExport?.(project);
    },
    [project, onExport]
  );

  const handleDelete = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onDelete?.(project);
    },
    [project, onDelete]
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={styles.menuButton}
          onClick={(e) => e.stopPropagation()}
          aria-label="Project actions"
          aria-haspopup="menu"
          data-testid="project-menu-trigger"
        >
          <MoreVertical className="w-4 h-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.dropdown.content}
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className={styles.dropdown.item}
            onSelect={handleOpen}
            data-testid="project-menu-open"
          >
            <FolderOpen className={styles.dropdown.icon} aria-hidden="true" />
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={styles.dropdown.item}
            onSelect={handleDuplicate}
            data-testid="project-menu-duplicate"
          >
            <Copy className={styles.dropdown.icon} aria-hidden="true" />
            Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={styles.dropdown.item}
            onSelect={handleExport}
            data-testid="project-menu-export"
          >
            <Download className={styles.dropdown.icon} aria-hidden="true" />
            Export
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.dropdown.separator} />

          <DropdownMenu.Item
            className={`${styles.dropdown.item} ${styles.dropdown.itemDanger}`}
            onSelect={handleDelete}
            data-testid="project-menu-delete"
          >
            <Trash2 className={styles.dropdown.icon} aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

interface ProjectThumbnailProps {
  project: Project;
  viewMode: "grid" | "list";
}

const ProjectThumbnail = memo(function ProjectThumbnail({
  project,
  viewMode,
}: ProjectThumbnailProps) {
  const thumbnailUrl = getThumbnailUrl(project);
  const template = getTemplateType(project);

  return (
    <div className={styles.thumbnail[viewMode]}>
      {/* Background pattern */}
      <div
        className={styles.thumbnail.pattern}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Thumbnail image */}
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={`${project.name} thumbnail`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Gradient overlay */}
      <div className={styles.thumbnail.overlay} />

      {/* Template badge */}
      {template && viewMode === "grid" && (
        <div className={styles.badge}>{template}</div>
      )}
    </div>
  );
});

interface ProjectInfoProps {
  project: Project;
  viewMode: "grid" | "list";
}

const ProjectInfo = memo(function ProjectInfo({
  project,
  viewMode,
}: ProjectInfoProps) {
  const panelCount = getPanelCount(project);
  const updatedAt = formatProjectDate(project.updatedAt);

  if (viewMode === "list") {
    return (
      <div className={styles.content.list}>
        <div className="flex-1 min-w-0">
          <h3 className={styles.title}>{project.name || "Untitled"}</h3>
          {project.description && (
            <p className={styles.description}>{project.description}</p>
          )}
        </div>

        <div className={styles.meta.container}>
          <div className={styles.meta.item} title={`${panelCount} panels`}>
            <Layers className={styles.meta.icon} aria-hidden="true" />
            <span>{panelCount} panels</span>
          </div>
          <time
            className={styles.meta.item}
            dateTime={project.updatedAt}
            title={`Updated ${formatFullDate(project.updatedAt)}`}
          >
            <Clock className={styles.meta.icon} aria-hidden="true" />
            <span>Updated {updatedAt}</span>
          </time>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content.grid}>
      <div>
        <h3 className={styles.title}>{project.name || "Untitled"}</h3>
        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}
      </div>

      <div className={styles.meta.container}>
        <div className={styles.meta.item} title={`${panelCount} panels`}>
          <Layers className={styles.meta.icon} aria-hidden="true" />
          <span>{panelCount} panels</span>
        </div>
        <time
          className={styles.meta.item}
          dateTime={project.updatedAt}
          title={`Updated ${formatFullDate(project.updatedAt)}`}
        >
          <Clock className={styles.meta.icon} aria-hidden="true" />
          <span>Updated {updatedAt}</span>
        </time>
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * ProjectCard - Displays a project in the dashboard
 *
 * Features:
 * - Grid and list view modes
 * - Thumbnail with gradient fallback
 * - Template badge
 * - Action menu (open, duplicate, export, delete)
 * - Smooth animations with framer-motion
 * - Keyboard accessible
 * - Selection state
 *
 * @example
 * ```tsx
 * <ProjectCard
 *   project={project}
 *   viewMode="grid"
 *   onOpen={handleOpen}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  viewMode = "grid",
  isSelected = false,
  isHovered = false,
  onClick,
  onDoubleClick,
  onDelete,
  onDuplicate,
  onExport,
  onOpen,
  onHoverChange,
  className = "",
  testId,
  animationDelay = 0,
  disableAnimations = false,
}: ProjectCardProps) {
  // Handlers
  const handleClick = useCallback(() => {
    onClick?.(project);
  }, [project, onClick]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.(project);
  }, [project, onDoubleClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(project);
      }
    },
    [project, onClick]
  );

  const handleMouseEnter = useCallback(() => {
    onHoverChange?.(project.id);
  }, [project.id, onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    onHoverChange?.(null);
  }, [onHoverChange]);

  // Computed classes
  const cardClasses = useMemo(() => {
    const classes = [
      styles.card.base,
      styles.card[viewMode],
      "group",
      className,
    ];

    if (isSelected) {
      classes.push(styles.card.selected);
    }

    if (isHovered && !isSelected) {
      classes.push(styles.card.hovered);
    }

    return classes.join(" ");
  }, [viewMode, isSelected, isHovered, className]);

  // Animation props
  const motionProps: HTMLMotionProps<"article"> = disableAnimations
    ? {}
    : {
        variants: cardVariants,
        initial: "hidden",
        animate: "visible",
        whileHover: "hover",
        whileTap: "tap",
        transition: { delay: animationDelay },
      };

  return (
    <motion.article
      className={cardClasses}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`${project.name || "Untitled"} project${project.settings?.template ? ` - ${project.settings.template}` : ""}`}
      data-testid={testId ?? `project-card-${project.id}`}
      data-project-id={project.id}
      data-selected={isSelected}
      {...motionProps}
    >
      {/* Thumbnail */}
      <ProjectThumbnail project={project} viewMode={viewMode} />

      {/* Content */}
      <ProjectInfo project={project} viewMode={viewMode} />

      {/* Action Menu */}
      <ProjectMenu
        project={project}
        onOpen={onOpen}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
    </motion.article>
  );
});

// ============================================================================
// Exports
// ============================================================================

export default ProjectCard;
