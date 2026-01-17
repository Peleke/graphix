/**
 * Chat Page Object
 *
 * Represents the Chat-to-Start project creation interface.
 * Flow 2: Project Creation (Chat-to-Start)
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ChatPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Chat container
   */
  get chatContainer(): Locator {
    return this.page.getByTestId('chat-container');
  }

  /**
   * Chat message input
   */
  get messageInput(): Locator {
    return this.page.getByPlaceholder(/type your message|describe your story/i);
  }

  /**
   * Send message button
   */
  get sendButton(): Locator {
    return this.page.getByRole('button', { name: /send/i });
  }

  /**
   * All chat messages
   */
  get messages(): Locator {
    return this.page.getByTestId('chat-message');
  }

  /**
   * User messages
   */
  get userMessages(): Locator {
    return this.page.getByTestId('chat-message-user');
  }

  /**
   * AI messages
   */
  get aiMessages(): Locator {
    return this.page.getByTestId('chat-message-ai');
  }

  /**
   * AI typing indicator
   */
  get typingIndicator(): Locator {
    return this.page.getByTestId('ai-typing');
  }

  /**
   * Character suggestion cards
   */
  get characterSuggestions(): Locator {
    return this.page.getByTestId('character-suggestion');
  }

  /**
   * Create Project button (appears when setup is complete)
   */
  get createProjectButton(): Locator {
    return this.page.getByRole('button', { name: /create project|ready to start/i });
  }

  /**
   * "That's enough" button (to stop elicitation)
   */
  get thatsEnoughButton(): Locator {
    return this.page.getByRole('button', { name: /that's enough|proceed anyway/i });
  }

  /**
   * Field handling selector (AI guess vs leave null)
   */
  get fieldHandlingSelector(): Locator {
    return this.page.getByTestId('field-handling');
  }

  /**
   * Project preview panel
   */
  get projectPreview(): Locator {
    return this.page.getByTestId('project-preview');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/chat');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.chatContainer).toBeVisible();
  }

  async isDisplayed(): Promise<boolean> {
    return await this.chatContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Send a message
   */
  async sendMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * Wait for AI response
   */
  async waitForAiResponse(timeout = 30000): Promise<void> {
    // Wait for typing indicator to appear and disappear
    await this.typingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.typingIndicator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Send message and wait for AI response
   */
  async chat(message: string): Promise<void> {
    await this.sendMessage(message);
    await this.waitForAiResponse();
  }

  /**
   * Select a character from suggestions
   */
  async selectCharacterSuggestion(name: string): Promise<void> {
    await this.characterSuggestions.filter({ hasText: name }).click();
  }

  /**
   * Click "That's enough" to proceed with current info
   */
  async proceedWithCurrentInfo(): Promise<void> {
    await this.thatsEnoughButton.click();
  }

  /**
   * Click "Create Project" to finish
   */
  async createProject(): Promise<void> {
    await this.createProjectButton.click();
  }

  /**
   * Set field handling for a specific field
   */
  async setFieldHandling(field: string, handling: 'ai_guess' | 'leave_null'): Promise<void> {
    const selector = this.fieldHandlingSelector.filter({ hasText: field });
    await selector.getByRole('radio', { name: handling === 'ai_guess' ? /ai guess/i : /leave empty/i }).click();
  }

  /**
   * Complete a simple project setup
   */
  async quickSetup(description: string): Promise<void> {
    await this.chat(description);
    await this.proceedWithCurrentInfo();
    await this.createProject();
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert that AI is asking about characters
   */
  async expectAskingAboutCharacters(): Promise<void> {
    const lastAiMessage = this.aiMessages.last();
    await expect(lastAiMessage).toContainText(/character|who|appear/i);
  }

  /**
   * Assert that AI is asking about setting
   */
  async expectAskingAboutSetting(): Promise<void> {
    const lastAiMessage = this.aiMessages.last();
    await expect(lastAiMessage).toContainText(/setting|where|when|place/i);
  }

  /**
   * Assert that AI is asking about story arc
   */
  async expectAskingAboutStoryArc(): Promise<void> {
    const lastAiMessage = this.aiMessages.last();
    await expect(lastAiMessage).toContainText(/story|arc|beginning|end|journey/i);
  }

  /**
   * Assert that AI is asking about tone/style
   */
  async expectAskingAboutTone(): Promise<void> {
    const lastAiMessage = this.aiMessages.last();
    await expect(lastAiMessage).toContainText(/tone|style|mood|comedy|drama/i);
  }

  /**
   * Assert that AI is asking about scope
   */
  async expectAskingAboutScope(): Promise<void> {
    const lastAiMessage = this.aiMessages.last();
    await expect(lastAiMessage).toContainText(/scope|pages|length|one-shot|series/i);
  }

  /**
   * Assert that character suggestions are shown
   */
  async expectCharacterSuggestions(): Promise<void> {
    await expect(this.characterSuggestions.first()).toBeVisible();
  }

  /**
   * Assert that "Create Project" button is visible
   */
  async expectReadyToCreate(): Promise<void> {
    await expect(this.createProjectButton).toBeVisible();
  }

  /**
   * Assert that project preview shows expected data
   */
  async expectProjectPreviewContains(text: string): Promise<void> {
    await expect(this.projectPreview).toContainText(text);
  }

  /**
   * Get the last AI message text
   */
  async getLastAiMessage(): Promise<string> {
    return await this.aiMessages.last().textContent() ?? '';
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return await this.messages.count();
  }
}
