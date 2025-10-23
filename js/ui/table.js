/**
 * Table UI Module
 * Rules: UI rendering only, listen to DOMAIN events, no direct data modification
 */

import { EVENTS } from '../core/events.js';
import { logger } from '../utils/logger.js';

export class Table {
  constructor(eventBus, dataEngine) {
    this.eventBus = eventBus;
    this.dataEngine = dataEngine;
    this.tableBody = document.getElementById('resultsBody');
    this.emptyState = document.getElementById('emptyState');
    this.table = document.getElementById('resultsTable');
  }

  setupEventListeners() {
    // Event delegation for all action buttons
    this.tableBody.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const row = actionBtn.closest('tr');
      if (!row) return;

      const url = row.dataset.url;
      if (!url) return;

      const action = actionBtn.dataset.action;

      if (action === 'view') {
        this.handleViewReport(url);
      } else if (action === 'download') {
        this.handleDownloadReport(url);
      } else if (action === 'edit') {
        this.handleEditURL(url);
      } else if (action === 'delete') {
        this.handleDeleteURL(url);
      } else if (action === 'reanalyze') {
        this.handleReanalyzeURL(url);
      } else if (action === 'analyze') {
        this.handleAnalyzeURL(url);
      } else if (action === 'open') {
        this.handleOpenURL(url);
      }
    });

    this.eventBus.on(EVENTS.DOMAIN.URL_ADDED, (data) => {
      this.addRow(data.url, data.status);
    });

    this.eventBus.on(EVENTS.DOMAIN.URL_REMOVED, (data) => {
      this.removeRow(data.url);
    });

    this.eventBus.on(EVENTS.DOMAIN.URL_UPDATED, (data) => {
      this.updateRowURL(data.oldUrl, data.newUrl);
    });

    this.eventBus.on(EVENTS.DOMAIN.ANALYSIS_STARTED, (data) => {
      this.updateRowStatus(data.url, 'processing');
    });

    this.eventBus.on(EVENTS.DOMAIN.ANALYSIS_COMPLETED, (data) => {
      this.updateRowStatus(data.url, 'success', {
        scores: data.scores,
        reports: data.reports
      });
    });

    this.eventBus.on(EVENTS.DOMAIN.ANALYSIS_FAILED, (data) => {
      this.updateRowStatus(data.url, 'failed', {
        error: data.error
      });
    });

    this.eventBus.on(EVENTS.DOMAIN.ANALYSIS_RESET, (data) => {
      this.updateRowStatus(data.url, 'pending');
    });

    this.eventBus.on(EVENTS.DOMAIN.DATA_CLEARED, () => {
      this.clearTable();
    });

    this.eventBus.on(EVENTS.DOMAIN.DATA_IMPORTED, (data) => {
      this.clearTable();
      data.reports.forEach((report) => {
        this.addRow(report.url, report.status);
        if (report.status === 'success' && report.reports) {
          this.updateRowStatus(report.url, 'success', {
            reports: report.reports
          });
        }
      });
    });

    this.eventBus.on(EVENTS.UI.FILTER_CHANGED, (data) => {
      this.applyFilter(data.filter);
    });
  }

  addRow(url, status) {
    if (!url) {
      logger.warn('Cannot add row: missing URL');
      return;
    }

    const row = document.createElement('tr');
    row.className = status === 'processing' ? 'group analyzing' : 'group';
    row.dataset.url = url;
    row.dataset.status = status;
    row.innerHTML = `
      <td class="status-cell py-4 px-6 text-center">${this.getStatusIcon(status)}</td>
      <td class="url-cell py-4 px-6">
        <div class="url-scroll-container">
          <div class="url-text">${this.escapeHtml(url)}</div>
        </div>
        <div class="relative" style="margin-top: 4px;">
          <div class="fade-text flex space-x-3">
            ${this.renderScoresList()}
          </div>
          <div class="absolute top-0 left-0 opacity-0 fade-actions flex space-x-3">
            ${this.renderActionButtons(status)}
          </div>
        </div>
        <div class="error-message hidden"></div>
      </td>
    `;

    this.tableBody.appendChild(row);
    this.toggleEmptyState();
    logger.debug('Row added', {
      url,
      status
    });
  }

  updateRowStatus(url, status, data = {}) {
    const row = this.findRow(url);
    if (!row) {
      logger.warn('Row not found for status update', url);
      return;
    }

    row.dataset.status = status;
    row.className = status === 'processing' ? 'group analyzing' : 'group';

    this.updateStatusIcon(row, status);
    this.updateContentArea(row, status, data);
    this.updateActionButtons(row, status);

    logger.debug('Row status updated', { url, status });
  }

  updateStatusIcon(row, status) {
    const statusCell = row.querySelector('.status-cell');
    // prettier-ignore - getStatusIcon returns safe static HTML (no dynamic content)
    statusCell.innerHTML = this.getStatusIcon(status);
  }

  updateContentArea(row, status, data) {
    const fadeText = row.querySelector('.fade-text');
    const errorMessage = row.querySelector('.error-message');

    if (status === 'success' && data.reports) {
      this.showScores(fadeText, errorMessage, data.reports);
    } else if (status === 'failed' && data.error) {
      this.showError(fadeText, errorMessage, data.error);
    } else {
      this.clearContent(fadeText, errorMessage);
    }
  }

  showScores(fadeText, errorMessage, reports) {
    if (fadeText) {
      // prettier-ignore - renderScoresList uses numeric values and static templates, safe
      fadeText.innerHTML = this.renderScoresList(reports);
    }
    if (errorMessage) {
      errorMessage.classList.add('hidden');
      errorMessage.textContent = '';
    }
  }

  showError(fadeText, errorMessage, error) {
    if (errorMessage) {
      errorMessage.classList.remove('hidden');
      errorMessage.className = 'text-red-400 text-xs mt-1 error-message';
      errorMessage.style.fontSize = '11px';
      errorMessage.textContent = error;
    }
  }

  clearContent(fadeText, errorMessage) {
    if (errorMessage) {
      errorMessage.classList.add('hidden');
      errorMessage.textContent = '';
    }
  }

  updateActionButtons(row, status) {
    const actionsContainer = row.querySelector('.fade-actions');
    if (actionsContainer) {
      // prettier-ignore - renderActionButtons returns static HTML template, safe
      actionsContainer.innerHTML = this.renderActionButtons(status);
    }
  }

  updateRowURL(oldUrl, newUrl) {
    const row = this.findRow(oldUrl);
    if (!row) {
      logger.warn('Row not found for URL update', oldUrl);
      return;
    }

    row.setAttribute('data-url', newUrl);

    const urlCell = row.querySelector('.url-text');
    if (urlCell) {
      urlCell.textContent = newUrl;
    }

    logger.debug('Row URL updated', { oldUrl, newUrl });
  }

  removeRow(url) {
    const row = this.findRow(url);
    if (!row) {
      logger.warn('Row not found for removal', url);
      return;
    }

    row.remove();
    this.toggleEmptyState();
    logger.debug('Row removed', url);
  }

  clearTable() {
    this.tableBody.innerHTML = '';
    this.toggleEmptyState();
    logger.debug('Table cleared');
  }

  rebuildTable() {
    this.clearTable();
    const pages = this.dataEngine.getAllPages();
    pages.forEach((page) => {
      this.addRow(page.url, page.status);
      if (page.status === 'success' && page.reports) {
        this.updateRowStatus(page.url, 'success', {
          reports: page.reports
        });
      }
    });
  }

  findRow(url) {
    return this.tableBody.querySelector(`tr[data-url="${url}"]`);
  }

  toggleEmptyState() {
    const hasRows = this.tableBody.children.length > 0;

    if (hasRows) {
      this.emptyState.style.display = 'none';
      this.table.style.display = 'block';
    } else {
      this.emptyState.style.display = 'block';
      this.table.style.display = 'none';
    }
  }

  getStatusIcon(status) {
    const icons = {
      pending:
        '<span class="material-symbols-outlined text-gray-400 text-xl">schedule</span>',
      processing: `<md-circular-progress indeterminate style="
        --md-circular-progress-size: 24px;
        --md-circular-progress-active-indicator-width: 15;
        --md-circular-progress-color: var(--md-sys-color-primary);
      "></md-circular-progress>`,
      success:
        '<span class="material-symbols-outlined text-green-300 text-xl">check_circle</span>',
      failed:
        '<span class="material-symbols-outlined text-red-300 text-xl">error</span>'
    };

    return icons[status] || icons.pending;
  }

  applyFilter(filter) {
    const rows = this.tableBody.querySelectorAll('tr');
    let visibleRowCount = 0;

    rows.forEach((row) => {
      const status = row.dataset.status;

      if (filter === 'all') {
        row.style.display = '';
        visibleRowCount++;
      } else if (filter === 'success' && status === 'success') {
        row.style.display = '';
        visibleRowCount++;
      } else if (filter === 'failed' && status === 'failed') {
        row.style.display = '';
        visibleRowCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const hasVisibleRows = visibleRowCount > 0;
    if (hasVisibleRows) {
      this.emptyState.style.display = 'none';
      this.table.style.display = 'block';
    } else {
      this.emptyState.style.display = 'block';
      this.table.style.display = 'none';
    }

    logger.debug('Filter applied', {
      filter,
      visibleRowCount
    });
  }

  handleViewReport(url) {
    this.eventBus.emit(EVENTS.COMMAND.OPEN_REPORT, {
      url
    });
    logger.debug('View report requested', {
      url
    });
  }

  handleDownloadReport(url) {
    this.eventBus.emit(EVENTS.COMMAND.DOWNLOAD_REPORT, {
      url
    });
    logger.debug('Download report requested', {
      url
    });
  }

  handleEditURL(url) {
    logger.debug('Edit URL requested', { url });
    this.eventBus.emit(EVENTS.UI.EDIT_URL_REQUESTED, { url });
  }

  handleDeleteURL(url) {
    this.eventBus.emit(EVENTS.COMMAND.REMOVE_URL, {
      url
    });
    logger.debug('Delete URL requested', {
      url
    });
  }

  handleReanalyzeURL(url) {
    this.eventBus.emit(EVENTS.COMMAND.REANALYZE_URL, {
      url
    });
    logger.debug('Re-analyze URL requested', {
      url
    });
  }

  handleAnalyzeURL(url) {
    this.eventBus.emit(EVENTS.COMMAND.REANALYZE_URL, {
      url
    });
    logger.debug('Analyze URL requested', {
      url
    });
  }

  handleOpenURL(url) {
    window.open(url, '_blank');
    logger.debug('Open URL in new tab', {
      url
    });
  }

  renderActionButtons(status) {
    const editBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="edit">
        <span class="material-symbols-outlined" style="font-size: 14px;">edit</span>
        <span>Edit</span>
      </div>`;

    const deleteBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="delete">
        <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
        <span>Delete</span>
      </div>`;

    const analyzeBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="analyze">
        <span class="material-symbols-outlined" style="font-size: 14px;">analytics</span>
        <span>Analyze</span>
      </div>`;

    const openBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="open">
        <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
        <span>Open</span>
      </div>`;

    const reanalyzeBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="reanalyze">
        <span class="material-symbols-outlined" style="font-size: 14px;">refresh</span>
        <span>Re-analyze</span>
      </div>`;

    const viewReportBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="view">
        <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>
        <span>View Report</span>
      </div>`;

    const downloadReportBtn = `
      <div class="flex items-center space-x-1 cursor-pointer transition-colors hover-white" style="font-size: 12px; color: rgb(144, 144, 144);" data-action="download">
        <span class="material-symbols-outlined" style="font-size: 14px;">download</span>
        <span>Download</span>
      </div>`;

    if (status === 'success') {
      return `${reanalyzeBtn}${openBtn}${downloadReportBtn}${deleteBtn}${viewReportBtn}`;
    } else if (status === 'pending' || status === 'failed') {
      return `${editBtn}${deleteBtn}${openBtn}${analyzeBtn}`;
    } else {
      return `${editBtn}${deleteBtn}${openBtn}`;
    }
  }

  renderScoresList(reports = null) {
    const items = [
      { key: 'performance', icon: 'speed', label: 'Performance' },
      { key: 'accessibility', icon: 'accessibility', label: 'Accessibility' },
      { key: 'bestPractices', icon: 'verified', label: 'Best Practices' },
      { key: 'seo', icon: 'search', label: 'SEO' }
    ];

    return items
      .map((item) => {
        const scores = this.extractScores(reports, item.key);
        return this.renderScoreItem(item, scores);
      })
      .join('');
  }

  extractScores(reports, key) {
    const categoryKey = key === 'bestPractices' ? 'best-practices' : key;

    const mobileScore = reports?.mobile?.lighthouseResult?.categories?.[categoryKey]?.score;
    const desktopScore = reports?.desktop?.lighthouseResult?.categories?.[categoryKey]?.score;

    return {
      mobile: this.formatScore(mobileScore),
      desktop: this.formatScore(desktopScore),
      hasScore: mobileScore != null || desktopScore != null
    };
  }

  formatScore(score) {
    return score != null ? Math.round(score * 100) : '-';
  }

  renderScoreItem(item, scores) {
    let scoreText = '';
    if (scores.hasScore) {
      const mobileColor = this.getScoreColor(scores.mobile);
      const desktopColor = this.getScoreColor(scores.desktop);
      scoreText = ` <span style="color: ${mobileColor};">${scores.mobile}</span> / <span style="color: ${desktopColor};">${scores.desktop}</span>`;
    }

    return `
      <div class="flex items-center space-x-1" style="font-size: 12px; color: rgb(144, 144, 144);">
        <span class="material-symbols-outlined" style="font-size: 14px;">${item.icon}</span>
        <span>${item.label}${scoreText}</span>
      </div>
    `;
  }

  renderScoreCircles(scores = null) {
    const defaultScores = {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null
    };
    const actualScores = scores || defaultScores;

    return `
      <div class="score-circles">
        <div class="score-item">
          <div class="score-circle" data-level="${this.getScoreLevel(actualScores.performance)}">
            ${actualScores.performance !== null ? Math.round(actualScores.performance * 100) : '-'}
          </div>
          <div class="score-label">Performance</div>
        </div>
        <div class="score-item">
          <div class="score-circle" data-level="${this.getScoreLevel(actualScores.accessibility)}">
            ${actualScores.accessibility !== null ? Math.round(actualScores.accessibility * 100) : '-'}
          </div>
          <div class="score-label">Accessibility</div>
        </div>
        <div class="score-item">
          <div class="score-circle" data-level="${this.getScoreLevel(actualScores.bestPractices)}">
            ${actualScores.bestPractices !== null ? Math.round(actualScores.bestPractices * 100) : '-'}
          </div>
          <div class="score-label">Best Practices</div>
        </div>
        <div class="score-item">
          <div class="score-circle" data-level="${this.getScoreLevel(actualScores.seo)}">
            ${actualScores.seo !== null ? Math.round(actualScores.seo * 100) : '-'}
          </div>
          <div class="score-label">SEO</div>
        </div>
      </div>
    `;
  }

  getScoreLevel(score) {
    if (score === null || score === undefined) return 'none';
    const value = score * 100;
    if (value >= 90) return 'good';
    if (value >= 50) return 'average';
    return 'poor';
  }

  getScoreColor(score) {
    if (score === '-' || score === null || score === undefined) {
      return 'rgb(144, 144, 144)';
    }
    const numericScore = typeof score === 'number' ? score : parseInt(score, 10);
    if (numericScore >= 90) return 'rgb(74, 222, 128)';
    if (numericScore >= 50) return 'rgb(251, 146, 60)';
    return 'rgb(248, 113, 113)';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
