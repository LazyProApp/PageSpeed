/**
 * Generic Category Renderer Module (SEO, Accessibility, Best Practices)
 */

import { classifyGenericAudits } from './audit-classifier.js';

export class GenericRenderer {
  constructor(auditRenderer) {
    this.auditRenderer = auditRenderer;
  }

  renderGenericCategory(cat, category, audits, strategy) {
    const score = Math.round((category.score || 0) * 100);

    // 使用共用分類邏輯（傳入 categoryKey 以取得正確排序）
    const { auditsByGroup, groupOrder, special } = classifyGenericAudits(category, audits, cat.key);

    let groupsHTML = '';

    groupOrder.forEach((groupKey) => {
      const groupData = auditsByGroup[groupKey];
      if (groupData && groupData.nonPassed.length > 0) {
        const groupTitle = this.formatGroupTitle(groupKey);
        groupsHTML += this.buildGenericGroup(
          groupTitle,
          groupData.nonPassed,
          cat.key,
          strategy,
          groupKey
        );
      }
    });

    const manualHTML =
      special.manual.length > 0
        ? this.buildGenericGroup(
            `其他手動檢查項目 (ADDITIONAL ITEMS TO MANUALLY CHECK)`,
            special.manual,
            cat.key,
            strategy,
            'manual'
          )
        : '';

    const passedHTML =
      special.passed.length > 0
        ? this.buildGenericGroup(
            `通過稽核項目 (PASSED AUDITS)`,
            special.passed,
            cat.key,
            strategy,
            'passed'
          )
        : '';

    const notApplicableHTML =
      special.notApplicable.length > 0
        ? this.buildGenericGroup(
            `不適用 (NOT APPLICABLE)`,
            special.notApplicable,
            cat.key,
            strategy,
            'not-applicable'
          )
        : '';

    const totalFailed = Object.values(auditsByGroup)
      .map((g) => g.nonPassed.length)
      .reduce((sum, count) => sum + count, 0);
    const totalPassed = special.passed.length;

    return `
      <div class="category-section" data-category="${cat.key}">
        <div class="category-header" onclick="window.dialogs.toggleCategory('${strategy}-${cat.key}')">
          <md-ripple></md-ripple>
          <div class="category-title-group">
            <h3>${cat.labelEn}</h3>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">展開檢視</span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
        </div>
        <div class="category-summary-row">
          <span class="category-label-zh">${cat.labelZh}</span>
          <span class="category-summary">
            (<span class="score-number">${score}</span> 分)&nbsp;&nbsp;${totalFailed} 個需要改善&nbsp;&nbsp;${totalPassed} 個已通過
          </span>
          <md-icon-button onclick="event.stopPropagation(); window.dialogs.handleCopyClick('category', '${cat.key}', '${strategy}', event)" title="複製報告" style="width: 24px; height: 24px; --md-icon-button-icon-size: 18px">
            <span class="material-symbols-outlined" style="font-size: 18px">content_copy</span>
          </md-icon-button>
        </div>
        <div class="category-content hidden" id="category-${strategy}-${cat.key}">
          ${groupsHTML}
          ${manualHTML}
          ${passedHTML}
          ${notApplicableHTML}
        </div>
      </div>
    `;
  }

  sortGroupOrder(groupOrder, categoryKey) {
    const preferredOrder = {
      'best-practices': [
        'best-practices-general',
        'best-practices-trust-safety',
        'best-practices-ux',
        'best-practices-browser-compat'
      ],
      accessibility: [
        'a11y-color-contrast',
        'a11y-names-labels',
        'a11y-navigation',
        'a11y-best-practices',
        'a11y-aria',
        'a11y-language',
        'a11y-audio-video',
        'a11y-tables-lists'
      ],
      seo: ['seo-mobile', 'seo-content', 'seo-crawl']
    };

    const order = preferredOrder[categoryKey];
    if (!order) {
      return groupOrder;
    }

    return groupOrder.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  }

  formatGroupTitle(groupKey) {
    const mappings = {
      'a11y-best-practices': '最佳做法 (BEST PRACTICES)',
      'a11y-color-contrast': '對比 (CONTRAST)',
      'a11y-names-labels': '名稱和標籤 (NAMES AND LABELS)',
      'a11y-navigation': '瀏覽 (NAVIGATION)',
      'a11y-aria': 'ARIA',
      'a11y-language': '國際化和本地化 (INTERNATIONALIZATION AND LOCALIZATION)',
      'a11y-audio-video': '音訊和影片 (AUDIO AND VIDEO)',
      'a11y-tables-lists': '表格和清單 (TABLES AND LISTS)',
      'best-practices-trust-safety': '信任與安全性 (TRUST AND SAFETY)',
      'best-practices-ux': '使用者體驗 (USER EXPERIENCE)',
      'best-practices-browser-compat': '瀏覽器相容性 (BROWSER COMPATIBILITY)',
      'best-practices-general': '一般 (GENERAL)',
      'seo-mobile': '適合透過行動裝置瀏覽 (MOBILE FRIENDLY)',
      'seo-content': '內容最佳做法 (CONTENT BEST PRACTICES)',
      'seo-crawl': '檢索及建立索引 (CRAWLING AND INDEXING)'
    };

    return mappings[groupKey] || groupKey.toUpperCase();
  }

  buildGenericGroup(
    title,
    audits,
    categoryKey,
    strategy,
    groupKey = 'default'
  ) {
    const auditItems = audits
      .map((audit) => this.auditRenderer.buildAuditItem(audit, categoryKey, strategy))
      .join('');

    let badgeClass = 'warning';
    if (groupKey === 'manual') {
      badgeClass = 'info';
    } else if (groupKey === 'not-applicable') {
      badgeClass = 'neutral';
    } else if (groupKey === 'passed') {
      badgeClass = 'success';
    }

    const safeGroupKey = groupKey.replace(/[^a-z0-9-]/gi, '-');

    return `
      <div class="subsection">
        <div class="subsection-header" onclick="window.dialogs.toggleSubsection('${strategy}-${categoryKey}-${safeGroupKey}')">
          <md-ripple></md-ripple>
          <div class="subsection-title-group">
            <span class="subsection-badge ${badgeClass}"></span>
            <h4>${title} (<span class="subsection-count">${audits.length}</span> 項)</h4>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">顯示</span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
        </div>
        <div class="audits-list hidden" id="${strategy}-${categoryKey}-${safeGroupKey}">
          ${auditItems}
        </div>
      </div>
    `;
  }
}
