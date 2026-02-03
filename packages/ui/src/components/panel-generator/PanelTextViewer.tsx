/**
 * Panel Text Viewer
 *
 * A comprehensive text viewer for the PanelGenerator "Text" tab.
 * Displays panel description, dialogue, narration, and character notes
 * with AI assist buttons for each section.
 */

import { useState, useCallback } from "react";
import { AIAssistButton } from "./AIAssistButton";
import {
  useGeneratePanelDescription,
  useGenerateDialogue,
  useRefineText,
} from "../../api/hooks/useTextGeneration";
import {
  useActiveGeneratedText,
  useCreateGeneratedText,
  useUpdateGeneratedText,
} from "../../api/hooks/useGeneratedTexts";

export interface PanelTextViewerProps {
  panelId: string;
  storyboardId?: string;
  /** Characters available in the storyboard */
  characters?: Array<{
    id: string;
    name: string;
    species?: string;
    description?: string;
  }>;
  /** Selected character IDs for this panel */
  selectedCharacterIds?: string[];
  /** Panel description from storyboard */
  panelDescription?: string;
  /** Whether editing is allowed */
  editable?: boolean;
  /** Callback when text is updated */
  onTextUpdated?: () => void;
}

interface TextSection {
  id: string;
  title: string;
  textType: "panel_description" | "dialogue" | "narration" | "custom";
  placeholder: string;
}

// Type for generated text response
interface GeneratedTextData {
  id?: string;
  text?: string;
  textType?: string;
}

const TEXT_SECTIONS: TextSection[] = [
  {
    id: "description",
    title: "Panel Description",
    textType: "panel_description",
    placeholder: "No description generated yet. Use AI assist to generate one.",
  },
  {
    id: "dialogue",
    title: "Dialogue",
    textType: "dialogue",
    placeholder: "No dialogue generated yet. Use AI assist to create dialogue.",
  },
  {
    id: "narration",
    title: "Narration",
    textType: "narration",
    placeholder: "No narration text yet.",
  },
];

