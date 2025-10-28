/**
 * Performance Category Renderer Module
 */

import {
  getTotalSavings,
  safeId,
  escapeAndClean,
  convertLinks
} from './report-utils.js';
import { classifyPerformanceAudits } from './audit-classifier.js';

export class PerformanceRenderer {
  constructor(auditRenderer, showAsPassedFn, sortByIconLevelFn) {
    this.auditRenderer = auditRenderer;
    this.showAsPassed = showAsPassedFn;
    this.sortByIconLevel = sortByIconLevelFn;
  }

  renderPerformanceCategory(cat, category, audits, strategy) {
    const score = Math.round((category.score || 0) * 100);

    // 使用共用分類邏輯
    const { insights: rawInsights, diagnostics, passed } = classifyPerformanceAudits(category, audits);

    // Insights 需要依 savings 排序
    const insights = rawInsights.sort((a, b) => {
      const aSavings = getTotalSavings(a.metricSavings);
      const bSavings = getTotalSavings(b.metricSavings);
      return bSavings - aSavings;
    });

    let performanceTabs = '';
    if (cat.key === 'performance') {
      const metricsCount = { FCP: 0, LCP: 0, TBT: 0, CLS: 0, INP: 0 };

      insights.forEach((insight) => {
        if (insight.metricSavings) {
          Object.keys(insight.metricSavings).forEach((key) => {
            if (key in metricsCount) metricsCount[key]++;
          });
        }
      });

      diagnostics.forEach((audit) => {
        if (audit.acronym && audit.acronym in metricsCount) {
          metricsCount[audit.acronym]++;
        }
        if (audit.metricSavings) {
          Object.keys(audit.metricSavings).forEach((key) => {
            if (key in metricsCount) metricsCount[key]++;
          });
        }
      });

      const availableTabs = ['FCP', 'LCP', 'TBT', 'CLS', 'INP'].filter(
        (metric) => metricsCount[metric] > 0
      );

      if (availableTabs.length > 0) {
        const tabsHTML = availableTabs
          .map(
            (metric) =>
              `<md-primary-tab data-filter="${metric}">${metric}</md-primary-tab>`
          )
          .join('');

        performanceTabs = `
      <div class="performance-tabs" id="performance-tabs-${strategy}">
        <md-tabs>
          <md-primary-tab data-filter="all" active>All</md-primary-tab>
          ${tabsHTML}
        </md-tabs>
      </div>
    `;
      }
    }

    const insightsSection =
      cat.key === 'performance' && insights.length > 0
        ? this.buildInsightsSubsection(insights, strategy)
        : '';

    return `
      <div class="category-section" data-category="${cat.key}">
        <div class="category-header" onclick="window.dialogs.toggleCategory('${strategy}-${cat.key}')">
          <md-ripple></md-ripple>
          <div class="category-title-group">
            <h3>${cat.labelEn}</h3>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">收合檢視</span>
            <span class="material-symbols-outlined">expand_less</span>
          </button>
        </div>
        <div class="category-summary-row">
          <span class="category-label-zh">${cat.labelZh}</span>
          <span class="category-summary">
            (<span class="score-number">${score}</span> 分)&nbsp;&nbsp;${insights.length + diagnostics.length} 個需要改善&nbsp;&nbsp;${passed.length} 個已通過
          </span>
          <md-icon-button onclick="event.stopPropagation(); window.dialogs.handleCopyClick('category', '${cat.key}', '${strategy}', event)" title="複製報告" style="width: 24px; height: 24px; --md-icon-button-icon-size: 18px">
            <span class="material-symbols-outlined" style="font-size: 18px">content_copy</span>
          </md-icon-button>
        </div>
        <div class="category-content" id="category-${strategy}-${cat.key}">
          ${performanceTabs}
          ${insightsSection}
          ${this.buildSubsection('diagnostics', cat.key, diagnostics, '診斷 (DIAGNOSTICS)', 'warning', false, strategy)}
          ${this.buildSubsection('passed', cat.key, passed, '通過稽核項目 (PASSED AUDITS)', 'success', true, strategy)}
        </div>
      </div>
    `;
  }

