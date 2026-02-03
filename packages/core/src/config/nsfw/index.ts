/**
 * NSFW Config Index
 *
 * Loads NSFW content from the spice-instructions file if it exists,
 * otherwise uses placeholder text.
 */

let instructions: {
  SPICE_POSITIVE_PROMPT_INSTRUCTION: string;
  SPICE_NEGATIVE_PROMPT_INSTRUCTION: string;
  SPICE_DIALOGUE_INSTRUCTION: string;
  SPICE_NARRATION_INSTRUCTION: string;
  SPICE_DESCRIPTION_INSTRUCTION: string;
};

try {
  // Try to load the actual NSFW instructions
  instructions = await import("./spice-instructions.js");
} catch {
  // Fall back to placeholder if file doesn't exist
  instructions = {
    SPICE_POSITIVE_PROMPT_INSTRUCTION: "Make this prompt more explicit and NSFW.",
    SPICE_NEGATIVE_PROMPT_INSTRUCTION: "Add NSFW quality negative tags.",
    SPICE_DIALOGUE_INSTRUCTION: "Make this dialogue more explicit.",
    SPICE_NARRATION_INSTRUCTION: "Make this narration more explicit.",
    SPICE_DESCRIPTION_INSTRUCTION: "Make this description more explicit.",
  };
}

export const {
  SPICE_POSITIVE_PROMPT_INSTRUCTION,
  SPICE_NEGATIVE_PROMPT_INSTRUCTION,
  SPICE_DIALOGUE_INSTRUCTION,
  SPICE_NARRATION_INSTRUCTION,
  SPICE_DESCRIPTION_INSTRUCTION,
} = instructions;