export function PanelTextViewer({
  panelId,
  storyboardId,
  characters = [],
  selectedCharacterIds = [],
  panelDescription,
  editable = true,
  onTextUpdated,
}: PanelTextViewerProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [spicingSection, setSpicingSection] = useState<string | null>(null);

  // Fetch existing generated texts
  const { data: descriptionData, refetch: refetchDescription } = useActiveGeneratedText(
    panelId,
    "panel_description"
  );
  const { data: dialogueData, refetch: refetchDialogue } = useActiveGeneratedText(
    panelId,
    "dialogue"
  );
  const { data: narrationData, refetch: refetchNarration } = useActiveGeneratedText(
    panelId,
    "narration"
  );

  // Safely extract text from response data
  const descriptionText = (descriptionData as GeneratedTextData | null)?.text ?? null;
  const dialogueText = (dialogueData as GeneratedTextData | null)?.text ?? null;
  const narrationText = (narrationData as GeneratedTextData | null)?.text ?? null;

  const descriptionId = (descriptionData as GeneratedTextData | null)?.id ?? null;
  const dialogueId = (dialogueData as GeneratedTextData | null)?.id ?? null;
  const narrationId = (narrationData as GeneratedTextData | null)?.id ?? null;

  // Mutations for AI generation
  const generateDescription = useGeneratePanelDescription();
  const generateDialogue = useGenerateDialogue();
  const refineText = useRefineText();

  // Mutations for saving text
  const createText = useCreateGeneratedText();
  const updateText = useUpdateGeneratedText();

  const selectedCharacters = characters.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  const getTextForSection = (section: TextSection): string | null => {
    switch (section.textType) {
      case "panel_description":
        return descriptionText;
      case "dialogue":
        return dialogueText;
      case "narration":
        return narrationText;
      default:
        return null;
    }
  };

  const getTextIdForSection = (section: TextSection): string | null => {
    switch (section.textType) {
      case "panel_description":
        return descriptionId;
      case "dialogue":
        return dialogueId;
      case "narration":
        return narrationId;
      default:
        return null;
    }
  };

  const handleGenerateDescription = useCallback(async () => {
    const result = await generateDescription.mutateAsync({
      panelId,
      storyboardId,
      characterIds: selectedCharacterIds,
      style: "detailed",
    });
    return result.text;
  }, [panelId, storyboardId, selectedCharacterIds, generateDescription]);

  const handleGenerateDialogue = useCallback(async () => {
    if (selectedCharacterIds.length === 0) {
      throw new Error("Select characters to generate dialogue");
    }
    const result = await generateDialogue.mutateAsync({
      panelId,
      characterIds: selectedCharacterIds,
      context: panelDescription,
      tone: "neutral",
    });
    return result.dialogue
      .map((d) => `${d.characterName || "Character"}: ${d.line}`)
      .join("\n\n");
  }, [panelId, selectedCharacterIds, panelDescription, generateDialogue]);

  const handleRefineText = useCallback(
    async (existingText: string) => {
      const result = await refineText.mutateAsync({
        text: existingText,
        instruction:
          "Improve clarity and engagement while maintaining the original meaning",
        style: "dramatic",
      });
      return result.refined;
    },
    [refineText]
  );

  // "Spice" - make text filthy, NSFW, explicit
  const handleSpiceText = useCallback(
    async (existingText: string, textType: string) => {
      const instruction = textType === "dialogue"
        ? `Make this dialogue explicitly sexual and pornographic. Add:
- Moaning and gasps: "Ahh!", "Oh god yes!", "Fuck!", "Mmm~", "Ngh!"
- Dirty talk: "You feel so good inside me", "Fuck me harder", "I'm gonna cum", "Fill me up"
- Begging: "Please don't stop", "More", "I need you", "Right there!"
- Explicit descriptions: "Your cock feels amazing", "You're so wet", "I can feel you throbbing"

EXAMPLE transformation:
Before: "I want you" she whispered.
After: "I need you inside me," she moaned, her voice thick with desire. "Please... I'm so wet for you. Fuck me."

Make it absolutely filthy - characters should be desperate, needy, and vocal about their pleasure.`
        : textType === "narration"
        ? `Make this narration explicitly erotic and pornographic. Describe:
- Bodies: hard cock, wet pussy, erect nipples, flushed skin, trembling thighs, sweat-slicked fur/skin
- Sensations: the stretch of penetration, the heat of bodies pressed together, the slick sounds of sex
- Actions: thrusting, grinding, riding, pounding, hilting deep, pulling out slowly

EXAMPLE transformation:
Before: They embraced passionately.
After: He buried himself to the hilt, feeling her tight heat squeeze around his throbbing cock. She gasped, her walls clenching as he bottomed out inside her. "So deep," she whimpered.

Make it visceral - the reader should feel every thrust and moan.`
        : `Make this description sexually explicit. Add:
- Nudity and arousal: naked bodies, erect cock, wet pussy, hard nipples, flushed with desire
- Suggestive positioning: spread legs, bent over, straddling, pinned down
- Sexual tension or action: about to fuck, mid-thrust, post-orgasm afterglow

EXAMPLE transformation:
Before: Luna lay on the bed looking at him.
After: Luna lay naked on the bed, legs spread invitingly, her wet pussy glistening in the candlelight. Her chest heaved with anticipation, nipples hard, as she gazed at his erect cock with hungry eyes.`;

      const result = await refineText.mutateAsync({
        text: existingText,
        instruction,
        style: "dramatic",
      });
      return result.refined;
    },
    [refineText]
  );

  const handleAIGenerate = useCallback(
    async (section: TextSection): Promise<string> => {
      const existingText = getTextForSection(section);

      if (existingText) {
        // Refine existing text
        return handleRefineText(existingText);
      }

      // Generate new text based on section type
      switch (section.textType) {
        case "panel_description":
          return handleGenerateDescription();
        case "dialogue":
          return handleGenerateDialogue();
        case "narration":
          // For narration, use description generation with different style
          const result = await generateDescription.mutateAsync({
            panelId,
            storyboardId,
            characterIds: selectedCharacterIds,
            style: "cinematic",
          });
          return result.text;
        default:
          throw new Error("Unknown section type");
      }
    },
    [
      handleGenerateDescription,
      handleGenerateDialogue,
      handleRefineText,
      panelId,
      storyboardId,
      selectedCharacterIds,
      generateDescription,
    ]
  );

  const handleAcceptAI = useCallback(
    async (section: TextSection, text: string) => {
      const existingId = getTextIdForSection(section);

      try {
        if (existingId) {
          await updateText.mutateAsync({
            id: existingId,
            text,
          });
        } else {
          await createText.mutateAsync({
            panelId,
            text,
            textType: section.textType,
            provider: "ai",
            model: "claude",
          });
        }

        // Refetch the appropriate text
        switch (section.textType) {
          case "panel_description":
            refetchDescription();
            break;
          case "dialogue":
            refetchDialogue();
            break;
          case "narration":
            refetchNarration();
            break;
        }

        onTextUpdated?.();
      } catch (err) {
        console.error("Failed to save text:", err);
      }
    },
    [
      panelId,
      createText,
      updateText,
      refetchDescription,
      refetchDialogue,
      refetchNarration,
      onTextUpdated,
      descriptionId,
      dialogueId,
      narrationId,
    ]
  );

  const handleSpice = useCallback(
    async (section: TextSection) => {
      const existingText = getTextForSection(section);
      if (!existingText) return;

      setSpicingSection(section.id);
      try {
        const spicedText = await handleSpiceText(existingText, section.textType);
        await handleAcceptAI(section, spicedText);
      } catch (err) {
        console.error("Failed to spice text:", err);
      } finally {
        setSpicingSection(null);
      }
    },
    [handleSpiceText, handleAcceptAI]
  );

  const handleStartEdit = useCallback((section: TextSection) => {
    const text = getTextForSection(section) || "";
    setEditingSection(section.id);
    setEditedText(text);
  }, [descriptionText, dialogueText, narrationText]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditedText("");
  }, []);

  const handleSaveEdit = useCallback(
    async (section: TextSection) => {
      const existingId = getTextIdForSection(section);

      try {
        if (existingId) {
          await updateText.mutateAsync({
            id: existingId,
            text: editedText,
          });
        } else {
          await createText.mutateAsync({
            panelId,
            text: editedText,
            textType: section.textType,
            provider: "manual",
            model: "user",
          });
        }

        setEditingSection(null);
        setEditedText("");

        // Refetch
        switch (section.textType) {
          case "panel_description":
            refetchDescription();
            break;
          case "dialogue":
            refetchDialogue();
            break;
          case "narration":
            refetchNarration();
            break;
        }

        onTextUpdated?.();
      } catch (err) {
        console.error("Failed to save text:", err);
      }
    },
    [
      editedText,
      panelId,
      createText,
      updateText,
      refetchDescription,
      refetchDialogue,
      refetchNarration,
      onTextUpdated,
      descriptionId,
      dialogueId,
      narrationId,
    ]
  );

  return (
    <div className="panel-text-viewer" data-testid="panel-text-viewer">
      <style>{`
        .panel-text-viewer {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem;
        }

        .text-viewer-section {
          background: #1f1f23;
          border: 1px solid #27272a;
          border-radius: 12px;
          overflow: hidden;
        }

        .text-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #18181b;
          border-bottom: 1px solid #27272a;
        }

        .text-viewer-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #fafafa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .text-viewer-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .text-viewer-edit-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .text-viewer-edit-btn:hover {
          background: #27272a;
          color: #fafafa;
          border-color: #52525b;
        }

        .text-viewer-spice-btn {
          padding: 0.375rem 0.625rem;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .text-viewer-spice-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
          transform: translateY(-1px);
        }

        .text-viewer-spice-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .text-viewer-spice-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .text-viewer-content {
          padding: 1rem;
        }

        .text-viewer-text {
          font-size: 0.875rem;
          color: #e4e4e7;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .text-viewer-empty {
          font-size: 0.8125rem;
          color: #71717a;
          font-style: italic;
        }

        .text-viewer-textarea {
          width: 100%;
          min-height: 120px;
          padding: 0.875rem;
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.875rem;
          font-family: inherit;
          line-height: 1.6;
          resize: vertical;
        }

        .text-viewer-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }

        .text-viewer-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .text-viewer-save-btn,
        .text-viewer-cancel-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .text-viewer-cancel-btn {
          background: transparent;
          border: 1px solid #3f3f46;
          color: #a1a1aa;
        }

        .text-viewer-cancel-btn:hover {
          background: #27272a;
          color: #fafafa;
        }

        .text-viewer-save-btn {
          background: #8b5cf6;
          border: none;
          color: white;
        }

        .text-viewer-save-btn:hover {
          background: #7c3aed;
        }

        .text-viewer-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Character Notes Section */
        .character-notes-section {
          margin-top: 1.5rem;
        }

        .character-notes-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
          margin-bottom: 0.75rem;
        }

        .character-notes-grid {
          display: grid;
          gap: 0.75rem;
        }

        .character-note-card {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem;
          background: #27272a;
          border-radius: 10px;
          border: 1px solid #3f3f46;
        }

        .character-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: white;
          flex-shrink: 0;
        }

        .character-info {
          flex: 1;
          min-width: 0;
        }

        .character-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fafafa;
          margin-bottom: 0.25rem;
        }

        .character-species {
          font-size: 0.75rem;
          color: #8b5cf6;
          margin-bottom: 0.375rem;
        }

        .character-description {
          font-size: 0.8125rem;
          color: #a1a1aa;
          line-height: 1.5;
        }

        .no-characters {
          padding: 1rem;
          background: #27272a;
          border-radius: 10px;
          text-align: center;
          color: #71717a;
          font-size: 0.8125rem;
        }
      `}</style>

      {TEXT_SECTIONS.map((section) => {
        const text = getTextForSection(section);
        const isEditing = editingSection === section.id;
        const isGenerating =
          (section.textType === "panel_description" &&
            generateDescription.isPending) ||
          (section.textType === "dialogue" && generateDialogue.isPending) ||
          (section.textType === "narration" && generateDescription.isPending);

        return (
          <div
            key={section.id}
            className="text-viewer-section"
            data-testid={`text-section-${section.id}`}
          >
            <div className="text-viewer-header">
              <span className="text-viewer-title">{section.title}</span>
              <div className="text-viewer-actions">
                {editable && !isEditing && (
                  <button
                    className="text-viewer-edit-btn"
                    onClick={() => handleStartEdit(section)}
                  >
                    Edit
                  </button>
                )}
                {/* Spice button - only show when text exists */}
                {text && (
                  <button
                    className="text-viewer-spice-btn"
                    onClick={() => handleSpice(section)}
                    disabled={spicingSection === section.id || isGenerating}
                    title="Make it nastier"
                    data-testid={`spice-btn-${section.id}`}
                  >
                    {spicingSection === section.id ? (
                      <span className="text-viewer-spice-spinner" />
                    ) : (
                      "🌶️"
                    )}
                    Spice
                  </button>
                )}
                <AIAssistButton
                  onGenerate={() => handleAIGenerate(section)}
                  onAccept={(generatedText) => handleAcceptAI(section, generatedText)}
                  isGenerating={isGenerating}
                  disabled={
                    section.textType === "dialogue" &&
                    selectedCharacterIds.length === 0
                  }
                  title={
                    section.textType === "dialogue" && selectedCharacterIds.length === 0
                      ? "Select characters first to generate dialogue"
                      : text
                      ? `Refine ${section.title.toLowerCase()}`
                      : `Generate ${section.title.toLowerCase()}`
                  }
                  size="sm"
                />
              </div>
            </div>

            <div className="text-viewer-content">
              {isEditing ? (
                <>
                  <textarea
                    className="text-viewer-textarea"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder={`Enter ${section.title.toLowerCase()}...`}
                    data-testid={`text-editor-${section.id}`}
                  />
                  <div className="text-viewer-edit-actions">
                    <button
                      className="text-viewer-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="text-viewer-save-btn"
                      onClick={() => handleSaveEdit(section)}
                      disabled={updateText.isPending || createText.isPending}
                    >
                      {updateText.isPending || createText.isPending
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </div>
                </>
              ) : text ? (
                <div className="text-viewer-text">{text}</div>
              ) : (
                <div className="text-viewer-empty">{section.placeholder}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Character Notes Section */}
      <div className="character-notes-section">
        <div className="character-notes-title">
          Characters in Scene ({selectedCharacters.length})
        </div>
        {selectedCharacters.length > 0 ? (
          <div className="character-notes-grid">
            {selectedCharacters.map((char) => (
              <div key={char.id} className="character-note-card">
                <div className="character-avatar">
                  {char.name.charAt(0).toUpperCase()}
                </div>
                <div className="character-info">
                  <div className="character-name">{char.name}</div>
                  {char.species && (
                    <div className="character-species">{char.species}</div>
                  )}
                  {char.description && (
                    <div className="character-description">{char.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-characters">
            No characters selected for this panel. Select characters from the
            Generate tab to see their notes here.
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelTextViewer;
