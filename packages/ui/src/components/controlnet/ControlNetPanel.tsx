import { useMemo, useState, useEffect, type CSSProperties } from "react";
import type { ControlNetCondition, ControlNetType } from "../../types/controlnet";
import { useControlNetPreview, useControlNetPresets, useControlNetTypes, useControlNetTypesForFamily, buildControlNetFromPreset } from "../../api/hooks/useControlNet";
import { useUploadImage } from "../../api/hooks/useUploads";
import { useControlNetSettings, type ControlNetMode } from "./useControlNetSettings";
import { ModelSelector } from "../model-selector";
import { MODEL_FAMILIES } from "../../api/hooks/useModels";

interface ReferenceImage {
  id: string;
  label: string;
  path: string;
  previewUrl?: string;
  metadata?: string;
}

interface ControlNetPanelProps {
  panelId: string;
  projectId?: string | null;
  referenceImages: ReferenceImage[];
  onChange: (controls: ControlNetCondition[], mode: ControlNetMode) => void;
}

// Mode descriptions for UI
const MODE_INFO: Record<ControlNetMode, { label: string; description: string }> = {
  simple: {
    label: "Simple",
    description: "Toggle controls on/off with default settings",
  },
  standard: {
    label: "Standard",
    description: "Presets + strength sliders for common workflows",
  },
  advanced: {
    label: "Advanced",
    description: "Full control over all parameters",
  },
};

// Preprocessor options by control type
interface PreprocessorOptionDef {
  key: string;
  label: string;
  type: "number" | "boolean" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: number | boolean | string;
}

const PREPROCESSOR_OPTIONS: Record<string, PreprocessorOptionDef[]> = {
  canny: [
    { key: "low_threshold", label: "Low Threshold", type: "number", min: 0, max: 255, step: 5, default: 100 },
    { key: "high_threshold", label: "High Threshold", type: "number", min: 0, max: 255, step: 5, default: 200 },
  ],
  openpose: [
    { key: "detect_body", label: "Detect Body", type: "boolean", default: true },
    { key: "detect_face", label: "Detect Face", type: "boolean", default: true },
    { key: "detect_hands", label: "Detect Hands", type: "boolean", default: true },
  ],
  depth: [
    { key: "depth_type", label: "Depth Type", type: "select", options: ["midas", "zoe", "leres"], default: "midas" },
  ],
  lineart: [
    { key: "coarse", label: "Coarse Mode", type: "boolean", default: false },
  ],
};

// Tooltip descriptions for control types
const CONTROL_TOOLTIPS: Record<string, string> = {
  canny: "Edge detection using Canny algorithm. Great for preserving outlines, shapes, and hard edges from reference images.",
  depth: "Depth map estimation. Maintains spatial relationships and 3D structure. Ideal for matching scene layout.",
  openpose: "Human pose detection. Matches character pose, body position, and optionally face/hands from reference.",
  lineart: "Line art extraction. Preserves clean line work - perfect for maintaining character outlines from sketches.",
  scribble: "Freehand sketch guidance. Loose creative control that follows rough sketch shapes and flow.",
  softedge: "Soft edge detection (HED/PiDiNet). Smoother than canny, better for organic shapes and softer transitions.",
  semantic_seg: "Semantic segmentation. Maintains composition zones and areas - keeps sky, ground, subjects separate.",
  qrcode: "QR/pattern embedding. Hides patterns in generated image - for embedding QR codes or subtle designs.",
  tile: "Tile/detail mode. Enhances detail and texture - use for upscaling or adding fine detail.",
  ip_adapter: "IP-Adapter identity. Transfers style, face, or subject identity from reference image.",
  shuffle: "Content shuffle. Rearranges content while maintaining overall structure and colors.",
  inpaint: "Inpainting guidance. Guides regeneration in masked areas based on reference.",
  normal: "Normal map. Uses surface normals for lighting and shape guidance.",
  mlsd: "M-LSD line detection. Architectural line detection - perfect for buildings and straight edges.",
  hed: "Holistically-nested edge detection. Soft edge boundaries with good detail preservation.",
};

