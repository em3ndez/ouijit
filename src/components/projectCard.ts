import type { Project } from '../types';

/**
 * Format a date as a relative time string (e.g., "2 days ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else if (diffWeeks < 4) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  } else {
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Creates a project card DOM element
 */
export function createProjectCard(
  project: Project,
  onOpen: (path: string) => void
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'project-card';

  // Project name
  const nameElement = document.createElement('h3');
  nameElement.className = 'project-name';
  nameElement.textContent = project.name;
  card.appendChild(nameElement);

  // Project path (truncated with full path on hover)
  const pathElement = document.createElement('p');
  pathElement.className = 'project-path';
  pathElement.textContent = truncate(project.path, 40);
  pathElement.title = project.path;
  card.appendChild(pathElement);

  // Badges container
  const badgesContainer = document.createElement('div');
  badgesContainer.className = 'badges';

  // Git badge
  if (project.hasGit) {
    const gitBadge = document.createElement('span');
    gitBadge.className = 'badge badge-git';
    gitBadge.textContent = 'Git';
    badgesContainer.appendChild(gitBadge);
  }

  // Claude badge
  if (project.hasClaude) {
    const claudeBadge = document.createElement('span');
    claudeBadge.className = 'badge badge-claude';
    claudeBadge.textContent = 'Claude';
    badgesContainer.appendChild(claudeBadge);
  }

  // Language badge
  if (project.language) {
    const languageBadge = document.createElement('span');
    languageBadge.className = 'badge badge-language';
    languageBadge.textContent = project.language;
    badgesContainer.appendChild(languageBadge);
  }

  card.appendChild(badgesContainer);

  // Description (if available)
  if (project.description) {
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'project-description';
    descriptionElement.textContent = truncate(project.description, 100);
    if (project.description.length > 100) {
      descriptionElement.title = project.description;
    }
    card.appendChild(descriptionElement);
  }

  // Footer with last modified and open button
  const footer = document.createElement('div');
  footer.className = 'project-card-footer';

  // Last modified
  const lastModified = document.createElement('span');
  lastModified.className = 'last-modified';
  const date = project.lastModified instanceof Date
    ? project.lastModified
    : new Date(project.lastModified);
  lastModified.textContent = formatRelativeTime(date);
  footer.appendChild(lastModified);

  // Open button
  const openButton = document.createElement('button');
  openButton.className = 'btn btn-primary';
  openButton.textContent = 'Open';
  openButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onOpen(project.path);
  });
  footer.appendChild(openButton);

  card.appendChild(footer);

  // Make the whole card clickable as well
  card.addEventListener('click', () => {
    onOpen(project.path);
  });

  return card;
}
