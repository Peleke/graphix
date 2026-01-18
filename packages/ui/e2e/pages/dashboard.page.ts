/**
 * Dashboard Page Object
 *
 * Represents the main dashboard / project list view.
 * Flow 1: Application Entry
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Dashboard container
   */
  get dashboardContainer(): Locator {
    return this.page.locator('.dashboard');
  }

  /**
   * Dashboard title
   */
  get dashboardTitle(): Locator {
    return this.page.locator('.dashboard-title');
  }

  /**
   * Search input
   */
  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search projects/i);
  }

  /**
   * New Project button in header
   */
  get newProjectButton(): Locator {
    return this.page.getByRole('button', { name: /new project/i }).first();
  }

  /**
   * Grid view button
   */
  get gridViewButton(): Locator {
    return this.page.getByRole('button', { name: /grid view/i });
  }

  /**
   * List view button
   */
  get listViewButton(): Locator {
    return this.page.getByRole('button', { name: /list view/i });
  }

  /**
   * Project cards in the grid/list
   */
  get projectCards(): Locator {
    return this.page.locator('[data-testid^="project-card-"]');
  }

  /**
   * Project grid container
   */
  get projectGrid(): Locator {
    return this.page.locator('.project-grid');
  }

  /**
   * Project list container
   */
  get projectList(): Locator {
    return this.page.locator('.project-list');
  }

  /**
   * Loading spinner
   */
  get loadingSpinner(): Locator {
    return this.page.locator('.spinner');
  }

  /**
   * Loading state container
   */
  get loadingState(): Locator {
    return this.page.locator('.loading-state');
  }

  /**
   * Error state container
   */
  get errorState(): Locator {
    return this.page.locator('.error-state');
  }

  /**
   * Empty state container
   */
  get emptyState(): Locator {
    return this.page.locator('.empty-state');
  }

  /**
   * Create Project modal
   */
  get createModal(): Locator {
    return this.page.locator('.modal');
  }

  /**
   * Modal overlay
   */
  get modalOverlay(): Locator {
    return this.page.locator('.modal-overlay');
  }

  /**
   * Project name input in modal
   */
  get projectNameInput(): Locator {
    return this.createModal.getByPlaceholder(/project name/i);
  }

  /**
   * Create button in modal
   */
  get createButton(): Locator {
    return this.createModal.getByRole('button', { name: /^create$/i });
  }

  /**
   * Cancel button in modal
   */
  get cancelButton(): Locator {
    return this.createModal.getByRole('button', { name: /cancel/i });
  }

  /**
   * New project card (dashed border, "Create New Project")
   */
  get newProjectCard(): Locator {
    return this.page.locator('.new-project-card');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for dashboard container
    await expect(this.dashboardContainer).toBeVisible({ timeout: 10000 });
    // Wait for data to load: either projects appear OR empty state appears
    // This is the reliable indicator that TanStack Query finished
    await this.projectCards.first().or(this.emptyState).waitFor({ state: 'visible', timeout: 15000 });
  }

  async isDisplayed(): Promise<boolean> {
    return await this.dashboardContainer.isVisible();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Search for projects
   */
  async searchProjects(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Switch to grid view
   */
  async switchToGridView(): Promise<void> {
    await this.gridViewButton.click();
  }

  /**
   * Switch to list view
   */
  async switchToListView(): Promise<void> {
    await this.listViewButton.click();
  }

  /**
   * Click "New Project" button to open create modal
   */
  async clickNewProject(): Promise<void> {
    await this.newProjectButton.click();
  }

  /**
   * Create a new project with given name
   */
  async createProject(name: string): Promise<void> {
    await this.clickNewProject();
    await expect(this.createModal).toBeVisible();
    await this.projectNameInput.fill(name);
    await this.createButton.click();
    // Wait for modal to close
    await expect(this.createModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Cancel project creation
   */
  async cancelCreate(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.createModal).toBeHidden();
  }

  /**
   * Open a project by clicking its card
   */
  async openProject(name: string): Promise<void> {
    const projectCard = this.projectCards.filter({ hasText: name });
    await projectCard.dblclick();
  }

  /**
   * Click on a project card to select it
   */
  async selectProject(name: string): Promise<void> {
    const projectCard = this.projectCards.filter({ hasText: name });
    await projectCard.click();
  }

  /**
   * Get the context menu for a project
   */
  getProjectMenuButton(name: string): Locator {
    const projectCard = this.projectCards.filter({ hasText: name });
    return projectCard.getByTestId('project-menu-trigger');
  }

  /**
   * Open project context menu
   */
  async openProjectMenu(name: string): Promise<void> {
    const projectCard = this.projectCards.filter({ hasText: name });
    await projectCard.hover();
    await this.getProjectMenuButton(name).click();
  }

  /**
   * Delete a project via context menu
   */
  async deleteProject(name: string): Promise<void> {
    await this.openProjectMenu(name);
    await this.page.getByTestId('project-menu-delete').click();
    // Handle the confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
  }

  /**
   * Duplicate a project via context menu
   */
  async duplicateProject(name: string): Promise<void> {
    await this.openProjectMenu(name);
    await this.page.getByTestId('project-menu-duplicate').click();
  }

  /**
   * Wait for projects to load
   */
  async waitForProjectsLoaded(): Promise<void> {
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert dashboard is visible
   */
  async expectDashboardVisible(): Promise<void> {
    await expect(this.dashboardContainer).toBeVisible();
    await expect(this.dashboardTitle).toContainText('Projects');
  }

  /**
   * Assert loading state is shown
   */
  async expectLoadingState(): Promise<void> {
    await expect(this.loadingState).toBeVisible();
    await expect(this.loadingSpinner).toBeVisible();
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toContainText(/no projects yet/i);
  }

  /**
   * Assert error state is shown
   */
  async expectErrorState(): Promise<void> {
    await expect(this.errorState).toBeVisible();
  }

  /**
   * Assert project exists in list
   */
  async expectProjectInList(name: string): Promise<void> {
    await expect(this.projectCards.filter({ hasText: name })).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert project does not exist in list
   */
  async expectProjectNotInList(name: string): Promise<void> {
    await expect(this.projectCards.filter({ hasText: name })).toBeHidden();
  }

  /**
   * Assert project count
   */
  async expectProjectCount(count: number): Promise<void> {
    // Add 1 for the "Create New Project" card if projects exist
    if (count > 0) {
      await expect(this.projectCards).toHaveCount(count);
    } else {
      await this.expectEmptyState();
    }
  }

  /**
   * Assert create modal is visible
   */
  async expectCreateModalVisible(): Promise<void> {
    await expect(this.createModal).toBeVisible();
  }

  /**
   * Assert create modal is hidden
   */
  async expectCreateModalHidden(): Promise<void> {
    await expect(this.createModal).toBeHidden();
  }

  /**
   * Get count of projects
   */
  async getProjectCount(): Promise<number> {
    return await this.projectCards.count();
  }
}
