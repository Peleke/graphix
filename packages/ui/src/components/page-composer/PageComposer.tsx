/**
 * Page Composer Component
 *
 * Canvas-centric layout for composing comic pages.
 * Features: toolbar controls, centered canvas, filmstrip panel selector.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStoryboard, storyKeys } from "../../api/hooks/useStories";
import {
  useTemplates,
  usePageSizes,
  useComposePage,
  usePageLayout,
  useSavePageLayout,
} from "../../api/hooks/useComposition";
import { PanelGenerator } from "../panel-generator/PanelGenerator";
import { ExportDialog } from "../export";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ImagePosition {
  x: number; // percentage offset from center (-50 to 50)
  y: number;
  scale: number; // 1 = fit, >1 = zoom in
}

interface PageComposerProps {
  storyboardId: string;
  projectId: string;
}

export function PageComposer({ storyboardId }: PageComposerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<string>("us-comic");
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [imagePositions, setImagePositions] = useState<Record<string, ImagePosition>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const hydratingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { data: storyboard, refetch: refetchStoryboard } = useStoryboard(storyboardId);
  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { data: pageSizes } = usePageSizes();
  const composePage = useComposePage();
  const { data: savedLayout } = usePageLayout(storyboardId, 1);
  const saveLayout = useSavePageLayout();

  const pageSizeOptions = useMemo(() => {
    if (Array.isArray(pageSizes)) return pageSizes;
    if (pageSizes && typeof pageSizes === "object") {
      return Object.entries(pageSizes as Record<string, any>).map(([id, size]) => ({
        id,
        ...size,
      }));
    }
    return [];
  }, [pageSizes]);

  const selectedTemplate = useMemo(
    () => templates?.find((template: any) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const selectedPageSize = useMemo(
    () => pageSizeOptions.find((size: any) => size.id === pageSize),
    [pageSizeOptions, pageSize]
  );

  const panelList = storyboard?.panels ?? [];

  const getPanelById = (panelId: string | null) =>
    panelList.find((panel: any) => panel.id === panelId) ?? null;

  const storageKey = useMemo(
    () => (selectedTemplateId ? `page-composer:${storyboardId}:${selectedTemplateId}` : null),
    [selectedTemplateId, storyboardId]
  );

  // Calculate responsive canvas dimensions
  const canvasDimensions = useMemo(() => {
    if (!selectedPageSize) return { width: 400, height: 600, scale: 1 };
    const aspectRatio = selectedPageSize.width / selectedPageSize.height;

    // Target: fill available space with padding
    const maxWidth = Math.min(600, window.innerWidth - 48);
    const maxHeight = window.innerHeight - 200; // Account for toolbar + filmstrip

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height), scale: width / selectedPageSize.width };
  }, [selectedPageSize]);

  // Calculate panels without images for validation warning
  const panelsWithoutImages = useMemo(() => {
    if (!selectedTemplate?.slots) return [];
    return selectedTemplate.slots
      .map((slot: any) => slotAssignments[slot.id])
      .filter((panelId: string | undefined) => {
        if (!panelId) return false;
        const panel = getPanelById(panelId);
        return panel && !panel.selectedGeneration?.id;
      });
  }, [selectedTemplate, slotAssignments, panelList]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveSlotId(null);
    setSlotAssignments({});
    setImagePositions({});
    setPreviewUrl(null);
    setShowTemplateDropdown(false);
    hydratedRef.current = false;
  };

  const assignPanelToSlot = (panelId: string, slotId: string) => {
    setSlotAssignments((current) => ({ ...current, [slotId]: panelId }));
    // Initialize image position for this slot
    setImagePositions((current) => ({
      ...current,
      [slotId]: current[slotId] || { x: 0, y: 0, scale: 1 },
    }));
  };

  const clearSlotAssignment = (slotId: string) => {
    setSlotAssignments((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  };

  const autoFillSlots = () => {
    if (!selectedTemplate?.slots || panelList.length === 0) return;
    const nextAssignments: Record<string, string> = {};
    const nextPositions: Record<string, ImagePosition> = {};
    selectedTemplate.slots.forEach((slot: any, index: number) => {
      const panel = panelList[index];
      if (panel) {
        nextAssignments[slot.id] = panel.id;
        nextPositions[slot.id] = { x: 0, y: 0, scale: 1 };
      }
    });
    setSlotAssignments(nextAssignments);
    setImagePositions(nextPositions);
  };

  // Hydrate from saved layout
  useEffect(() => {
    if (hydratedRef.current || !storageKey) return;
    const layoutConfig = savedLayout?.layoutConfig as Record<string, unknown> | undefined;
    const savedTemplateId = typeof layoutConfig?.template === "string" ? layoutConfig.template : null;
    const savedAssignments =
      layoutConfig && typeof layoutConfig.slotAssignments === "object" && layoutConfig.slotAssignments
        ? (layoutConfig.slotAssignments as Record<string, string>)
        : null;

    if (savedTemplateId && (!selectedTemplateId || selectedTemplateId === savedTemplateId)) {
      hydratingRef.current = true;
      setSelectedTemplateId(savedTemplateId);
      if (savedAssignments) setSlotAssignments(savedAssignments);
      const match = pageSizeOptions.find(
        (size: any) => size.width === layoutConfig?.width && size.height === layoutConfig?.height
      );
      if (match) setPageSize(match.id);
      hydratedRef.current = true;
      window.setTimeout(() => { hydratingRef.current = false; }, 0);
      return;
    }

    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      hydratedRef.current = true;
      hydratingRef.current = false;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        hydratingRef.current = true;
        setSlotAssignments(parsed);
      }
    } catch { /* ignore */ }
    finally {
      hydratedRef.current = true;
      window.setTimeout(() => { hydratingRef.current = false; }, 0);
    }
  }, [savedLayout, storageKey, selectedTemplateId, pageSizeOptions]);

  // Persist to localStorage
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(slotAssignments));
  }, [storageKey, slotAssignments]);

  // Auto-save to backend
  useEffect(() => {
    if (!selectedTemplateId || !hydratedRef.current || hydratingRef.current) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      setSaveStatus("saving");
      saveLayout.mutate(
        {
          storyboardId,
          name: `${storyboard?.storyboard?.name ?? "Storyboard"} Page 1`,
          pageNumber: 1,
          templateId: selectedTemplateId,
          pageSize,
          slotAssignments,
        },
        {
          onSuccess: () => { if (!controller.signal.aborted) setSaveStatus("saved"); },
          onError: () => { if (!controller.signal.aborted) setSaveStatus("error"); },
        }
      );
    }, 350);

    return () => {
      controller.abort();
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [slotAssignments, selectedTemplateId, pageSize, storyboardId, storyboard?.storyboard?.name, saveLayout]);

  // Auto-clear saved status
  useEffect(() => {
    if (saveStatus === "saved") {
      const t = window.setTimeout(() => setSaveStatus("idle"), 2000);
      return () => window.clearTimeout(t);
    }
  }, [saveStatus]);

  const handleSlotDrop = (slotId: string, panelId: string, sourceSlotId?: string | null) => {
    setSlotAssignments((current) => {
      const next = { ...current };
      if (sourceSlotId && next[slotId] && sourceSlotId !== slotId) {
        const temp = next[slotId];
        next[slotId] = panelId;
        next[sourceSlotId] = temp;
        return next;
      }
      next[slotId] = panelId;
      if (sourceSlotId && sourceSlotId !== slotId && !next[sourceSlotId]) {
        delete next[sourceSlotId];
      }
      return next;
    });
    setImagePositions((current) => ({
      ...current,
      [slotId]: current[slotId] || { x: 0, y: 0, scale: 1 },
    }));
  };

  const handlePanelUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: storyKeys.storyboard(storyboardId) });
    refetchStoryboard();
  }, [queryClient, storyboardId, refetchStoryboard]);

  const handleImageError = useCallback((generationId: string) => {
    setFailedImages((prev) => new Set(prev).add(generationId));
  }, []);

  const handleComposePreview = async () => {
    if (!selectedTemplateId || !selectedTemplate?.slots?.length) return;
    setComposeError(null);

    const assignedPanels = selectedTemplate.slots
      .map((slot: any) => slotAssignments[slot.id])
      .filter(Boolean);
    if (assignedPanels.length === 0) return;

    try {
      setIsComposing(true);
      const result: any = await composePage.mutateAsync({
        storyboardId,
        templateId: selectedTemplateId,
        panelIds: assignedPanels,
        outputName: `preview_${storyboardId}.png`,
        pageSize,
      });
      const url = result?.outputPath
        ? `/api/composition/download?path=${encodeURIComponent(result.outputPath)}`
        : null;
      setPreviewUrl(url);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Composition failed");
    } finally {
      setIsComposing(false);
    }
  };

  // Image position drag handling
  const handleImageDrag = useCallback((slotId: string, deltaX: number, deltaY: number) => {
    setImagePositions((current) => {
      const pos = current[slotId] || { x: 0, y: 0, scale: 1 };
      return {
        ...current,
        [slotId]: {
          ...pos,
          x: Math.max(-50, Math.min(50, pos.x + deltaX)),
          y: Math.max(-50, Math.min(50, pos.y + deltaY)),
        },
      };
    });
  }, []);

  const assignedCount = Object.keys(slotAssignments).length;
  const totalSlots = selectedTemplate?.slots?.length || 0;

  return (
    <div className="page-composer-v2" data-testid="page-composer-container">
      <style>{`
        .page-composer-v2 {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, #0f0f10 0%, #18181b 100%);
          color: #fafafa;
          overflow: hidden;
        }

        /* ===== TOOLBAR ===== */
        .composer-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(24, 24, 27, 0.95);
          border-bottom: 1px solid #27272a;
          flex-wrap: wrap;
          backdrop-filter: blur(8px);
          z-index: 100;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: #3f3f46;
          margin: 0 0.25rem;
        }

        .toolbar-spacer {
          flex: 1;
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 140px;
        }

        .dropdown-trigger:hover {
          background: #3f3f46;
          border-color: #52525b;
        }

        .dropdown-trigger.active {
          border-color: #8b5cf6;
          background: #3f3f46;
        }

        .dropdown-trigger svg {
          margin-left: auto;
          opacity: 0.5;
          transition: transform 0.2s;
        }

        .dropdown-trigger.active svg {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 200px;
          max-height: 320px;
          overflow-y: auto;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          z-index: 200;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.75rem;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: background 0.1s;
        }

        .dropdown-item:hover {
          background: #3f3f46;
        }

        .dropdown-item.selected {
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .dropdown-item-meta {
          font-size: 0.6875rem;
          color: #71717a;
        }

        .toolbar-select {
          padding: 0.5rem 0.75rem;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.8125rem;
          cursor: pointer;
          min-width: 160px;
        }

        .toolbar-select:hover {
          border-color: #52525b;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: #27272a;
          color: #fafafa;
          border-color: #52525b;
        }

        .toolbar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .toolbar-btn.primary {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: white;
        }

        .toolbar-btn.primary:hover:not(:disabled) {
          background: #7c3aed;
          border-color: #7c3aed;
        }

        .save-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: #71717a;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .save-badge.saving { color: #eab308; }
        .save-badge.saved { color: #10b981; }
        .save-badge.error { color: #ef4444; }

        /* ===== ERROR BANNER ===== */
        .error-strip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(239, 68, 68, 0.15);
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 0.8125rem;
        }

        .error-strip button {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #fca5a5;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .error-strip button:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .warning-strip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(234, 179, 8, 0.15);
          border-bottom: 1px solid rgba(234, 179, 8, 0.3);
          color: #fde047;
          font-size: 0.8125rem;
        }

        /* ===== CANVAS AREA ===== */
        .canvas-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          overflow: hidden;
          background: radial-gradient(ellipse at center, #1f1f23 0%, #0f0f10 100%);
        }

        .canvas-wrapper {
          position: relative;
          background: white;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 25px 80px rgba(0,0,0,0.6),
            0 10px 30px rgba(139, 92, 246, 0.1);
          border-radius: 2px;
        }

        .canvas-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #71717a;
          text-align: center;
          padding: 2rem;
        }

        .canvas-empty h3 {
          color: #a1a1aa;
          font-size: 1.125rem;
          margin: 0;
        }

        .canvas-empty p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* ===== PANEL SLOTS ===== */
        .panel-slot {
          position: absolute;
          border: 2px dashed rgba(139, 92, 246, 0.6);
          background: rgba(139, 92, 246, 0.05);
          cursor: pointer;
          transition: all 0.15s ease;
          overflow: hidden;
        }

        .panel-slot:hover {
          border-color: #a78bfa;
          background: rgba(139, 92, 246, 0.1);
        }

        .panel-slot.active {
          border-color: #8b5cf6;
          border-style: solid;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }

        .panel-slot.filled {
          border-style: solid;
          border-color: rgba(16, 185, 129, 0.6);
        }

        .panel-slot.filled:hover {
          border-color: #10b981;
        }

        .slot-image-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: move;
        }

        .slot-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          transition: transform 0.1s ease-out;
        }

        .slot-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: rgba(139, 92, 246, 0.7);
          font-size: 0.6875rem;
          text-align: center;
          gap: 0.25rem;
        }

        .slot-number {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 18px;
          height: 18px;
          background: rgba(0,0,0,0.6);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 600;
          color: white;
          z-index: 5;
        }

        .slot-actions {
          position: absolute;
          top: 4px;
          right: 4px;
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 5;
        }

        .panel-slot:hover .slot-actions {
          opacity: 1;
        }

        .slot-action-btn {
          width: 22px;
          height: 22px;
          background: rgba(0,0,0,0.7);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .slot-action-btn:hover {
          background: rgba(0,0,0,0.9);
        }

        /* ===== COMPOSE OVERLAY ===== */
        .compose-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          z-index: 20;
          border-radius: 2px;
        }

        .compose-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #3f3f46;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===== FILMSTRIP ===== */
        .filmstrip {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(24, 24, 27, 0.95);
          border-top: 1px solid #27272a;
          overflow-x: auto;
          backdrop-filter: blur(8px);
        }

        .filmstrip-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .filmstrip-divider {
          width: 1px;
          height: 48px;
          background: #3f3f46;
          flex-shrink: 0;
        }

        .filmstrip-panels {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          overflow-x: auto;
          padding: 0.25rem 0;
          scrollbar-width: thin;
          scrollbar-color: #3f3f46 transparent;
        }

        .filmstrip-panels::-webkit-scrollbar {
          height: 4px;
        }

        .filmstrip-panels::-webkit-scrollbar-track {
          background: transparent;
        }

        .filmstrip-panels::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 2px;
        }

        .filmstrip-item {
          flex-shrink: 0;
          width: 72px;
          height: 72px;
          border-radius: 8px;
          background: #27272a;
          border: 2px solid transparent;
          cursor: grab;
          overflow: hidden;
          position: relative;
          transition: all 0.15s;
        }

        .filmstrip-item:hover {
          border-color: #52525b;
          transform: translateY(-2px);
        }

        .filmstrip-item.selected {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }

        .filmstrip-item.assigned {
          border-color: #10b981;
        }

        .filmstrip-item.assigned::after {
          content: '✓';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          font-size: 0.5rem;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .filmstrip-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .filmstrip-item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
        }

        .filmstrip-item-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.25rem;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          font-size: 0.5625rem;
          color: white;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ===== PANEL EDITOR MODAL ===== */
        .panel-editor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          backdrop-filter: blur(4px);
          padding: 1.5rem;
        }

        .panel-editor-modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          height: 85vh;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
          overflow: hidden;
        }

        .panel-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #27272a;
          background: #0f0f10;
          flex-shrink: 0;
        }

        .panel-editor-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fafafa;
        }

        .panel-editor-close {
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.15s ease;
        }

        .panel-editor-close:hover {
          background: #27272a;
          color: #fafafa;
        }

        .panel-editor-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .panel-editor-content > * {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* ===== EXPORT MODAL ===== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          backdrop-filter: blur(4px);
        }

        .modal {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 1.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .composer-toolbar {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .toolbar-divider {
            display: none;
          }

          .toolbar-btn span {
            display: none;
          }

          .dropdown-trigger {
            min-width: 120px;
            padding: 0.5rem;
          }

          .canvas-container {
            padding: 0.75rem;
          }

          .filmstrip {
            padding: 0.5rem;
          }

          .filmstrip-item {
            width: 56px;
            height: 56px;
          }

          .panel-editor-modal {
            max-width: 100%;
            height: 95vh;
            max-height: 95vh;
            margin: 0;
            border-radius: 12px 12px 0 0;
          }

          .panel-editor-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .panel-editor-content {
            overflow-y: auto;
          }
        }

        @media (max-width: 480px) {
          .toolbar-spacer {
            display: none;
          }

          .composer-toolbar {
            justify-content: space-between;
          }

          .filmstrip-label {
            display: none;
          }

          .filmstrip-divider {
            display: none;
          }
        }
      `}</style>

      {/* ===== TOOLBAR ===== */}
      <div className="composer-toolbar">
        <div className="toolbar-group">
          {/* Template Dropdown */}
          <div className="dropdown-container">
            <button
              className={`dropdown-trigger ${showTemplateDropdown ? 'active' : ''}`}
              data-testid="template-dropdown-trigger"
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
            >
              <span>{selectedTemplate?.name || 'Select Layout'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
            {showTemplateDropdown && (
              <div className="dropdown-menu">
                {loadingTemplates ? (
                  <div className="dropdown-item">Loading...</div>
                ) : (
                  templates?.map((template: any) => (
                    <div
                      key={template.id}
                      className={`dropdown-item ${selectedTemplateId === template.id ? 'selected' : ''}`}
                      data-testid="template-card"
                      onClick={() => handleSelectTemplate(template.id)}
                    >
                      <span>{template.name}</span>
                      <span className="dropdown-item-meta">{template.slotCount || template.slots?.length || 0} slots</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Page Size */}
          <select
            className="toolbar-select"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
          >
            {pageSizeOptions.map((size: any) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-divider" />

        {selectedTemplate && (
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              data-testid="assign-autofill"
              onClick={autoFillSlots}
              disabled={panelList.length === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h4v4H4zM14 4h4v4h-4zM4 14h4v4H4zM14 14h4v4h-4z"/>
              </svg>
              <span>Auto-fill</span>
            </button>

            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
              {assignedCount}/{totalSlots} filled
            </span>
          </div>
        )}

        <div className="toolbar-spacer" />

        {saveStatus !== 'idle' && (
          <div className={`save-badge ${saveStatus}`} data-testid="save-indicator">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && '! Error'}
          </div>
        )}

        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            data-testid="page-composer-preview"
            onClick={handleComposePreview}
            disabled={!selectedTemplateId || isComposing || assignedCount === 0}
          >
            {isComposing ? 'Composing...' : 'Preview'}
          </button>
          <button
            className="toolbar-btn primary"
            data-testid="page-composer-export"
            onClick={() => setShowExportModal(true)}
          >
            Export
          </button>
        </div>
      </div>

      {/* ===== ERROR BANNER ===== */}
      {composeError && (
        <div className="error-strip" data-testid="compose-error-banner">
          <span>Composition failed: {composeError}</span>
          <button onClick={() => setComposeError(null)} data-testid="dismiss-error">Dismiss</button>
        </div>
      )}

      {/* ===== VALIDATION WARNING ===== */}
      {panelsWithoutImages.length > 0 && (
        <div className="warning-strip" data-testid="validation-warning">
          <span>{panelsWithoutImages.length} panel{panelsWithoutImages.length > 1 ? 's' : ''} assigned with no image</span>
        </div>
      )}

      {/* ===== CANVAS AREA ===== */}
      <div className="canvas-container" ref={canvasContainerRef}>
        {selectedTemplate && storyboard ? (
          <div
            className="canvas-wrapper"
            data-testid="page-canvas"
            style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
          >
            {isComposing && (
              <div className="compose-overlay" data-testid="compose-overlay">
                <div className="compose-spinner" />
                <span style={{ color: '#a1a1aa', fontSize: '0.8125rem' }}>Composing page...</span>
              </div>
            )}

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                data-testid="page-preview"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.3 }}
              />
            )}

            {selectedTemplate.slots?.map((slot: any, index: number) => {
              const assignedPanelId = slotAssignments[slot.id];
              const panel = getPanelById(assignedPanelId);
              const generationId = panel?.selectedGeneration?.id;
              const imageUrl = generationId ? `/api/generations/${generationId}/image` : null;
              const hasFailedImage = generationId && failedImages.has(generationId);
              const position = imagePositions[slot.id] || { x: 0, y: 0, scale: 1 };
              const isActive = activeSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  className={`panel-slot ${isActive ? 'active' : ''} ${imageUrl && !hasFailedImage ? 'filled' : ''}`}
                  data-testid="panel-slot"
                  data-selected={isActive}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${slot.width}%`,
                    height: `${slot.height}%`,
                  }}
                  onClick={() => {
                    setActiveSlotId(slot.id);
                    if (assignedPanelId) setSelectedPanelId(assignedPanelId);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const panelId = e.dataTransfer.getData('panelId');
                    const sourceSlotId = e.dataTransfer.getData('sourceSlotId');
                    if (panelId) handleSlotDrop(slot.id, panelId, sourceSlotId || null);
                  }}
                >
                  <span className="slot-number">{index + 1}</span>

                  {assignedPanelId && (
                    <div className="slot-actions">
                      <button
                        className="slot-action-btn"
                        title="Edit panel"
                        onClick={(e) => { e.stopPropagation(); setEditingPanelId(assignedPanelId); }}
                      >✎</button>
                      <button
                        className="slot-action-btn"
                        title="Remove"
                        data-testid="assign-clear-slot"
                        onClick={(e) => { e.stopPropagation(); clearSlotAssignment(slot.id); }}
                      >×</button>
                    </div>
                  )}

                  {imageUrl && !hasFailedImage ? (
                    <DraggableImage
                      src={imageUrl}
                      alt={`Slot ${index + 1}`}
                      position={position}
                      onDrag={(dx, dy) => handleImageDrag(slot.id, dx, dy)}
                      onError={() => generationId && handleImageError(generationId)}
                    />
                  ) : (
                    <div className="slot-placeholder" data-testid="slot-placeholder">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm16 14V6H4v12h16zM6 17l5-5 2 2 4-5 5 6H6z"/>
                      </svg>
                      <span>{assignedPanelId ? 'No image' : 'Drop panel here'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="canvas-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <h3>Select a layout</h3>
            <p>Choose a page layout from the dropdown above to start composing.</p>
          </div>
        )}
      </div>

      {/* ===== FILMSTRIP ===== */}
      <div className="filmstrip">
        <span className="filmstrip-label">Panels</span>
        <div className="filmstrip-divider" />
        <div className="filmstrip-panels">
          {panelList.length === 0 ? (
            <span style={{ color: '#52525b', fontSize: '0.75rem' }}>No panels in storyboard</span>
          ) : (
            panelList.map((panel: any) => {
              const imageUrl = panel.selectedGeneration?.id
                ? `/api/generations/${panel.selectedGeneration.id}/image`
                : null;
              const isAssigned = Object.values(slotAssignments).includes(panel.id);
              const isSelected = selectedPanelId === panel.id;

              return (
                <div
                  key={panel.id}
                  className={`filmstrip-item ${isSelected ? 'selected' : ''} ${isAssigned ? 'assigned' : ''}`}
                  data-testid="panel-list-item"
                  data-selected={isSelected}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('panelId', panel.id);
                  }}
                  onClick={() => {
                    setSelectedPanelId(panel.id);
                    if (activeSlotId) assignPanelToSlot(panel.id, activeSlotId);
                  }}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={panel.name || `Panel ${panel.position}`} />
                  ) : (
                    <div className="filmstrip-item-placeholder">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm16 14V6H4v12h16zM6 17l5-5 2 2 4-5 5 6H6z"/>
                      </svg>
                    </div>
                  )}
                  <div className="filmstrip-item-label">{panel.name || `Panel ${panel.position}`}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== PANEL EDITOR MODAL ===== */}
      {editingPanelId && (
        <div className="panel-editor-overlay" onClick={() => setEditingPanelId(null)}>
          <div className="panel-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-editor-header">
              <span className="panel-editor-title">Edit Panel</span>
              <button className="panel-editor-close" onClick={() => setEditingPanelId(null)}>×</button>
            </div>
            <div className="panel-editor-content">
              <PanelGenerator
                panelId={editingPanelId}
                storyboardId={storyboardId}
                onGenerationSelected={handlePanelUpdated}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== EXPORT MODAL ===== */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <ExportDialog storyboardId={storyboardId} templateId={selectedTemplateId ?? undefined} />
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showTemplateDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setShowTemplateDropdown(false)}
        />
      )}
    </div>
  );
}

/**
 * Draggable Image Component
 * Allows panning image within slot for cropping
 */
interface DraggableImageProps {
  src: string;
  alt: string;
  position: ImagePosition;
  onDrag: (deltaX: number, deltaY: number) => void;
  onError: () => void;
}

function DraggableImage({ src, alt, position, onDrag, onError }: DraggableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - lastPos.current.x) * 0.2;
      const dy = (e.clientY - lastPos.current.y) * 0.2;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onDrag(dx, dy);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="slot-image-container"
      onMouseDown={handleMouseDown}
    >
      <img
        className="slot-image"
        src={src}
        alt={alt}
        onError={onError}
        draggable={false}
        style={{
          transform: `translate(${position.x}%, ${position.y}%) scale(${position.scale})`,
        }}
      />
    </div>
  );
}
