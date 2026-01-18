## Deferred GH Issues

- Composition export download headers + stitched output size: add integration test once mock assets or deterministic generation fixtures exist. Current contract test covers headers only; full download verification is deferred to avoid tying tests to generation pipeline.

- Layout editor (freeform + snap-to-grid + undo/redo): implement a custom layout editor with drag/resize, optional grid snapping, min/max panel sizes, gutter preservation, and custom template creation. Support soft-save on drag (local cache), explicit save on user action or teardown, and prepare for multi-page layouts (single-page UI now). Include undo/redo stack. Add unit, integration, and E2E coverage for resize constraints, gutter behavior, snap toggles, and persistence.
