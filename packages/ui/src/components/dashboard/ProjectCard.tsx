/**
 * ProjectCard Component
 *
 * Displays a project in the dashboard grid/list view.
 * Uses inline styles for consistent rendering without Tailwind.
 * Features masonry-style preview grid for multiple generated images.
 */

import React, { memo, useCallback, useState } from "react";
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
import { useProjectPreviews } from "../../api/hooks/useProjects";

// ============================================================================
// Types
// ============================================================================

export interface ProjectCardProps {
  project: Project;
  viewMode?: "grid" | "list";
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (project: Project) => void;
  onDoubleClick?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onExport?: (project: Project) => void;
  onOpen?: (project: Project) => void;
  onHoverChange?: (projectId: string | null) => void;
  className?: string;
  testId?: string;
  animationDelay?: number;
  disableAnimations?: boolean;
}

// ============================================================================
// Animation Variants
// ============================================================================

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  hover: {
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  tap: { scale: 0.98 },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function formatProjectDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Unknown";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatFullDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Unknown date";
    return format(d, "PPP 'at' p");
  } catch {
    return "Unknown date";
  }
}

export function getPanelCount(project: Project): number {
  if (typeof project.settings?.panelCount === "number") {
    return project.settings.panelCount;
  }
  return 0;
}

export function getTemplateType(project: Project): string | null {
  if (typeof project.settings?.template === "string") {
    return project.settings.template;
  }
  return null;
}

