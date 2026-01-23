import { useMemo, useState, type CSSProperties } from "react";
import { useModels, MODEL_FAMILIES, type ModelInfo } from "../../api/hooks/useModels";

interface ModelSelectorProps {
  value: string | null;
  onChange: (model: string | null, family: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Inline styles
const s = {
  container: {
    position: "relative" as const,
  } as CSSProperties,
  select: {
    width: "100%",
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
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: "4px",
    background: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    maxHeight: "300px",
    overflowY: "auto" as const,
    zIndex: 50,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  } as CSSProperties,
  familyGroup: {
    padding: "0.5rem 0",
    borderBottom: "1px solid #27272a",
  } as CSSProperties,
  familyHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#71717a",
  } as CSSProperties,
  familyBadge: (color: string): CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
  }),
  option: (isSelected: boolean): CSSProperties => ({
    display: "block",
    width: "100%",
    padding: "0.5rem 0.75rem 0.5rem 1.5rem",
    background: isSelected ? "rgba(139, 92, 246, 0.15)" : "transparent",
    border: "none",
    textAlign: "left" as const,
    cursor: "pointer",
    color: isSelected ? "#f4f4f5" : "#a1a1aa",
    fontSize: "0.85rem",
    transition: "all 0.1s ease",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  optionHover: {
    background: "rgba(139, 92, 246, 0.1)",
    color: "#f4f4f5",
  } as CSSProperties,
  loading: {
    padding: "1rem",
    textAlign: "center" as const,
    color: "#71717a",
    fontSize: "0.85rem",
  } as CSSProperties,
  empty: {
    padding: "1rem",
    textAlign: "center" as const,
    color: "#71717a",
    fontSize: "0.85rem",
  } as CSSProperties,
  selectedBadge: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.25rem 0.5rem",
    background: `${color}20`,
    border: `1px solid ${color}40`,
    borderRadius: "6px",
    fontSize: "0.7rem",
    fontWeight: 500,
    color: color,
    marginLeft: "0.5rem",
  }),
};

export function ModelSelector({
  value,
  onChange,
  placeholder = "Select model...",
  disabled = false,
}: ModelSelectorProps) {
  const { data, isLoading } = useModels();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Get current model info
  const currentModel = useMemo(() => {
    if (!value || !data?.models) return null;
    return data.models.find((m) => m.filename === value) ?? null;
  }, [value, data?.models]);

  const currentFamily = currentModel?.family ?? null;
  const familyInfo = currentFamily
    ? MODEL_FAMILIES[currentFamily] ?? MODEL_FAMILIES.unknown
    : null;

  // Group models by family
  const groupedModels = useMemo(() => {
    if (!data?.byFamily) return {};
    return data.byFamily;
  }, [data?.byFamily]);

  // Family order for display
  const familyOrder = ["illustrious", "pony", "sdxl", "realistic", "sd15", "flux", "unknown"];

  const handleSelect = (model: ModelInfo) => {
    onChange(model.filename, model.family);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
  };

  // Format filename for display
  const formatFilename = (filename: string) => {
    // Remove extension and path
    let name = filename.replace(/\.[^/.]+$/, "");
    // Remove common suffixes
    name = name.replace(/_fp16|_safetensors|_pruned/gi, "");
    // Truncate if too long
    if (name.length > 35) {
      name = name.substring(0, 32) + "...";
    }
    return name;
  };

  return (
    <div style={s.container}>
      <button
        type="button"
        style={{
          ...s.select,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {value ? (
          <span style={{ display: "flex", alignItems: "center" }}>
            {formatFilename(value)}
            {familyInfo && (
              <span style={s.selectedBadge(familyInfo.color)}>
                <span style={s.familyBadge(familyInfo.color)} />
                {familyInfo.label}
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: "#71717a" }}>{placeholder}</span>
        )}
      </button>

      {isOpen && (
        <div style={s.dropdown} data-testid="model-dropdown">
          {isLoading ? (
            <div style={s.loading}>Loading models...</div>
          ) : Object.keys(groupedModels).length === 0 ? (
            <div style={s.empty}>No models available</div>
          ) : (
            <>
              {/* Clear option */}
              {value && (
                <div style={{ ...s.familyGroup, borderBottom: "1px solid #3f3f46" }}>
                  <button
                    type="button"
                    style={{
                      ...s.option(false),
                      color: "#a1a1aa",
                      paddingLeft: "0.75rem",
                    }}
                    onClick={handleClear}
                    onMouseEnter={() => setHoveredOption("__clear__")}
                    onMouseLeave={() => setHoveredOption(null)}
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {/* Grouped models */}
              {familyOrder.map((family) => {
                const models = groupedModels[family];
                if (!models || models.length === 0) return null;

                const info = MODEL_FAMILIES[family] ?? MODEL_FAMILIES.unknown;

                return (
                  <div key={family} style={s.familyGroup}>
                    <div style={s.familyHeader}>
                      <span style={s.familyBadge(info.color)} />
                      {info.label}
                      <span style={{ color: "#52525b", fontWeight: 400 }}>
                        ({models.length})
                      </span>
                    </div>
                    {models.map((model) => {
                      const isSelected = value === model.filename;
                      const isHovered = hoveredOption === model.filename;
                      return (
                        <button
                          key={model.filename}
                          type="button"
                          style={{
                            ...s.option(isSelected),
                            ...(isHovered && !isSelected ? s.optionHover : {}),
                          }}
                          onClick={() => handleSelect(model)}
                          onMouseEnter={() => setHoveredOption(model.filename)}
                          onMouseLeave={() => setHoveredOption(null)}
                          title={model.filename}
                        >
                          {formatFilename(model.filename)}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
