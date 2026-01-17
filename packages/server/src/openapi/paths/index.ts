/**
 * OpenAPI Paths Index
 *
 * Merges all path definitions for the OpenAPI spec.
 */

import { projectPaths } from "./projects.js";
import { characterPaths } from "./characters.js";
import { storyboardPaths } from "./storyboards.js";
import { panelPaths } from "./panels.js";
import { generationPaths } from "./generations.js";
import { captionPaths } from "./captions.js";
import { batchPaths } from "./batch.js";
import { compositionPaths } from "./composition.js";
import { consistencyPaths } from "./consistency.js";
import { storyPaths } from "./story.js";
import { narrativePaths } from "./narrative.js";
import { reviewPaths } from "./review.js";
import { textPaths } from "./text.js";

export const allPaths = {
  ...projectPaths,
  ...characterPaths,
  ...storyboardPaths,
  ...panelPaths,
  ...generationPaths,
  ...captionPaths,
  ...batchPaths,
  ...compositionPaths,
  ...consistencyPaths,
  ...storyPaths,
  ...narrativePaths,
  ...reviewPaths,
  ...textPaths,
};
