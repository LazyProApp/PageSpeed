/**
 * Categories Renderer Module (Main Coordinator)
 */

import { formatScore, showAsPassed } from './report-utils.js';
import { AuditRenderer } from './audit-renderer.js';
import { PerformanceRenderer } from './performance-renderer.js';
import { GenericRenderer } from './generic-renderer.js';
import { PerformanceTabs } from './performance-tabs.js';

export class CategoriesRenderer {
  constructor(animateNumberFn) {
    this.animateNumber = animateNumberFn;
    this.auditRenderer = new AuditRenderer();
    this.performanceTabs = new PerformanceTabs();
    this.performanceRenderer = new PerformanceRenderer(
      this.auditRenderer,
      showAsPassed,
      (items, getIconLevelFn) => this.sortByIconLevel(items, getIconLevelFn)
    );
    this.genericRenderer = new GenericRenderer(this.auditRenderer);
  }

  sortByIconLevel(items, getIconLevelFn) {
    const sortOrder = {
      poor: 1,
      average: 2,
      informative: 3
    };

    return [...items].sort((a, b) => {
      const levelA = getIconLevelFn(a);
      const levelB = getIconLevelFn(b);
      return (sortOrder[levelA] || 999) - (sortOrder[levelB] || 999);
    });
  }

  renderCategories(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileCategories' : 'desktopCategories';
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;
    const list = [
      { key: 'performance', labelEn: 'Performance', labelZh: '效能' },
      { key: 'accessibility', labelEn: 'Accessibility', labelZh: '無障礙功能' },
      { key: 'best-practices', labelEn: 'Best Practices', labelZh: '最佳做法' },
      { key: 'seo', labelEn: 'SEO', labelZh: '搜尋引擎最佳化' }
    ];

    container.innerHTML = '';
    list.forEach((cat) => {
      const category = categories[cat.key];
      if (!category) return;
      const html = this.buildCategorySection(cat, category, audits, strategy);
      container.insertAdjacentHTML('beforeend', html);
    });

    setTimeout(() => {
      container
        .querySelectorAll('.category-section .score-number')
        .forEach((el) => {
          if (!el.dataset.target) return;
          const target = parseFloat(el.dataset.target);
          this.animateNumber(el, 0, target, 1500, formatScore);
        });
    }, 300);

    this.performanceTabs.resetPerformanceTabs(strategy);
    this.auditRenderer.setupAuditAnimations();
    this.performanceTabs.setupPerformanceTabs(strategy);

    const sectionCard = container.closest('.section-card');
    if (sectionCard) sectionCard.style.display = 'block';
  }

  buildCategorySection(cat, category, audits, strategy) {
    if (cat.key === 'performance') {
      return this.performanceRenderer.renderPerformanceCategory(
        cat,
        category,
        audits,
        strategy
      );
    } else {
      return this.genericRenderer.renderGenericCategory(
        cat,
        category,
        audits,
        strategy
      );
    }
  }

  toggleInsightsSubsection(strategy) {
    return this.performanceTabs.toggleInsightsSubsection(strategy);
  }
}
