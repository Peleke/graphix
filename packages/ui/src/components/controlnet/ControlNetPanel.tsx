import { useMemo, useState, useEffect } from "react";
import { css } from "../../../styled-system/css";
import type { ControlNetCondition, ControlNetType } from "../../types/controlnet";
import { useControlNetPreview, useControlNetPresets, useControlNetTypes, buildControlNetFromPreset } from "../../api/hooks/useControlNet";
import { useControlNetSettings } from "./useControlNetSettings";

interface ControlNetPanelProps {
  panelId: string;
  projectId?: string | null;
  referenceImages: Array<{ id: string; label: string; path: string }>;
  level?: 0 | 1 | 2 | 3 | 4;
  onChange: (controls: ControlNetCondition[], level: 0 | 1 | 2 | 3 | 4) => void;
}

const CONTROL_TYPES: ControlNetType[] = ["openpose", "depth", "lineart", "canny", "scribble"];

const styles = {
  container: css({
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "1rem",
    backgroundColor: "#18181b",
  }),
  header: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  }),
  title: css({
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#f4f4f5",
  }),
  subTitle: css({
    fontSize: "0.75rem",
    color: "#71717a",
  }),
  toggleGroup: css({
    display: "flex",
    gap: "0.5rem",
  }),
  toggleButton: (active: boolean) =>
    css({
      padding: "0.4rem 0.75rem",
      borderRadius: "8px",
      border: "1px solid",
      borderColor: active ? "#8b5cf6" : "#3f3f46",
      background: active ? "#3b1d82" : "#27272a",
      color: active ? "#f5f3ff" : "#a1a1aa",
      fontSize: "0.75rem",
      cursor: "pointer",
    }),
  cardGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
    marginTop: "0.75rem",
  }),
  card: (active: boolean) =>
    css({
      border: "1px solid",
      borderColor: active ? "#8b5cf6" : "#3f3f46",
      borderRadius: "10px",
      padding: "0.75rem",
      background: active ? "rgba(139,92,246,0.15)" : "#1f1f23",
    }),
  input: css({
    width: "100%",
    padding: "0.5rem 0.65rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#0f0f12",
    color: "#e4e4e7",
    fontSize: "0.8rem",
  }),
  button: css({
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#27272a",
    color: "#e4e4e7",
    fontSize: "0.8rem",
    cursor: "pointer",
  }),
  primaryButton: css({
    padding: "0.5rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #7c3aed",
    background: "#7c3aed",
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  }),
  preview: css({
    marginTop: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    overflow: "hidden",
    background: "#111113",
  }),
};

