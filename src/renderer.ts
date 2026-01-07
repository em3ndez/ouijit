/**
 * Renderer process entry point for the Ouijit Electron app
 *
 * This file is automatically loaded by Vite and runs in the renderer context.
 */

import './index.css';
import type { Project, ElectronAPI } from './types';
import { renderProjects } from './components/projectGrid';
import { setupSearch } from './components/searchBar';

// Declare the global window.api interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

/**
 * Shows a loading state in the container
 */
function showLoading(container: HTMLElement): void {
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading projects...</p>
    </div>
  `;
}

/**
 * Shows an error state in the container
 */
function showError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="error-state">
      <p class="error-message">Error loading projects</p>
      <p class="error-details">${message}</p>
    </div>
  `;
}

/**
 * Handles opening a project
 */
async function handleOpenProject(path: string): Promise<void> {
  try {
    await window.api.openProject(path);
  } catch (error) {
    console.error('Failed to open project:', error);
    // Could show a toast notification here
  }
}

/**
 * Initializes the application
 */
async function initialize(): Promise<void> {
  const projectGrid = document.getElementById('project-grid');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;

  if (!projectGrid) {
    console.error('Project grid container not found');
    return;
  }

  // Show loading state
  showLoading(projectGrid);

  try {
    // Fetch projects from the main process
    const projects: Project[] = await window.api.getProjects();

    // Render the projects
    renderProjects(projectGrid, projects, handleOpenProject);

    // Set up search functionality if search input exists
    if (searchInput) {
      setupSearch(searchInput, projects, projectGrid, handleOpenProject);
    }
  } catch (error) {
    console.error('Failed to load projects:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    showError(projectGrid, message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
