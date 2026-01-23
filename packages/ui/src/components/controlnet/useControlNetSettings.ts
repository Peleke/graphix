import { useEffect, useMemo, useState } from "react";
import type { ControlNetCondition } from "../../types/controlnet";

export type ControlNetMode = "simple" | "standard" | "advanced";

export interface ControlNetSettings {
  mode: ControlNetMode;
  controls: ControlNetCondition[];
  selectedPresetId?: string;
  selectedModel?: string;
}

const DEFAULT_SETTINGS: ControlNetSettings = {
  mode: "standard",
  controls: [],
};

/**
 * Migrate old settings format (level 0-4) to new mode format
 */
function migrateSettings(parsed: Record<string, unknown>): ControlNetSettings {
  // Check for old level-based settings
  if ("level" in parsed && typeof parsed.level === "number") {
    const level = parsed.level as number;
    let mode: ControlNetMode;
    if (level <= 1) {
      mode = "simple";
    } else if (level <= 3) {
      mode = "standard";
    } else {
      mode = "advanced";
    }
    return {
      mode,
      controls: Array.isArray(parsed.controls) ? parsed.controls : [],
      selectedPresetId: parsed.selectedPresetId as string | undefined,
      selectedModel: parsed.selectedModel as string | undefined,
    };
  }

  // Already new format
  return {
    mode: (parsed.mode as ControlNetMode) ?? "standard",
    controls: Array.isArray(parsed.controls) ? parsed.controls : [],
    selectedPresetId: parsed.selectedPresetId as string | undefined,
    selectedModel: parsed.selectedModel as string | undefined,
  };
}

function safeParseSettings(raw: string | null): ControlNetSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return migrateSettings(parsed);
  } catch {
    return null;
  }
}

export function useControlNetSettings(panelId: string, projectId?: string | null) {
  const panelKey = useMemo(() => `controlnet:panel:${panelId}`, [panelId]);
  const projectKey = useMemo(
    () => (projectId ? `controlnet:project:${projectId}` : null),
    [projectId]
  );

  const [settings, setSettings] = useState<ControlNetSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const storage =
    typeof window !== "undefined" &&
    window.localStorage &&
    typeof window.localStorage.getItem === "function"
      ? window.localStorage
      : null;

  useEffect(() => {
    if (isHydrated) return;
    const panelSettings = safeParseSettings(storage?.getItem(panelKey) ?? null);
    if (panelSettings) {
      setSettings(panelSettings);
      setIsHydrated(true);
      return;
    }

    if (projectKey) {
      const projectSettings = safeParseSettings(storage?.getItem(projectKey) ?? null);
      if (projectSettings) {
        setSettings(projectSettings);
        setIsHydrated(true);
        return;
      }
    }

    setSettings(DEFAULT_SETTINGS);
    setIsHydrated(true);
  }, [panelKey, projectKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!storage) return;
    storage.setItem(panelKey, JSON.stringify(settings));
  }, [panelKey, settings, isHydrated]);

  const saveProjectDefaults = () => {
    if (!projectKey || !storage) return;
    storage.setItem(projectKey, JSON.stringify(settings));
  };

  const clearPanelSettings = () => {
    if (storage) {
      storage.removeItem(panelKey);
    }
    setSettings(DEFAULT_SETTINGS);
  };

  const setMode = (mode: ControlNetMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  };

  const setSelectedPreset = (presetId: string | undefined) => {
    setSettings((prev) => ({ ...prev, selectedPresetId: presetId }));
  };

  const setSelectedModel = (model: string | undefined) => {
    setSettings((prev) => ({ ...prev, selectedModel: model }));
  };

  return {
    settings,
    setSettings,
    setMode,
    setSelectedPreset,
    setSelectedModel,
    saveProjectDefaults,
    clearPanelSettings,
  };
}
