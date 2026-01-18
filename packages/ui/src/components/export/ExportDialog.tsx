import { useMemo, useState } from "react";
import { css } from "../../../styled-system/css";
import { useComposePage, useComposeStoryboard, useExportPage } from "../../api/hooks/useComposition";
import { useStoryboard } from "../../api/hooks/useStories";

type ExportFormat = "png-single" | "png-all" | "pdf";

interface ExportDialogProps {
  storyboardId: string;
  templateId?: string;
}

const styles = {
  dialog: css({
    border: "1px solid #27272a",
    borderRadius: "16px",
    background: "#18181b",
    padding: "1.5rem",
    color: "#f4f4f5",
    maxWidth: "720px",
    margin: "2rem auto",
  }),
  title: css({ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }),
  subtitle: css({ color: "#a1a1aa", marginBottom: "1.5rem", fontSize: "0.875rem" }),
  section: css({ marginBottom: "1.5rem" }),
  label: css({ fontSize: "0.75rem", textTransform: "uppercase", color: "#71717a", marginBottom: "0.5rem" }),
  button: css({
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#27272a",
    color: "#f4f4f5",
    cursor: "pointer",
    fontSize: "0.875rem",
  }),
  primaryButton: css({
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    border: "1px solid #7c3aed",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  }),
  radioCard: (selected: boolean) =>
    css({
      border: "1px solid",
      borderColor: selected ? "#8b5cf6" : "#3f3f46",
      borderRadius: "10px",
      padding: "0.75rem",
      background: selected ? "rgba(139,92,246,0.15)" : "#1f1f23",
      display: "flex",
      gap: "0.75rem",
      alignItems: "flex-start",
      cursor: "pointer",
    }),
};

export function ExportDialog({ storyboardId, templateId = "six-grid" }: ExportDialogProps) {
  const { data: storyboardFull } = useStoryboard(storyboardId);
  const composePage = useComposePage();
  const composeStoryboard = useComposeStoryboard();
  const exportPage = useExportPage();

  const [format, setFormat] = useState<ExportFormat>("png-single");
  const [dpi, setDpi] = useState(300);
  const [status, setStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparing export");

  const panelIds = useMemo(() => storyboardFull?.panels?.map((p: any) => p.id) ?? [], [storyboardFull]);

  const buildDownloadUrl = (outputPath: string | null | undefined) => {
    if (!outputPath) return null;
    return `/api/composition/download?path=${encodeURIComponent(outputPath)}`;
  };

  const handleExport = async () => {
    setStatus("exporting");
    setError(null);
    setDownloadUrl(null);
    setProgressValue(10);
    setProgressLabel("Preparing export");

    try {
      if (format === "png-single") {
        setProgressValue(35);
        setProgressLabel("Composing page");
        const composeResult: any = await composePage.mutateAsync({
          storyboardId,
          templateId,
          panelIds,
          outputName: `${storyboardId}_page1.png`,
        });
        setProgressValue(90);
        setProgressLabel("Finalizing download");
        setDownloadUrl(buildDownloadUrl(composeResult?.outputPath ?? null));
        setProgressValue(100);
        setStatus("done");
        return;
      }

      setProgressValue(35);
      setProgressLabel("Composing storyboard");
      const composed: any = await composeStoryboard.mutateAsync({
        storyboardId,
        templateId,
        outputPrefix: storyboardId,
      });
      const firstOutput = composed?.pages?.[0]?.outputPath;

      if (format === "png-all") {
        setProgressValue(90);
        setProgressLabel("Finalizing download");
        setDownloadUrl(buildDownloadUrl(firstOutput ?? null));
        setProgressValue(100);
        setStatus("done");
        return;
      }

      setProgressValue(70);
      setProgressLabel("Exporting PDF");
      const exportResult: any = await exportPage.mutateAsync({
        inputPath: firstOutput ?? `${storyboardId}_page1.png`,
        outputPath: `${storyboardId}.pdf`,
        format: "pdf",
        dpi,
      });

      setProgressValue(90);
      setProgressLabel("Finalizing download");
      setDownloadUrl(buildDownloadUrl(exportResult?.outputPath ?? null));
      setProgressValue(100);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setStatus("error");
    }
  };

  const handleCancel = () => {
    setStatus("idle");
    setError(null);
    setDownloadUrl(null);
    setProgressValue(0);
    setProgressLabel("Preparing export");
  };

  return (
    <div className={styles.dialog} data-testid="export-dialog">
      <div className={styles.title}>Export</div>
      <div className={styles.subtitle}>Export your pages with metadata included.</div>

      <div className={styles.section} data-testid="export-format">
        <div className={styles.label}>Format</div>
        <div className={css({ display: "grid", gap: "0.75rem" })}>
          <label className={styles.radioCard(format === "png-single")}>
            <input
              type="radio"
              name="export-format"
              checked={format === "png-single"}
              onChange={() => setFormat("png-single")}
            />
            <div>
              <div>PNG (single)</div>
              <div className={styles.subtitle}>Current page only</div>
            </div>
          </label>
          <label className={styles.radioCard(format === "png-all")}>
            <input
              type="radio"
              name="export-format"
              checked={format === "png-all"}
              onChange={() => setFormat("png-all")}
            />
            <div>
              <div>PNG (all)</div>
              <div className={styles.subtitle}>All pages stitched</div>
            </div>
          </label>
          <label className={styles.radioCard(format === "pdf")}>
            <input
              type="radio"
              name="export-format"
              checked={format === "pdf"}
              onChange={() => setFormat("pdf")}
            />
            <div>
              <div>PDF</div>
              <div className={styles.subtitle}>Print-ready</div>
            </div>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <label>
          <input type="checkbox" checked disabled />
          <span className={css({ marginLeft: "0.5rem" })}>Metadata always included</span>
        </label>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>
          Resolution / DPI
          <input
            type="number"
            value={dpi}
            onChange={(event) => setDpi(Number(event.target.value))}
            className={css({
              width: "120px",
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #3f3f46",
              background: "#0f0f12",
              color: "#e4e4e7",
              display: "block",
              marginTop: "0.5rem",
            })}
          />
        </label>
      </div>

      {status === "exporting" && (
        <div data-testid="export-progress" className={styles.subtitle}>
          {progressLabel}
          <div
            className={css({
              marginTop: "0.5rem",
              background: "#27272a",
              borderRadius: "999px",
              height: "8px",
              overflow: "hidden",
            })}
          >
            <div
              role="progressbar"
              aria-valuenow={progressValue}
              aria-valuemin={0}
              aria-valuemax={100}
              className={css({
                height: "100%",
                width: `${progressValue}%`,
                background: "#8b5cf6",
                transition: "width 150ms ease",
              })}
            />
          </div>
        </div>
      )}
      {status === "done" && (
        <div data-testid="export-complete" className={styles.subtitle}>
          Export complete.
        </div>
      )}
      {status === "error" && <div className={styles.subtitle}>{error}</div>}

      {downloadUrl && (
        <a href={downloadUrl} data-testid="export-download" className={styles.button}>
          Download
        </a>
      )}

      <div className={css({ display: "flex", gap: "0.75rem", marginTop: "1rem" })}>
        <button className={styles.primaryButton} onClick={handleExport} disabled={status === "exporting"}>
          Export
        </button>
        <button className={styles.button} onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
