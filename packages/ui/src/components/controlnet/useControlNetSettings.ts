import { useEffect, useMemo, useState } from "react";
import type { ControlNetCondition } from "../../types/controlnet";

export interface ControlNetSettings {
  level: 0 | 1 | 2 | 3 | 4;
  controls: ControlNetCondition[];
}

const DEFAULT_SETTINGS: ControlNetSettings = {
  level: 3,
  controls: [],
};

function safeParseSettings(raw: string | null): ControlNetSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ControlNetSettings;
    if (!parsed || !Array.isArray(parsed.controls)) return null;
    return parsed;
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

  return {
    settings,
    setSettings,
    saveProjectDefaults,
    clearPanelSettings,
  };
}
