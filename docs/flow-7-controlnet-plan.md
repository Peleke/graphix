## Flow 7 ControlNet Implementation Plan

### Goals
- Per-panel ControlNet configuration with project-level defaults.
- Multi-control stack support (single-control fallback OK for MVP).
- Manual preview of preprocessing output.
- Per-control model selection.

### Design Tasks
- ControlNet panel in Panel Generator (visual cards + full control).
- Reference image selection from generation history.
- Control stack editor (add/remove/reorder).
- Preview panel for preprocessor output.
- Preset selection (read-only from API).
- “Save as project default” action.

### API Schema Updates
- `GenerateImage` accepts `controlNet[]` stack.
- `POST /consistency/controlnet/preview` for preprocessing previews.
- OpenAPI schemas for ControlNet conditions and preview response.

### Test Scaffolding
- Unit: `ControlNetPanel` rendering + toggle behavior.
- Unit: `useControlNetPreview` hook.
- Contract: `/api/consistency/controlnet/preview` validation.
- E2E: Flow 7 ControlNet in Panel Generator.

### MVP Staging Notes
- Multi-control exposed in UI immediately.
- Backend stack falls back to single control until ComfyUI supports multi-control endpoint.
- Preview uses manual trigger, not auto-debounce.
