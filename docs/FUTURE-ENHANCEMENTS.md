# Future Enhancements

## Panel Description vs Prompt Architecture

**Issue:** The panel's `description` field and the generation `prompt` are currently conflated.

**Desired Behavior:**
1. **Description** = Semantic description of what the panel IS (for story/storyboard context)
2. **Prompt** = What we send to the AI for generation (can be different)
3. **Flavor Mode** = Option to use description as additional context/flavor on top of the prompt

**Use Cases:**
- "Description: Luna and Max share their first kiss" + "Prompt: 2characters, kissing, romantic, moonlight" + use description as flavor
- Prompt-only mode for power users who want full control
- Description-only mode for beginners who want AI to build the prompt

**Implementation Ideas:**
- Add `promptMode: 'description' | 'prompt' | 'both'` to panel/generation
- Store `customPrompt` separately from `description`
- UI toggle between modes

**Priority:** Post-MVP enhancement
**Created:** $(date +%Y-%m-%d)
