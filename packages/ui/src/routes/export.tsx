import { createFileRoute } from "@tanstack/react-router";
import { ExportDialog } from "../components/export";

export const Route = createFileRoute("/export")({
  component: ExportPage,
});

function ExportPage() {
  const params = new URLSearchParams(window.location.search);
  const storyboardId = params.get("storyboardId") ?? "";

  if (!storyboardId) {
    return (
      <div style={{ padding: "2rem", color: "#e4e4e7" }}>
        Missing storyboardId. Navigate with `?storyboardId=...`
      </div>
    );
  }

  return <ExportDialog storyboardId={storyboardId} />;
}
