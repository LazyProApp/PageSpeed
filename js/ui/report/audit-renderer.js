/**
 * Audit Renderer Module
 */

import {
  safeId,
  stripHtml,
  escapeAndClean,
  convertLinks
} from './report-utils.js';

export class AuditRenderer {
  constructor() {
    this.auditObserver = null;
  }

  setupAuditAnimations() {
    if (this.auditObserver) {
      this.auditObserver.disconnect();
    }

    this.auditObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !entry.target.classList.contains('animate')
          ) {
            entry.target.classList.add('animate');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.audit-item').forEach((item) => {
      this.auditObserver.observe(item);
    });
  }

  getAuditLevel(audit) {
    if (audit.id === 'cls-culprits-insight' && audit.score !== null) {
      const score = Math.round((audit.score || 0) * 100);
      if (score >= 90) return 'good';
      if (score >= 50) return 'average';
      return 'poor';
    }

    if (
      audit.scoreDisplayMode === 'informative' ||
      audit.scoreDisplayMode === 'notApplicable'
    ) {
      return 'informative';
    }

    const score = Math.round((audit.score || 0) * 100);
    if (score >= 90) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  getAuditLevelAndIcon(audit) {
    const isInformative =
      audit.scoreDisplayMode === 'informative' ||
      audit.scoreDisplayMode === 'notApplicable';

    if (isInformative) {
      return {
        level: 'informative',
        iconMap: { informative: 'radio_button_unchecked' }
      };
    }

    const score = Math.round((audit.score || 0) * 100);
    let level;
    if (score >= 90) {
      level = 'good';
    } else if (score >= 50) {
      level = 'average';
    } else {
      level = 'poor';
    }

    return {
      level,
      iconMap: { good: 'check_circle', average: 'warning', poor: 'error' }
    };
  }

  buildAuditItem(audit, catKey, strategy) {
    if (!audit) return '';

    const { level, iconMap } = this.getAuditLevelAndIcon(audit);

    const scorePercent = Math.round((audit.score || 0) * 100);
    const displayValue = audit.displayValue || '';
    const resourcesCount = audit.details?.items?.length || 0;

    const parts = [];
    if (level !== 'informative') {
      parts.push(`Score: <span class="audit-score">${scorePercent}</span>`);
    }
    if (displayValue && displayValue !== '0') parts.push(displayValue);
    if (resourcesCount > 0) parts.push(`${resourcesCount} 個資源`);
    const subtitle = parts.join(' | ');
    const auditId = safeId(strategy + '-' + catKey + '-' + audit.id);

    const metrics = [];
    if (audit.acronym) {
      metrics.push(audit.acronym);
    }
    if (audit.metricSavings) {
      Object.keys(audit.metricSavings).forEach((key) => {
        if (!metrics.includes(key)) {
          metrics.push(key);
        }
      });
    }
    const metricsData = metrics.join(',');

    const metricTags = metrics
      .map((key) => `<span class="insight-metric-tag">${key}</span>`)
      .join('');

    const unscoredTag =
      audit.weight === 0
        ? `<span class="insight-metric-tag unscored">未計分</span>`
        : '';

    const allTags = metricTags + unscoredTag;

    return `
      <div class="audit-item" data-metrics="${metricsData}">
        <div class="audit-header" onclick="window.dialogs.toggleAudit('${auditId}')" aria-expanded="false">
          <md-ripple></md-ripple>
          <div class="audit-title-section">
            <span class="material-symbols-outlined audit-indicator ${level}">${iconMap[level]}</span>
            <div>
              <div class="audit-title">${escapeAndClean(audit.title)}</div>
              <div class="audit-subtitle">${subtitle} ${allTags}</div>
            </div>
          </div>
          <span class="material-symbols-outlined expand-icon">expand_more</span>
        </div>
        <div class="audit-details hidden" id="${auditId}">
          ${audit.description ? `<div class="audit-description">${convertLinks(audit.description)}</div>` : ''}
          ${this.buildResources(audit.details)}
        </div>
      </div>
    `;
  }

  buildResources(details) {
    if (!details?.items) return '';

    const itemsArray = Array.isArray(details.items) ? details.items : [];
    if (itemsArray.length === 0) return '';

    const items = itemsArray
      .flatMap((item) => this.extractInfo(item))
      .filter((i) => i?.text?.trim());
    if (items.length === 0) return '';

    return `
      <div class="resources-list">
        <div class="resources-header">問題資源:</div>
        ${items
          .map(
            (i) => `
          <div class="resource-item">
            <div class="resource-url">${i.text}</div>
            ${i.stats ? `<div class="resource-stats">${i.stats}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  extractInfo(item) {
    if (item.type === 'table' && item.items) {
      return item.items.map((sub) => this.extractInfo(sub)).filter((i) => i);
    }

    let text = null;
    const stats = [];

    if (item.url) text = item.url;
    else if (item.scriptUrl) text = item.scriptUrl;
    else if (item.source?.url || item.source?.snippet)
      text = item.source.url || item.source.snippet;
    else if (item.node)
      text = item.node.selector || item.node.snippet || item.node.nodeLabel;
    else if (item.label) text = item.label;
    else if (item.groupLabel) text = item.groupLabel;
    else if (item.entity) text = item.entity;
    else if (typeof item.description === 'string') text = item.description;

    if (!text) return null;

    if (item.wastedBytes)
      stats.push(`浪費流量: ${(item.wastedBytes / 1024).toFixed(0)} KB`);
    if (item.wastedMs) stats.push(`浪費時間: ${Math.round(item.wastedMs)}ms`);
    if (item.totalBytes)
      stats.push(`總大小: ${(item.totalBytes / 1024).toFixed(0)} KB`);
    if (item.transferSize)
      stats.push(`傳輸大小: ${(item.transferSize / 1024).toFixed(0)} KB`);

    return { text: stripHtml(text), stats: stats.join(' | ') };
  }
}
