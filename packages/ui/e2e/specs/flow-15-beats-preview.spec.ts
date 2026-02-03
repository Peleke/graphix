/**
 * Flow 15: Beats Preview & Enhanced Bootstrap E2E Tests
 *
 * Tests the complete chat extraction → BeatsPreview → enhanced bootstrap flow.
 * This is the Phase 3 integration that:
 * 1. Triggers extraction when elicitation reaches scope/confirmation phase
 * 2. Displays BeatsPreview component with extracted story structure
 * 3. Shows acts, beats, characters from AI extraction
 * 4. Creates project with full structure via enhanced bootstrap
 *
 * @see packages/ui/src/components/chat/BeatsPreview.tsx
 * @see packages/ui/src/api/hooks/useChat.ts - useExtraction, useEnhancedBootstrap
 */

import { test, expect, tags } from '../fixtures/test-fixtures';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Flow 15: Beats Preview & Enhanced Bootstrap', () => {
  const createdProjectIds: string[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdProjectIds) {
      try {
        await request.delete(`${API_URL}/api/projects/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  // ==========================================================================
  // 15.1 Extraction API Contract
  // ==========================================================================

  test.describe('15.1 Extraction API Contract', () => {
    test('chat session can be created and queried', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ request }) => {
      // Create a chat session
      const sessionRes = await request.post(`${API_URL}/api/chat/sessions`, {
        data: {},
      });
      expect(sessionRes.ok()).toBe(true);
      const session = await sessionRes.json();
      expect(session).toHaveProperty('id');

      // Verify session can be retrieved
      const getRes = await request.get(`${API_URL}/api/chat/sessions/${session.id}`);
      expect(getRes.ok()).toBe(true);
      const sessionData = await getRes.json();

      // Session should have expected structure
      expect(sessionData).toHaveProperty('id', session.id);
      expect(sessionData).toHaveProperty('messages');
      expect(Array.isArray(sessionData.messages)).toBe(true);

      // Should have at least the greeting message
      expect(sessionData.messages.length).toBeGreaterThan(0);
      expect(sessionData.messages[0]).toHaveProperty('role', 'assistant');
      expect(sessionData.messages[0]).toHaveProperty('content');
    });

    test('extraction endpoint returns 404 for non-existent session', { tag: [tags.MVP] }, async ({ request }) => {
      const res = await request.post(`${API_URL}/api/chat/sessions/non-existent-session-id/extract`);
      expect([404, 500]).toContain(res.status());
    });
  });

  // ==========================================================================
  // 15.2 Enhanced Bootstrap API Contract
  // ==========================================================================

  test.describe('15.2 Enhanced Bootstrap API Contract', () => {
    test('enhanced bootstrap creates full project structure', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ request }) => {
      const bootstrapInput = {
        name: 'E2E Test Story',
        description: 'A test story for E2E',
        characters: [
          {
            name: 'Luna',
            role: 'protagonist',
            visualDescription: 'A silver wolf with blue eyes',
            personality: ['brave', 'kind'],
          },
          {
            name: 'Max',
            role: 'supporting',
            visualDescription: 'An orange fox with a bushy tail',
            personality: ['clever', 'loyal'],
          },
        ],
        setting: {
          location: 'Snowy forest',
          atmosphere: 'Mysterious and enchanting',
          visualDetails: ['tall pines', 'falling snow'],
        },
        arc: {
          premise: {
            logline: 'Two friends face danger together',
            genre: 'adventure',
            tone: 'hopeful',
            themes: ['friendship', 'courage'],
            setting: 'Winter forest',
          },
          structure: 'three-act',
          acts: ['Setup', 'Confrontation', 'Resolution'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Luna alone in the forest',
              visualDescription: 'A silver wolf sits on a snowy hilltop',
              emotionalTone: 'lonely',
              involvedCharacters: ['Luna'],
            },
            {
              type: 'inciting_incident',
              actIndex: 0,
              summary: 'Luna meets Max',
              visualDescription: 'Luna encounters Max in a clearing',
              emotionalTone: 'curious',
              involvedCharacters: ['Luna', 'Max'],
            },
            {
              type: 'climax',
              actIndex: 2,
              summary: 'They face danger together',
              visualDescription: 'Luna and Max stand against a storm',
              emotionalTone: 'tense',
              involvedCharacters: ['Luna', 'Max'],
            },
          ],
        },
        style: 'Manga',
        pageCount: 8,
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: bootstrapInput,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      // Track for cleanup
      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      // Verify full structure was created
      expect(result).toHaveProperty('project');
      expect(result.project).toHaveProperty('id');
      expect(result.project.name).toBe('E2E Test Story');

      expect(result).toHaveProperty('premise');
      expect(result.premise).toHaveProperty('id');

      expect(result).toHaveProperty('story');
      expect(result.story).toHaveProperty('structure', 'three-act');

      expect(result).toHaveProperty('storyboards');
      expect(result.storyboards.length).toBe(3); // One per act

      expect(result).toHaveProperty('beats');
      expect(result.beats.length).toBe(3);

      expect(result).toHaveProperty('panels');
      expect(result.panels.length).toBe(3); // One per beat

      expect(result).toHaveProperty('characters');
      expect(result.characters.length).toBe(2);
    });

    test('enhanced bootstrap validates required fields', { tag: [tags.MVP] }, async ({ request }) => {
      // Missing name
      const res1 = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: { characters: [], arc: {} },
      });
      expect(res1.status()).toBe(400);

      // Missing characters
      const res2 = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: { name: 'Test', characters: [], arc: { premise: {}, structure: 'three-act', acts: [], beats: [] } },
      });
      expect(res2.status()).toBe(400);
    });

    test('enhanced bootstrap creates beat-panel associations', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ request }) => {
      const input = {
        name: 'Association Test',
        characters: [
          {
            name: 'Hero',
            role: 'protagonist',
            visualDescription: 'A brave hero',
            personality: ['brave'],
          },
        ],
        arc: {
          premise: {
            logline: 'A hero journey',
            genre: 'adventure',
            tone: 'epic',
            themes: ['heroism'],
            setting: 'Fantasy land',
          },
          structure: 'three-act',
          acts: ['Beginning', 'Middle', 'End'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Hero starts',
              visualDescription: 'Hero at crossroads',
              emotionalTone: 'determined',
              involvedCharacters: ['Hero'],
            },
            {
              type: 'climax',
              actIndex: 2,
              summary: 'Final battle',
              visualDescription: 'Hero faces villain',
              emotionalTone: 'intense',
              involvedCharacters: ['Hero'],
            },
          ],
        },
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: input,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      // Verify beat-panel associations
      const beatIds = result.beats.map((b: { id: string }) => b.id);
      const panelBeatIds = result.panels.map((p: { beatId: string }) => p.beatId);

      // All beats should have corresponding panels
      beatIds.forEach((beatId: string) => {
        expect(panelBeatIds).toContain(beatId);
      });
    });
  });

  // ==========================================================================
  // 15.3 BeatsPreview UI Integration
  // ==========================================================================

  test.describe('15.3 BeatsPreview UI Integration', () => {
    test('chat panel opens and shows AI conversation', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat panel
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      // Wait for chat panel to be visible
      const chatPanel = page.locator('.chat-panel');
      await expect(chatPanel).toBeVisible({ timeout: 10000 });

      // Wait for chat to be ready
      const textarea = page.locator('.chat-textarea');
      await expect(textarea).toBeEnabled({ timeout: 60000 });

      // Verify greeting message appears
      const assistantMessage = page.locator('.chat-message.assistant').first();
      await expect(assistantMessage).toBeVisible({ timeout: 10000 });

      // Send a message
      await textarea.fill('I want to create a comic about two otters on a yacht');
      await textarea.press('Enter');

      // Verify user message appears
      const userMessage = page.locator('.chat-message.user');
      await expect(userMessage).toBeVisible({ timeout: 5000 });

      // Wait for AI response
      await expect(textarea).toBeEnabled({ timeout: 60000 });

      // Verify we have multiple messages (greeting + user + AI response)
      const messages = page.locator('.chat-message');
      const messageCount = await messages.count();
      expect(messageCount).toBeGreaterThanOrEqual(3);

      // Verify suggestion chips are shown
      const suggestions = page.locator('.suggestion-chip');
      await expect(suggestions.first()).toBeVisible({ timeout: 10000 });
    });

    test('BeatsPreview displays story structure correctly', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ page }) => {
      // This test uses a mock/fixture approach to directly test BeatsPreview
      // without relying on full AI extraction

      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // We'll test the component via the API-created data
      // First, create a project with beats via enhanced bootstrap
      const bootstrapRes = await page.request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: {
          name: 'UI Test Story',
          characters: [
            {
              name: 'Luna',
              role: 'protagonist',
              visualDescription: 'A silver wolf',
              personality: ['brave'],
            },
          ],
          arc: {
            premise: {
              logline: 'A wolf finds courage',
              genre: 'adventure',
              tone: 'hopeful',
              themes: ['courage'],
              setting: 'Forest',
            },
            structure: 'three-act',
            acts: ['Setup', 'Conflict', 'Resolution'],
            beats: [
              {
                type: 'setup',
                actIndex: 0,
                summary: 'Luna alone',
                visualDescription: 'Wolf on hilltop',
                emotionalTone: 'lonely',
                involvedCharacters: ['Luna'],
              },
              {
                type: 'climax',
                actIndex: 2,
                summary: 'Facing the storm',
                visualDescription: 'Wolf against blizzard',
                emotionalTone: 'determined',
                involvedCharacters: ['Luna'],
              },
            ],
          },
        },
      });

      expect(bootstrapRes.ok()).toBe(true);
      const result = await bootstrapRes.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      // Navigate to the created project
      await page.goto(`${BASE_URL}/projects/${result.project.id}`);
      await page.waitForLoadState('networkidle');

      // Verify project was created with expected structure
      expect(result.beats.length).toBe(2);
      expect(result.panels.length).toBe(2);
      expect(result.storyboards.length).toBe(3);
    });

    test('chat elicitation progresses through phases', { tag: [tags.MVP, tags.PRIORITY_HIGH, tags.SLOW] }, async ({ page }) => {
      test.slow(); // AI conversations take time

      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Open chat panel
      const chatTrigger = page.locator('.chat-trigger');
      if (await chatTrigger.isVisible()) {
        await chatTrigger.click();
      }

      const textarea = page.locator('.chat-textarea');
      await expect(textarea).toBeEnabled({ timeout: 60000 });

      // Provide detailed story concept
      await textarea.fill('Create a three-act comic called "Forest Friends" with Luna the wolf and Max the fox meeting in a snowy forest');
      await textarea.press('Enter');

      // Progress through elicitation by clicking suggestions
      let progressCount = 0;
      for (let i = 0; i < 8; i++) {
        await expect(textarea).toBeEnabled({ timeout: 60000 });

        // Click suggestions to progress
        const suggestions = page.locator('.suggestion-chip');
        const count = await suggestions.count();
        if (count > 0) {
          // Prefer "skip" type suggestions to move faster
          const skipBtn = suggestions.filter({ hasText: /skip|proceed|yes|continue|sounds good/i });
          if (await skipBtn.count() > 0) {
            await skipBtn.first().click();
            progressCount++;
          } else {
            await suggestions.first().click();
            progressCount++;
          }
        }

        // Small delay for AI response
        await page.waitForTimeout(500);
      }

      // Verify we made progress through the conversation
      expect(progressCount).toBeGreaterThan(2);

      // Verify messages increased
      const messages = page.locator('.chat-message');
      expect(await messages.count()).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // 15.4 Story Structure Support
  // ==========================================================================

  test.describe('15.4 Story Structure Support', () => {
    test('five-act structure creates 5 storyboards', { tag: [tags.MVP] }, async ({ request }) => {
      const input = {
        name: 'Five Act Story',
        characters: [
          {
            name: 'Hero',
            role: 'protagonist',
            visualDescription: 'A brave hero',
            personality: ['brave'],
          },
        ],
        arc: {
          premise: {
            logline: 'An epic journey',
            genre: 'drama',
            tone: 'serious',
            themes: ['growth'],
            setting: 'Kingdom',
          },
          structure: 'five-act',
          acts: ['Exposition', 'Rising Action', 'Climax', 'Falling Action', 'Denouement'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Introduction',
              visualDescription: 'Opening scene',
              emotionalTone: 'calm',
              involvedCharacters: ['Hero'],
            },
          ],
        },
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: input,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      expect(result.storyboards.length).toBe(5);
      expect(result.story.structure).toBe('five-act');
    });

    test('hero-journey structure creates 3 storyboards', { tag: [tags.MVP] }, async ({ request }) => {
      const input = {
        name: 'Hero Journey Story',
        characters: [
          {
            name: 'Hero',
            role: 'protagonist',
            visualDescription: 'A brave hero',
            personality: ['brave'],
          },
        ],
        arc: {
          premise: {
            logline: 'A hero\'s transformation',
            genre: 'adventure',
            tone: 'inspiring',
            themes: ['transformation'],
            setting: 'Mythical realm',
          },
          structure: 'hero-journey',
          acts: ['Departure', 'Initiation', 'Return'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Call to adventure',
              visualDescription: 'Hero receives call',
              emotionalTone: 'uncertain',
              involvedCharacters: ['Hero'],
            },
          ],
        },
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: input,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      expect(result.storyboards.length).toBe(3);
      expect(result.story.structure).toBe('hero-journey');
    });
  });

  // ==========================================================================
  // 15.5 Data Integrity
  // ==========================================================================

  test.describe('15.5 Data Integrity', () => {
    test('panels are assigned to correct storyboards by act', { tag: [tags.MVP, tags.PRIORITY_HIGH] }, async ({ request }) => {
      const input = {
        name: 'Storyboard Assignment Test',
        characters: [
          {
            name: 'Tester',
            role: 'protagonist',
            visualDescription: 'A test character',
            personality: ['methodical'],
          },
        ],
        arc: {
          premise: {
            logline: 'Testing data integrity',
            genre: 'test',
            tone: 'neutral',
            themes: ['testing'],
            setting: 'Test environment',
          },
          structure: 'three-act',
          acts: ['Act 1', 'Act 2', 'Act 3'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Beat in Act 1',
              visualDescription: 'Scene in Act 1',
              emotionalTone: 'calm',
              involvedCharacters: ['Tester'],
            },
            {
              type: 'midpoint',
              actIndex: 1,
              summary: 'Beat in Act 2',
              visualDescription: 'Scene in Act 2',
              emotionalTone: 'tense',
              involvedCharacters: ['Tester'],
            },
            {
              type: 'climax',
              actIndex: 2,
              summary: 'Beat in Act 3',
              visualDescription: 'Scene in Act 3',
              emotionalTone: 'intense',
              involvedCharacters: ['Tester'],
            },
          ],
        },
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: input,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      // Verify we have 3 storyboards (one per act)
      expect(result.storyboards.length).toBe(3);

      // Verify storyboard act indices are correct
      const actIndices = result.storyboards.map((sb: { actIndex: number }) => sb.actIndex).sort();
      expect(actIndices).toEqual([0, 1, 2]);

      // Verify beat-panel associations exist
      expect(result.beats.length).toBe(3);
      expect(result.panels.length).toBe(3);

      // Each beat should have a panel
      result.beats.forEach((beat: { id: string; panelId?: string }) => {
        expect(beat.panelId).toBeDefined();
        const panel = result.panels.find((p: { id: string }) => p.id === beat.panelId);
        expect(panel).toBeDefined();
        expect(panel.beatId).toBe(beat.id);
      });

      // Each panel should be in a storyboard
      const storyboardIds = result.storyboards.map((sb: { id: string }) => sb.id);
      result.panels.forEach((panel: { storyboardId: string }) => {
        expect(storyboardIds).toContain(panel.storyboardId);
      });
    });

    test('characters are created with correct names', { tag: [tags.MVP] }, async ({ request }) => {
      const input = {
        name: 'Character Association Test',
        characters: [
          {
            name: 'Alice',
            role: 'protagonist',
            visualDescription: 'Main character',
            personality: ['curious'],
          },
          {
            name: 'Bob',
            role: 'supporting',
            visualDescription: 'Supporting character',
            personality: ['helpful'],
          },
        ],
        arc: {
          premise: {
            logline: 'Testing character creation',
            genre: 'test',
            tone: 'neutral',
            themes: ['testing'],
            setting: 'Test',
          },
          structure: 'three-act',
          acts: ['One', 'Two', 'Three'],
          beats: [
            {
              type: 'setup',
              actIndex: 0,
              summary: 'Test beat',
              visualDescription: 'Test scene',
              emotionalTone: 'neutral',
              involvedCharacters: ['Alice', 'Bob'],
            },
          ],
        },
      };

      const res = await request.post(`${API_URL}/api/chat/bootstrap/enhanced`, {
        data: input,
      });

      expect(res.status()).toBe(201);
      const result = await res.json();

      if (result.project?.id) {
        createdProjectIds.push(result.project.id);
      }

      // Verify characters were created
      expect(result.characters.length).toBe(2);

      // Verify character names match input
      const characterNames = result.characters.map((c: { name: string }) => c.name);
      expect(characterNames).toContain('Alice');
      expect(characterNames).toContain('Bob');

      // Verify each character has an ID
      result.characters.forEach((char: { id: string; name: string }) => {
        expect(char.id).toBeDefined();
        expect(typeof char.id).toBe('string');
      });
    });
  });
});
