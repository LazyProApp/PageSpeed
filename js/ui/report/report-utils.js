/**
 * Report Utils Module
 * Rules: Pure utility functions, no DOM manipulation, no state
 */

/**
 * Strip HTML tags and invalid characters
 */
export function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\uFFFD/g, '');
}

/**
 * Escape HTML and clean invalid characters
 */
export function escapeAndClean(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text.replace(/\uFFFD/g, '').replace(/`([^`]+)`/g, '$1');
  return div.innerHTML;
}

/**
 * Generate safe DOM ID from audit ID
 */
export function safeId(id) {
  return 'audit-' + id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || '';
}

/**
 * Convert Markdown links to HTML anchors
 */
export function convertLinks(text) {
  if (!text) return '';
  return text
    .replace(/\uFFFD/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(
      /\[([^\]]{1,200})\]\(([^)]{1,2000})\)/g,
      (match, linkText, url) => {
        try {
          const urlObj = new URL(url, window.location.href);
          if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return match;
          }
          const cleanLinkText = escapeHtml(linkText);
          return `<a href="${urlObj.href}" target="_blank" rel="noopener noreferrer" style="color: var(--md-sys-color-primary);">${cleanLinkText}</a>`;
        } catch (e) {
          return match;
        }
      }
    );
}

/**
 * Convert Markdown links to anchors with target="_blank"
 */
export function convertLinksToAnchors(html) {
  if (!html) return '';

  const decoded = unescapeHtml(html);
  const htmlWithAnchors = convertLinks(decoded);
  const doc = new DOMParser().parseFromString(htmlWithAnchors, 'text/html');

  doc.querySelectorAll('a').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  return doc.body.innerHTML;
}

/**
 * Get score level (good/average/poor/none)
 */
export function getScoreLevel(score) {
  if (score === null || score === undefined) return 'none';
  const value = score * 100;
  if (value >= 90) return 'good';
  if (value >= 50) return 'average';
  return 'poor';
}

/**
 * Format score to rounded integer
 */
export function formatScore(value) {
  return Math.round(value);
}

/**
 * Calculate total savings from metricSavings object
 */
export function getTotalSavings(metricSavings) {
  if (!metricSavings) return 0;
  return Object.values(metricSavings).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
}

export function getTotalBytes(details) {
  if (!details?.items) return 0;
  const items = Array.isArray(details.items) ? details.items : [];
  return items.reduce((sum, item) => sum + (item.wastedBytes || 0), 0);
}

/**
 * Determine if an audit should be shown as passed
 * @param {Object} audit - The audit object
 * @returns {boolean} - True if audit should be shown as passed
 */
export function showAsPassed(audit) {
  const PASS_THRESHOLD = 0.9;

  switch (audit.scoreDisplayMode) {
    case 'manual':
    case 'notApplicable':
      return true;
    case 'error':
    case 'informative':
      return false;
    case 'numeric':
    case 'binary':
    default:
      return Number(audit.score) >= PASS_THRESHOLD;
  }
}