// getThumbnailUrl is deprecated in favor of useProjectPreviews masonry grid
// Kept for backwards compatibility with tests
export function getThumbnailUrl(project: Project): string | null {
  if (typeof project.settings?.thumbnailUrl === "string") {
    return project.settings.thumbnailUrl;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  return `${apiBase}/api/projects/${project.id}/thumbnail`;
}

// ============================================================================
// Component
// ============================================================================

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
  const handleClick = useCallback(() => onClick?.(project), [project, onClick]);
  const handleDoubleClick = useCallback(() => onDoubleClick?.(project), [project, onDoubleClick]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(project);
    }
  }, [project, onClick]);
  const handleMouseEnter = useCallback(() => onHoverChange?.(project.id), [project.id, onHoverChange]);
  const handleMouseLeave = useCallback(() => onHoverChange?.(null), [onHoverChange]);

  // Track which images failed to load
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Fetch preview images for masonry grid
  const { data: previews = [] } = useProjectPreviews(project.id);

  // Filter out failed images
  const validPreviews = previews.filter(p => !failedImages.has(p.url));

  const template = getTemplateType(project);
  const panelCount = getPanelCount(project);
  const updatedAt = formatProjectDate(project.updatedAt);

  // Determine grid layout based on number of valid images
  const getGridClass = (count: number) => {
    if (count === 1) return 'preview-grid-1';
    if (count === 2) return 'preview-grid-2';
    if (count === 3) return 'preview-grid-3';
    return 'preview-grid-4';
  };

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

  const isGrid = viewMode === "grid";

  return (
    <>
      <style>{`
        .project-card {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          background: linear-gradient(180deg, #1f1f23 0%, #18181b 100%);
          border: 1px solid #27272a;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .project-card:hover {
          border-color: #8b5cf6;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
          transform: translateY(-2px);
        }
        .project-card.selected {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }
        .project-card-grid {
          display: flex;
          flex-direction: column;
          width: 100%;
          min-height: 280px;
        }
        .project-card-list {
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          height: 96px;
        }
        .card-thumbnail {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #2d1f4e 0%, #1a1625 100%);
        }
        .card-thumbnail-grid {
          width: 100%;
          height: 160px;
        }
        .card-thumbnail-list {
          width: 96px;
          height: 100%;
          flex-shrink: 0;
          border-radius: 16px 0 0 16px;
        }
        .card-thumbnail::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .card-thumbnail-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.3;
          color: #a78bfa;
        }
        .card-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .project-card:hover .card-thumbnail img {
          transform: scale(1.05);
        }
        /* Masonry preview grid */
        .preview-grid {
          position: absolute;
          inset: 0;
          display: grid;
          gap: 2px;
        }
        .preview-grid-1 {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }
        .preview-grid-2 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr;
        }
        .preview-grid-3 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }
        .preview-grid-3 .preview-item:first-child {
          grid-row: span 2;
        }
        .preview-grid-4 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }
        .preview-item {
          position: relative;
          overflow: hidden;
          background: #27272a;
        }
        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .project-card:hover .preview-item img {
          transform: scale(1.08);
        }
        .preview-count-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          z-index: 2;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(0, 0, 0, 0.6);
          color: #e4e4e7;
          backdrop-filter: blur(4px);
        }
        .card-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .card-content-list {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          padding: 12px 16px;
        }
        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #fafafa;
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-description {
          font-size: 13px;
          color: #71717a;
          margin: 0 0 12px 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.4;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: auto;
        }
        .card-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #71717a;
        }
        .card-meta-item svg {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }
        .card-menu-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          padding: 6px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        .project-card:hover .card-menu-btn {
          opacity: 1;
        }
        .card-menu-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          color: #fafafa;
        }
        .card-dropdown {
          min-width: 160px;
          padding: 6px;
          background: #1f1f23;
          border: 1px solid #27272a;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }
        .card-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          color: #e4e4e7;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .card-dropdown-item:hover {
          background: #27272a;
        }
        .card-dropdown-item.danger {
          color: #f87171;
        }
        .card-dropdown-item.danger:hover {
          background: rgba(248, 113, 113, 0.1);
        }
        .card-dropdown-item svg {
          width: 16px;
          height: 16px;
          opacity: 0.7;
        }
        .card-dropdown-separator {
          height: 1px;
          background: #27272a;
          margin: 6px 0;
        }
      `}</style>

      <motion.article
        className={`project-card ${isGrid ? 'project-card-grid' : 'project-card-list'} ${isSelected ? 'selected' : ''} ${className}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
        aria-label={template ? `${project.name || 'Untitled'} project - ${template}` : `${project.name || 'Untitled'} project`}
        aria-selected={isSelected}
        data-selected={String(isSelected)}
        data-project-id={project.id}
        data-testid={testId ?? `project-card-${project.id}`}
        {...motionProps}
      >
        {/* Thumbnail with Masonry Preview Grid */}
        <div className={`card-thumbnail ${isGrid ? 'card-thumbnail-grid' : 'card-thumbnail-list'}`}>
          {validPreviews.length > 0 ? (
            <>
              <div className={`preview-grid ${getGridClass(Math.min(validPreviews.length, 4))}`}>
                {validPreviews.slice(0, 4).map((preview, i) => (
                  <div key={preview.panelId || i} className="preview-item">
                    <img
                      src={preview.url}
                      alt=""
                      loading="lazy"
                      onError={() => {
                        setFailedImages(prev => new Set(prev).add(preview.url));
                      }}
                    />
                  </div>
                ))}
              </div>
              {panelCount > 4 && (
                <div className="preview-count-badge">+{panelCount - 4} more</div>
              )}
            </>
          ) : (
            <div
              className="card-thumbnail-icon"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
          )}
          {template && isGrid && <div className="card-badge">{template}</div>}
        </div>

        {/* Content */}
        <div className={`card-content ${!isGrid ? 'card-content-list' : ''}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="card-title">{project.name || "Untitled"}</h3>
            {project.description && isGrid && (
              <p className="card-description">{project.description}</p>
            )}
          </div>
          <div className="card-meta">
            <div className="card-meta-item" title={`${panelCount} panels`}>
              <Layers />
              <span>{panelCount} panels</span>
            </div>
            <div className="card-meta-item" title={formatFullDate(project.updatedAt)}>
              <Clock />
              <time dateTime={project.updatedAt}>{updatedAt}</time>
            </div>
          </div>
        </div>

        {/* Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="card-menu-btn"
              onClick={(e) => e.stopPropagation()}
              aria-label="Project actions"
              aria-haspopup="menu"
              data-testid="project-menu-trigger"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="card-dropdown" sideOffset={5} align="end">
              <DropdownMenu.Item
                className="card-dropdown-item"
                onSelect={(e) => { e.preventDefault(); onOpen?.(project); }}
              >
                <FolderOpen /> Open
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="card-dropdown-item"
                onSelect={(e) => { e.preventDefault(); onDuplicate?.(project); }}
              >
                <Copy /> Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="card-dropdown-item"
                onSelect={(e) => { e.preventDefault(); onExport?.(project); }}
              >
                <Download /> Export
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="card-dropdown-separator" />
              <DropdownMenu.Item
                className="card-dropdown-item danger"
                onSelect={(e) => { e.preventDefault(); onDelete?.(project); }}
              >
                <Trash2 /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </motion.article>
    </>
  );
});

export default ProjectCard;