export function ControlNetPanel({ panelId, projectId, referenceImages, level, onChange }: ControlNetPanelProps) {
  const { settings, setSettings, saveProjectDefaults } = useControlNetSettings(panelId, projectId);
  const { data: presets } = useControlNetPresets();
  const { data: types } = useControlNetTypes();
  const previewMutation = useControlNetPreview();

  const [activeView, setActiveView] = useState<"visual" | "full">("visual");
  const [activeControlId, setActiveControlId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string>("");

  const controls = settings.controls;

  useEffect(() => {
    onChange(controls, settings.level);
  }, [controls, settings.level, onChange]);

  useEffect(() => {
    if (typeof level === "number" && level !== settings.level) {
      setSettings({ ...settings, level });
    }
  }, [level, settings, setSettings]);

  const addControl = (type: ControlNetType) => {
    const newControl: ControlNetCondition = {
      type,
      image: referenceImage,
      strength: types?.types?.find((t) => t.type === type)?.default ?? 0.8,
      preprocess: true,
    };
    setSettings({ ...settings, controls: [...controls, newControl] });
    setActiveControlId(type);
  };

  const updateControl = (index: number, updates: Partial<ControlNetCondition>) => {
    const next = controls.map((control, idx) =>
      idx === index ? { ...control, ...updates } : control
    );
    setSettings({ ...settings, controls: next });
  };

  const removeControl = (index: number) => {
    const next = controls.filter((_, idx) => idx !== index);
    setSettings({ ...settings, controls: next });
  };

  const applyPreset = (presetId: string) => {
    const preset = presets?.presets?.find((p) => p.id === presetId);
    if (!preset) return;
    const newControls = buildControlNetFromPreset(preset, referenceImage);
    setSettings({ ...settings, controls: newControls });
  };

  const handlePreview = async (control: ControlNetCondition) => {
    setPreviewUrl(null);
    try {
      const result = await previewMutation.mutateAsync({
        inputImage: control.image,
        controlType: control.type,
        preprocessorOptions: control.preprocessorOptions,
      });
      if (result.previewPath || result.signedUrl) {
        setPreviewUrl(result.signedUrl ?? result.previewPath ?? null);
      }
    } catch {
      setPreviewUrl(null);
    }
  };

  const activeControlsSummary = useMemo(
    () => controls.map((control) => control.type).join(", ") || "None",
    [controls]
  );

  return (
    <section className={styles.container} data-testid="controlnet-container">
      <header className={styles.header}>
        <div>
          <div className={styles.title}>ControlNet</div>
          <div className={styles.subTitle}>Per-panel control stack with project defaults</div>
        </div>
        <div className={styles.toggleGroup} data-testid="controlnet-view-toggle">
          <button
            className={styles.toggleButton(activeView === "visual")}
            onClick={() => setActiveView("visual")}
          >
            Visual
          </button>
          <button
            className={styles.toggleButton(activeView === "full")}
            onClick={() => setActiveView("full")}
          >
            Full Control
          </button>
        </div>
      </header>

      <div className={css({ marginBottom: "0.75rem" })}>
        <label className={styles.subTitle}>Reference image</label>
        <select
          className={styles.input}
          data-testid="reference-image-select"
          value={referenceImage}
          onChange={(event) => {
            setReferenceImage(event.target.value);
            setSettings({
              ...settings,
              controls: settings.controls.map((control) => ({
                ...control,
                image: event.target.value,
              })),
            });
          }}
        >
          <option value="">Select reference (generation history)</option>
          {referenceImages.map((img) => (
            <option key={img.id} value={img.path}>
              {img.label}
            </option>
          ))}
        </select>
      </div>

      {activeView === "visual" && (
        <div data-testid="controlnet-visual-cards">
          <div className={styles.cardGrid}>
            {CONTROL_TYPES.map((type) => {
              const active = controls.some((control) => control.type === type);
              return (
                <div
                  key={type}
                  data-testid={`control-card-${type}`}
                  className={styles.card(active)}
                >
                  <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
                    <div className={css({ fontWeight: 600, fontSize: "0.85rem" })}>{type}</div>
                    <button
                      className={styles.button}
                      role="switch"
                      aria-checked={active}
                      onClick={() => {
                        const idx = controls.findIndex((c) => c.type === type);
                        if (idx >= 0) {
                          removeControl(idx);
                        } else {
                          addControl(type);
                        }
                      }}
                    >
                      {active ? "On" : "Off"}
                    </button>
                  </div>
                  <div className={css({ marginTop: "0.5rem" })}>
                    <label className={styles.subTitle}>Strength</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      max={2}
                      step={0.05}
                      value={
                        controls.find((control) => control.type === type)?.strength ?? 0.8
                      }
                      onChange={(event) => {
                        const idx = controls.findIndex((control) => control.type === type);
                        if (idx >= 0) {
                          updateControl(idx, { strength: Number(event.target.value) });
                        } else {
                          addControl(type);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === "full" && (
        <div data-testid="controlnet-full-control">
          <div className={css({ display: "flex", gap: "0.5rem", alignItems: "center" })}>
            <select
              className={styles.input}
              value={activeControlId ?? ""}
              onChange={(event) => setActiveControlId(event.target.value)}
            >
              <option value="">Select control</option>
              {controls.map((control, idx) => (
                <option key={`${control.type}-${idx}`} value={String(idx)}>
                  {control.type}
                </option>
              ))}
            </select>
            <button
              className={styles.button}
              onClick={() => addControl("openpose")}
            >
              Add OpenPose
            </button>
            <button
              className={styles.button}
              onClick={() => addControl("depth")}
            >
              Add Depth
            </button>
          </div>

          {controls.map((control, idx) => (
            <div key={`${control.type}-${idx}`} className={css({ marginTop: "0.75rem" })}>
              <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
                <div className={css({ fontWeight: 600 })}>{control.type}</div>
                <button className={styles.button} onClick={() => removeControl(idx)}>
                  Remove
                </button>
              </div>
              <div className={css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginTop: "0.5rem" })}>
                <div>
                  <label className={styles.subTitle}>Strength</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={2}
                    step={0.05}
                    value={control.strength ?? 0.8}
                    onChange={(event) => updateControl(idx, { strength: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <label className={styles.subTitle}>ControlNet Model</label>
                  <input
                    className={styles.input}
                    data-testid="controlnet-model-selector"
                    value={control.controlnetModel ?? ""}
                    placeholder="Optional control model"
                    onChange={(event) => updateControl(idx, { controlnetModel: event.target.value })}
                  />
                </div>
                <div>
                  <label className={styles.subTitle}>Start Percent</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={control.startPercent ?? 0}
                    onChange={(event) => updateControl(idx, { startPercent: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <label className={styles.subTitle}>End Percent</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={control.endPercent ?? 1}
                    onChange={(event) => updateControl(idx, { endPercent: Number(event.target.value) })}
                  />
                </div>
              </div>
              <div className={css({ marginTop: "0.5rem", display: "flex", gap: "0.5rem" })}>
                <button className={styles.button} data-testid="controlnet-preview-button" onClick={() => handlePreview(control)}>
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={css({ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" })}>
        <select
          className={styles.input}
          data-testid="controlnet-presets"
          onChange={(event) => applyPreset(event.target.value)}
        >
          <option value="">Apply preset</option>
          {presets?.presets?.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <button className={styles.button} onClick={saveProjectDefaults}>
          Save as project default
        </button>
        <div data-testid="active-controls-summary" className={styles.subTitle}>
          Active controls: {activeControlsSummary}
        </div>
      </div>

      {previewUrl && (
        <div className={styles.preview} data-testid="preprocessor-preview">
          <img src={previewUrl} alt="ControlNet preview" style={{ width: "100%", display: "block" }} />
        </div>
      )}
    </section>
  );
}