  buildInsightsSubsection(insights, strategy) {
    const sortedInsights = this.sortByIconLevel(insights, (insight) =>
      this.getInsightLevel(insight)
    );

    return `
      <div class="subsection insights-subsection">
        <div class="subsection-header" onclick="window.dialogs.toggleInsightsSubsection('${strategy}')">
          <md-ripple></md-ripple>
          <div class="subsection-title-group">
            <span class="subsection-badge warning"></span>
            <h4>深入分析 (INSIGHTS) (<span id="insights-count-${strategy}">${sortedInsights.length}</span> 項)</h4>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">隱藏</span>
            <span class="material-symbols-outlined">expand_less</span>
          </button>
        </div>
        <div class="audits-list" id="insights-subsection-${strategy}">
          ${sortedInsights.map((insight) => this.buildInsightHTML(insight, strategy)).join('')}
        </div>
      </div>
    `;
  }

  getInsightLevel(insight) {
    if (insight.scoreDisplayMode === 'informative' || insight.id === 'lcp-breakdown-insight') {
      return 'informative';
    } else if (
      insight.scoreDisplayMode === 'metricSavings' &&
      insight.metricSavings?.LCP >= 1000
    ) {
      return 'average';
    } else {
      const score = insight.score || 0;
      if (score >= 0.9) return 'good';
      return 'poor';
    }
  }

  buildInsightHTML(insight, strategy) {
    const totalSavings = getTotalSavings(insight.metricSavings);
    let level;
    let iconMap;

    if (insight.scoreDisplayMode === 'informative' || insight.id === 'lcp-breakdown-insight') {
      level = 'informative';
      iconMap = { informative: 'radio_button_unchecked' };
    } else if (
      insight.scoreDisplayMode === 'metricSavings' &&
      insight.metricSavings?.LCP >= 1000
    ) {
      level = 'average';
      iconMap = { good: 'check_circle', average: 'warning', poor: 'error' };
    } else {
      const score = insight.score || 0;

      if (score >= 0.9) {
        level = 'good';
      } else {
        level = 'poor';
      }
      iconMap = { good: 'check_circle', average: 'warning', poor: 'error' };
    }

    const displayValue = insight.displayValue || `可省下 ${totalSavings} 毫秒`;

    const metricTags = Object.keys(insight.metricSavings || {})
      .map((key) => `<span class="insight-metric-tag">${key}</span>`)
      .join('');

    const unscoredTag =
      insight.weight === 0
        ? `<span class="insight-metric-tag unscored">未計分</span>`
        : '';

    const allTags = metricTags + unscoredTag;

    const auditId = safeId(`${strategy}-insight-${insight.id}`);
    const resourcesCount = insight.details?.items?.length || 0;

    const metricsData = Object.keys(insight.metricSavings || {}).join(',');

    return `
      <div class="audit-item insight-item" data-metrics="${metricsData}">
        <div class="audit-header" onclick="window.dialogs.toggleAudit('${auditId}')" aria-expanded="false">
          <md-ripple></md-ripple>
          <div class="audit-title-section">
            <span class="material-symbols-outlined audit-indicator ${level}">${iconMap[level]}</span>
            <div>
              <div class="audit-title">${escapeAndClean(insight.title)}</div>
              <div class="audit-subtitle">
                ${displayValue}${resourcesCount > 0 ? ` | ${resourcesCount} 個資源` : ''}
                ${allTags}
              </div>
            </div>
          </div>
          <span class="material-symbols-outlined expand-icon">expand_more</span>
        </div>
        <div class="audit-details hidden" id="${auditId}">
          ${insight.description ? `<div class="audit-description">${convertLinks(insight.description)}</div>` : ''}
          ${this.auditRenderer.buildResources(insight.details)}
        </div>
      </div>
    `;
  }

  buildSubsection(type, catKey, audits, title, badge, collapsed, strategy) {
    if (audits.length === 0) return '';

    const sortedAudits =
      type === 'passed'
        ? audits
        : this.sortByIconLevel(audits, (audit) =>
            this.auditRenderer.getAuditLevel(audit)
          );

    return `
      <div class="subsection ${type}">
        <div class="subsection-header" onclick="window.dialogs.toggleSubsection('${strategy}-${catKey}-${type}')">
          <md-ripple></md-ripple>
          <div class="subsection-title-group">
            <span class="subsection-badge ${badge}"></span>
            <h4>${title} (<span id="${type}-count-${strategy}-${catKey}">${sortedAudits.length}</span> 項)</h4>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">${collapsed ? '顯示' : '隱藏'}</span>
            <span class="material-symbols-outlined">${collapsed ? 'expand_more' : 'expand_less'}</span>
          </button>
        </div>
        <div class="audits-list ${collapsed ? 'hidden' : ''}" id="${strategy}-${catKey}-${type}">
          ${sortedAudits.map((a) => this.auditRenderer.buildAuditItem(a, catKey, strategy)).join('')}
        </div>
      </div>
    `;
  }
}