// Preset descriptions for tooltips
const PRESET_TOOLTIPS: Record<string, string> = {
  "character-pose": "Best for matching character poses. Uses OpenPose + Depth for accurate body positioning.",
  "scene-layout": "Maintains overall scene composition. Uses Depth + Semantic Seg for consistent backgrounds.",
  "style-transfer": "Transfers artistic style while preserving structure. Uses Canny + IP-Adapter.",
  "detail-enhance": "Adds fine detail and texture. Uses Tile mode for hi-res enhancement.",
  "face-match": "Preserves facial identity. Uses OpenPose (face) + IP-Adapter for consistent characters.",
  "architecture": "Best for buildings and interiors. Uses MLSD + Depth for clean architectural lines.",
};

// Inline styles
const s = {
  container: {
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "1rem",
    backgroundColor: "#18181b",
  } as CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  } as CSSProperties,
  title: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#f4f4f5",
  } as CSSProperties,
  subTitle: {
    fontSize: "0.75rem",
    color: "#71717a",
  } as CSSProperties,
  modeTabs: {
    display: "flex",
    gap: "0",
    background: "#27272a",
    borderRadius: "10px",
    padding: "3px",
  } as CSSProperties,
  modeTab: (active: boolean): CSSProperties => ({
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "none",
    background: active ? "#3b1d82" : "transparent",
    color: active ? "#f5f3ff" : "#a1a1aa",
    fontSize: "0.75rem",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.75rem",
  } as CSSProperties,
  card: (active: boolean, disabled?: boolean): CSSProperties => ({
    border: `1px solid ${active ? "#8b5cf6" : "#3f3f46"}`,
    borderRadius: "12px",
    padding: "0.875rem",
    background: active ? "rgba(139,92,246,0.12)" : "#1f1f23",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
  toggleSwitchContainer: (active: boolean): CSSProperties => ({
    position: "relative",
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    background: active ? "#8b5cf6" : "#3f3f46",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "none",
    padding: 0,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  }),
  toggleSwitchKnob: (active: boolean): CSSProperties => ({
    position: "absolute",
    top: "2px",
    left: active ? "22px" : "2px",
    width: "20px",
    height: "20px",
    borderRadius: "10px",
    background: "#fff",
    transition: "left 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  }),
  input: {
    width: "100%",
    padding: "0.625rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#0f0f12",
    color: "#e4e4e7",
    fontSize: "0.875rem",
    transition: "all 0.15s ease",
    outline: "none",
  } as CSSProperties,
  select: {
    padding: "0.625rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#0f0f12",
    color: "#e4e4e7",
    fontSize: "0.875rem",
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.75rem center",
    paddingRight: "2rem",
    transition: "all 0.15s ease",
    outline: "none",
  } as CSSProperties,
  button: {
    padding: "0.5rem 0.875rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#27272a",
    color: "#e4e4e7",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as CSSProperties,
  primaryButton: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    color: "#fff",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 2px 8px rgba(139,92,246,0.25)",
  } as CSSProperties,
  preview: {
    marginTop: "0.75rem",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    overflow: "hidden",
    background: "#111113",
  } as CSSProperties,
  strengthLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.75rem",
    overflow: "hidden",
  } as CSSProperties,
  strengthInput: {
    width: "70px",
    minWidth: 0,
    padding: "0.5rem 0.5rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#0f0f12",
    color: "#e4e4e7",
    fontSize: "0.875rem",
    textAlign: "center" as const,
    transition: "all 0.15s ease",
    outline: "none",
    boxSizing: "border-box" as const,
  } as CSSProperties,
  uploadLabel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.625rem 0.75rem",
    borderRadius: "8px",
    border: "1px dashed #3f3f46",
    background: "#0f0f12",
    color: "#a1a1aa",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as CSSProperties,
  historyCard: (isSelected: boolean): CSSProperties => ({
    border: `1px solid ${isSelected ? "#8b5cf6" : "#3f3f46"}`,
    background: isSelected ? "rgba(139,92,246,0.15)" : "#1f1f23",
    borderRadius: "12px",
    padding: "0.5rem",
    textAlign: "left" as const,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),
  historyPreview: {
    height: "90px",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #27272a",
    background: "#0f0f12",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#71717a",
    fontSize: "0.75rem",
  } as CSSProperties,
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as CSSProperties,
  cardTitle: (active: boolean): CSSProperties => ({
    fontWeight: 600,
    fontSize: "0.85rem",
    color: active ? "#f4f4f5" : "#a1a1aa",
    textTransform: "capitalize" as const,
  }),
  activeStatus: {
    fontSize: "0.8rem",
    color: "#a1a1aa",
    padding: "0.5rem 0.75rem",
    background: "#1f1f23",
    borderRadius: "8px",
    border: "1px solid #27272a",
  } as CSSProperties,
  lightboxOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    cursor: "pointer",
  } as CSSProperties,
  lightboxImage: {
    maxWidth: "90vw",
    maxHeight: "90vh",
    objectFit: "contain" as const,
    borderRadius: "8px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
  } as CSSProperties,
  lightboxClose: {
    position: "absolute" as const,
    top: "1rem",
    right: "1rem",
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    cursor: "pointer",
    color: "#fff",
    fontSize: "1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  } as CSSProperties,
  presetCard: (isSelected: boolean): CSSProperties => ({
    border: `1px solid ${isSelected ? "#8b5cf6" : "#3f3f46"}`,
    background: isSelected ? "rgba(139,92,246,0.15)" : "#1f1f23",
    borderRadius: "10px",
    padding: "0.75rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),
  tooltip: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "0.35rem",
    cursor: "help",
  } as CSSProperties,
  tooltipIcon: {
    width: "14px",
    height: "14px",
    color: "#71717a",
    flexShrink: 0,
  } as CSSProperties,
  tooltipText: {
    visibility: "hidden" as const,
    position: "absolute" as const,
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "200px",
    padding: "0.5rem 0.75rem",
    background: "#27272a",
    color: "#e4e4e7",
    fontSize: "0.75rem",
    lineHeight: "1.4",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    zIndex: 100,
    textAlign: "center" as const,
  } as CSSProperties,
  tooltipTextVisible: {
    visibility: "visible" as const,
    position: "absolute" as const,
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "200px",
    padding: "0.5rem 0.75rem",
    background: "#27272a",
    color: "#e4e4e7",
    fontSize: "0.75rem",
    lineHeight: "1.4",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    zIndex: 100,
    textAlign: "center" as const,
  } as CSSProperties,
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "#8b5cf6",
    cursor: "pointer",
  } as CSSProperties,
  slider: {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    background: "#3f3f46",
    appearance: "none" as const,
    cursor: "pointer",
  } as CSSProperties,
  loadingSpinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    color: "#71717a",
    fontSize: "0.875rem",
  } as CSSProperties,
  sectionDivider: {
    height: "1px",
    background: "#27272a",
    margin: "1rem 0",
  } as CSSProperties,
};

// Tooltip component for showing control type help
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={s.tooltip}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg style={s.tooltipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span style={show ? s.tooltipTextVisible : s.tooltipText}>{text}</span>
    </span>
  );
}

export function ControlNetPanel({ panelId, projectId, referenceImages, onChange }: ControlNetPanelProps) {
  const { settings, setSettings, setMode, setSelectedPreset, setSelectedModel, saveProjectDefaults } = useControlNetSettings(panelId, projectId);
  const { data: presets, isLoading: presetsLoading } = useControlNetPresets();
  const { data: types, isLoading: typesLoading } = useControlNetTypes();
  const previewMutation = useControlNetPreview();
  const uploadMutation = useUploadImage();

  const [activeControlId, setActiveControlId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string>("");
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [uploadedReferences, setUploadedReferences] = useState<ReferenceImage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);
  const [selectedModelFamily, setSelectedModelFamily] = useState<string | null>(null);

  const controls = settings.controls;
  const currentMode = settings.mode;
  const selectedModel = settings.selectedModel ?? null;

  // Fetch family-specific control types when a model is selected
  const { data: familyTypes, isLoading: familyTypesLoading } = useControlNetTypesForFamily(selectedModelFamily);

  // Handle model selection
  const handleModelChange = (model: string | null, family: string | null) => {
    setSelectedModel(model);
    setSelectedModelFamily(family);
  };

  // Get dynamic control types from backend, filtered by family if a model is selected
  const availableTypes = useMemo(() => {
    // If a model/family is selected, use family-filtered types
    if (selectedModelFamily && familyTypes?.types) {
      return familyTypes.types.map((t) => t.type);
    }
    // Otherwise use all types
    return types?.types?.map((t) => t.type) ?? [];
  }, [types, familyTypes, selectedModelFamily]);

  const allReferences = useMemo(
    () => [...uploadedReferences, ...referenceImages],
    [uploadedReferences, referenceImages]
  );

  useEffect(() => {
    onChange(controls, currentMode);
  }, [controls, currentMode, onChange]);

  const addControl = (type: ControlNetType) => {
    const typeInfo = types?.types?.find((t) => t.type === type);
    const newControl: ControlNetCondition = {
      type,
      image: referenceImage,
      strength: typeInfo?.default ?? 0.8,
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

  const toggleControl = (type: ControlNetType) => {
    const idx = controls.findIndex((c) => c.type === type);
    if (idx >= 0) {
      removeControl(idx);
    } else {
      addControl(type);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = presets?.presets?.find((p) => p.id === presetId);
    if (!preset) return;
    const newControls = buildControlNetFromPreset(preset, referenceImage);
    setSettings({ ...settings, controls: newControls, selectedPresetId: presetId });
    setSelectedPreset(presetId);
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

  const isLoading = typesLoading || presetsLoading || (selectedModelFamily ? familyTypesLoading : false);

  // Render Simple Mode - Toggle cards only
  const renderSimpleMode = () => (
    <div data-testid="controlnet-simple-mode">
      {availableTypes.length === 0 && !isLoading && (
        <div style={s.subTitle}>No control types available. Check backend connection.</div>
      )}
      <div style={s.cardGrid}>
        {availableTypes.map((type) => {
          const active = controls.some((control) => control.type === type);
          const tooltipText = CONTROL_TOOLTIPS[type];
          return (
            <div
              key={type}
              data-testid={`control-card-${type}`}
              style={s.card(active)}
              onClick={() => toggleControl(type)}
            >
              <div style={s.cardHeader}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={s.cardTitle(active)}>{type}</span>
                  {tooltipText && <Tooltip text={tooltipText} />}
                </div>
                <button
                  style={s.toggleSwitchContainer(active)}
                  role="switch"
                  aria-checked={active}
                  aria-label={`Toggle ${type}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleControl(type);
                  }}
                >
                  <span style={s.toggleSwitchKnob(active)} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Standard Mode - Presets + strength sliders
  const renderStandardMode = () => (
    <div data-testid="controlnet-standard-mode">
      {/* Preset Selection */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ ...s.subTitle, display: "block", marginBottom: "0.5rem" }}>Quick Presets</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
          {presets?.presets?.map((preset) => {
            const isSelected = settings.selectedPresetId === preset.id;
            const presetTooltip = PRESET_TOOLTIPS[preset.id] ?? preset.description ?? `Apply ${preset.name} preset`;
            return (
              <button
                key={preset.id}
                type="button"
                style={s.presetCard(isSelected)}
                onClick={() => applyPreset(preset.id)}
                data-testid={`preset-${preset.id}`}
                title={presetTooltip}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: isSelected ? "#f4f4f5" : "#a1a1aa" }}>
                  {preset.name}
                </div>
                {preset.description && (
                  <div style={{ ...s.subTitle, marginTop: "0.25rem" }}>{preset.description}</div>
                )}
                <div style={{ ...s.subTitle, marginTop: "0.25rem" }}>
                  {preset.controls.map((c) => c.type).join(", ")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Controls with Strength Sliders */}
      {controls.length > 0 && (
        <>
          <div style={s.sectionDivider} />
          <label style={{ ...s.subTitle, display: "block", marginBottom: "0.5rem" }}>Active Controls</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {controls.map((control, idx) => {
              const typeInfo = types?.types?.find((t) => t.type === control.type);
              const tooltipText = CONTROL_TOOLTIPS[control.type];
              return (
                <div
                  key={`${control.type}-${idx}`}
                  style={{
                    background: "#1f1f23",
                    borderRadius: "10px",
                    padding: "0.75rem",
                    border: "1px solid #3f3f46",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", fontWeight: 600, textTransform: "capitalize" as const, color: "#f4f4f5" }}>
                      {control.type}
                      {tooltipText && <Tooltip text={tooltipText} />}
                    </div>
                    <button
                      style={{ ...s.button, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => removeControl(idx)}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <label style={{ ...s.subTitle, minWidth: "60px" }}>Strength</label>
                      <input
                        type="range"
                        min={typeInfo?.min ?? 0}
                        max={typeInfo?.max ?? 2}
                        step={0.05}
                        value={control.strength ?? 0.8}
                        onChange={(e) => updateControl(idx, { strength: Number(e.target.value) })}
                        style={s.slider}
                      />
                      <input
                        type="number"
                        min={typeInfo?.min ?? 0}
                        max={typeInfo?.max ?? 2}
                        step={0.05}
                        value={control.strength ?? 0.8}
                        onChange={(e) => updateControl(idx, { strength: Number(e.target.value) })}
                        style={{ ...s.strengthInput, width: "60px" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Add Controls */}
      <div style={s.sectionDivider} />
      <label style={{ ...s.subTitle, display: "block", marginBottom: "0.5rem" }}>Add Control</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {availableTypes.filter((type) => !controls.some((c) => c.type === type)).slice(0, 8).map((type) => (
          <button
            key={type}
            style={{ ...s.button, fontSize: "0.75rem", padding: "0.375rem 0.625rem" }}
            onClick={() => addControl(type)}
            title={CONTROL_TOOLTIPS[type] ?? `Add ${type} control`}
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );

  // Render Advanced Mode - Full parameter control
  const renderAdvancedMode = () => (
    <div data-testid="controlnet-advanced-mode">
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <select
          style={s.select}
          value=""
          onChange={(e) => e.target.value && addControl(e.target.value as ControlNetType)}
        >
          <option value="">Add control type...</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          style={{ ...s.select, maxWidth: "200px" }}
          data-testid="controlnet-presets"
          value={settings.selectedPresetId ?? ""}
          onChange={(e) => e.target.value && applyPreset(e.target.value)}
        >
          <option value="">Apply preset...</option>
          {presets?.presets?.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {controls.length === 0 ? (
        <div style={{ ...s.subTitle, padding: "2rem", textAlign: "center" as const }}>
          No controls added. Select a control type or preset above.
        </div>
      ) : (
        controls.map((control, idx) => {
          const typeInfo = types?.types?.find((t) => t.type === control.type);
          const preprocessorOpts = PREPROCESSOR_OPTIONS[control.type] ?? [];
          const tooltipText = CONTROL_TOOLTIPS[control.type] ?? typeInfo?.notes;
          return (
            <div
              key={`${control.type}-${idx}`}
              style={{
                marginTop: "0.75rem",
                background: "#1f1f23",
                borderRadius: "10px",
                padding: "1rem",
                border: "1px solid #3f3f46",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", fontWeight: 600, textTransform: "capitalize" as const, color: "#f4f4f5", fontSize: "0.95rem" }}>
                  {control.type}
                  {tooltipText && <Tooltip text={tooltipText} />}
                </div>
                <button style={s.button} onClick={() => removeControl(idx)}>
                  Remove
                </button>
              </div>

              {/* Per-control reference image selector */}
              <div style={{ marginTop: "0.75rem" }}>
                <label style={s.subTitle}>Reference Image</label>
                <select
                  style={{ ...s.select, width: "100%", marginTop: "0.25rem" }}
                  value={control.image || ""}
                  onChange={(e) => updateControl(idx, { image: e.target.value })}
                >
                  <option value="">Use global reference</option>
                  {allReferences.map((ref) => (
                    <option key={ref.id} value={ref.path}>
                      {ref.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginTop: "0.75rem" }}>
                <div>
                  <label style={s.subTitle}>Strength</label>
                  <input
                    style={s.input}
                    type="number"
                    min={typeInfo?.min ?? 0}
                    max={typeInfo?.max ?? 2}
                    step={0.05}
                    value={control.strength ?? 0.8}
                    onChange={(e) => updateControl(idx, { strength: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={s.subTitle}>ControlNet Model</label>
                  <input
                    style={s.input}
                    data-testid="controlnet-model-selector"
                    value={control.controlnetModel ?? ""}
                    placeholder="Auto-detect"
                    onChange={(e) => updateControl(idx, { controlnetModel: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label style={s.subTitle}>Start Percent</label>
                  <input
                    style={s.input}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={control.startPercent ?? 0}
                    onChange={(e) => updateControl(idx, { startPercent: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={s.subTitle}>End Percent</label>
                  <input
                    style={s.input}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={control.endPercent ?? 1}
                    onChange={(e) => updateControl(idx, { endPercent: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Preprocessor Options - only show if available for this type */}
              {preprocessorOpts.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <label style={{ ...s.subTitle, display: "block", marginBottom: "0.5rem" }}>Preprocessor Options</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                    {preprocessorOpts.map((opt) => (
                      <div key={opt.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {opt.type === "boolean" ? (
                          <>
                            <input
                              type="checkbox"
                              style={s.checkbox}
                              checked={(control.preprocessorOptions?.[opt.key] as boolean) ?? opt.default}
                              onChange={(e) =>
                                updateControl(idx, {
                                  preprocessorOptions: {
                                    ...control.preprocessorOptions,
                                    [opt.key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            <label style={{ ...s.subTitle, fontSize: "0.7rem" }}>{opt.label}</label>
                          </>
                        ) : opt.type === "select" ? (
                          <div style={{ flex: 1 }}>
                            <label style={{ ...s.subTitle, fontSize: "0.7rem", display: "block", marginBottom: "0.25rem" }}>
                              {opt.label}
                            </label>
                            <select
                              style={{ ...s.select, width: "100%", padding: "0.4rem" }}
                              value={(control.preprocessorOptions?.[opt.key] as string) ?? opt.default}
                              onChange={(e) =>
                                updateControl(idx, {
                                  preprocessorOptions: {
                                    ...control.preprocessorOptions,
                                    [opt.key]: e.target.value,
                                  },
                                })
                              }
                            >
                              {opt.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div style={{ flex: 1 }}>
                            <label style={{ ...s.subTitle, fontSize: "0.7rem", display: "block", marginBottom: "0.25rem" }}>
                              {opt.label}
                            </label>
                            <input
                              type="number"
                              style={{ ...s.input, padding: "0.4rem" }}
                              min={opt.min}
                              max={opt.max}
                              step={opt.step ?? 1}
                              value={(control.preprocessorOptions?.[opt.key] as number) ?? opt.default}
                              onChange={(e) =>
                                updateControl(idx, {
                                  preprocessorOptions: {
                                    ...control.preprocessorOptions,
                                    [opt.key]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <button
                  style={s.button}
                  data-testid="controlnet-preview-button"
                  onClick={() => handlePreview(control)}
                  disabled={previewMutation.isPending || !control.image}
                >
                  {previewMutation.isPending ? "Processing..." : "Preview"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <section style={s.container} data-testid="controlnet-container">
      <header style={s.header}>
        <div>
          <div style={s.title}>ControlNet</div>
          <div style={s.subTitle}>{MODE_INFO[currentMode].description}</div>
        </div>
        <div style={s.modeTabs} data-testid="controlnet-mode-tabs">
          {(["simple", "standard", "advanced"] as ControlNetMode[]).map((mode) => (
            <button
              key={mode}
              style={s.modeTab(currentMode === mode)}
              onClick={() => setMode(mode)}
              data-testid={`mode-tab-${mode}`}
            >
              {MODE_INFO[mode].label}
            </button>
          ))}
        </div>
      </header>

      {/* Model Selector */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ ...s.subTitle, display: "block", marginBottom: "0.5rem" }}>Checkpoint Model</label>
        <ModelSelector
          value={selectedModel}
          onChange={handleModelChange}
          placeholder="Select checkpoint for compatibility filtering..."
        />
        {selectedModelFamily && (
          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ ...s.subTitle }}>
              Showing controls compatible with
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.25rem 0.5rem",
                background: `${MODEL_FAMILIES[selectedModelFamily]?.color ?? "#71717a"}20`,
                border: `1px solid ${MODEL_FAMILIES[selectedModelFamily]?.color ?? "#71717a"}40`,
                borderRadius: "6px",
                fontSize: "0.7rem",
                fontWeight: 500,
                color: MODEL_FAMILIES[selectedModelFamily]?.color ?? "#71717a",
              }}
            >
              {MODEL_FAMILIES[selectedModelFamily]?.label ?? selectedModelFamily}
            </span>
            <span style={s.subTitle}>
              ({availableTypes.length} types)
            </span>
          </div>
        )}
      </div>

      {/* Reference Image Selection */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={s.subTitle}>Reference Images</label>
        {allReferences.length === 0 ? (
          <div style={{ ...s.subTitle, marginTop: "0.5rem" }}>No images available. Upload a reference below.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem", marginTop: "0.5rem" }}>
            {allReferences.map((img) => {
              const isSelected = selectedReferenceId === img.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  data-testid={`history-card-${img.id}`}
                  data-selected={isSelected}
                  onClick={() => {
                    setSelectedReferenceId(img.id);
                    setReferenceImage(img.path);
                    setSettings({
                      ...settings,
                      controls: settings.controls.map((control) => ({
                        ...control,
                        image: img.path,
                      })),
                    });
                  }}
                  style={s.historyCard(isSelected)}
                >
                  <div
                    style={s.historyPreview}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (img.previewUrl) {
                        setLightboxImage({ url: img.previewUrl, label: img.label });
                      }
                    }}
                    title="Click to enlarge"
                  >
                    {img.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={img.label}
                        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                      />
                    ) : (
                      "Preview"
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {img.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Reference */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={s.uploadLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Upload reference image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              data-testid="upload-reference-input"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const response = await uploadMutation.mutateAsync(file);
                  const preview = URL.createObjectURL(file);
                  const uploaded: ReferenceImage = {
                    id: `upload-${response.filename}`,
                    label: file.name,
                    path: response.path,
                    previewUrl: preview,
                  };
                  setUploadedReferences((prev) => [uploaded, ...prev]);
                  setSelectedReferenceId(uploaded.id);
                  setReferenceImage(uploaded.path);
                } catch {
                  // Silent for now
                } finally {
                  event.target.value = "";
                }
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      <div style={s.sectionDivider} />

      {/* Mode-specific content */}
      {isLoading ? (
        <div style={s.loadingSpinner}>Loading control types...</div>
      ) : (
        <>
          {currentMode === "simple" && renderSimpleMode()}
          {currentMode === "standard" && renderStandardMode()}
          {currentMode === "advanced" && renderAdvancedMode()}
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button style={s.button} onClick={saveProjectDefaults}>
          Save as project default
        </button>
        <div data-testid="active-controls-summary" style={s.activeStatus}>
          Active: <span style={{ color: "#8b5cf6", fontWeight: 500 }}>{activeControlsSummary}</span>
        </div>
      </div>

      {/* Preprocessor Preview */}
      {previewUrl && (
        <div style={s.preview} data-testid="preprocessor-preview">
          <img src={previewUrl} alt="ControlNet preview" style={{ width: "100%", display: "block" }} />
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          style={s.lightboxOverlay}
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxImage(null)}
          role="dialog"
          aria-label={`Enlarged view of ${lightboxImage.label}`}
        >
          <button
            style={s.lightboxClose}
            onClick={() => setLightboxImage(null)}
            aria-label="Close lightbox"
          >
            ×
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.label}
            style={s.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
