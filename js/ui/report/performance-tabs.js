/**
 * Performance Tabs Module
 * Rules: Manage event listeners properly to avoid memory leaks
 */

export class PerformanceTabs {
  constructor() {
    this.tabsHandlers = new Map();
  }

  setupPerformanceTabs(strategy) {
    const tabsElement = document.querySelector(
      `#performance-tabs-${strategy} md-tabs`
    );
    if (!tabsElement) return;

    if (tabsElement.dataset.listenerBound) return;
    tabsElement.dataset.listenerBound = 'true';

    const handler = (event) => {
      const activeTab = event.target.activeTab;
      const filter = activeTab ? activeTab.dataset.filter : 'all';
      this.filterPerformanceAudits(strategy, filter);
    };

    this.tabsHandlers.set(tabsElement, handler);
    tabsElement.addEventListener('change', handler);
  }

  resetPerformanceTabs(strategy) {
    const tabsElement = document.querySelector(
      `#performance-tabs-${strategy} md-tabs`
    );
    if (!tabsElement) return;

    tabsElement.querySelectorAll('md-primary-tab').forEach((tab) => {
      tab.active = false;
    });

    const allTab = tabsElement.querySelector('[data-filter="all"]');
    if (allTab) {
      allTab.active = true;
    }

    this.cleanupPerformanceTabs();
    this.filterPerformanceAudits(strategy, 'all');
  }

  cleanupPerformanceTabs() {
    document.querySelectorAll('.performance-tabs md-tabs').forEach((tabs) => {
      const handler = this.tabsHandlers.get(tabs);
      if (handler) {
        tabs.removeEventListener('change', handler);
        this.tabsHandlers.delete(tabs);
      }
      delete tabs.dataset.listenerBound;
    });
  }

  filterPerformanceAudits(strategy, filter) {
    const insightsSubsection = document.getElementById(
      `insights-subsection-${strategy}`
    );
    const diagnosticsSubsection = document.getElementById(
      `${strategy}-performance-diagnostics`
    );
    const passedSubsection = document.getElementById(
      `${strategy}-performance-passed`
    );

    let insightsCount = 0;
    let diagnosticsCount = 0;
    let passedCount = 0;

    if (insightsSubsection) {
      insightsSubsection.querySelectorAll('.audit-item').forEach((item) => {
        const metrics = item.dataset.metrics
          ? item.dataset.metrics.split(',')
          : [];

        if (filter === 'all' || metrics.includes(filter)) {
          item.style.display = '';
          insightsCount++;
        } else {
          item.style.display = 'none';
        }
      });
    }

    if (diagnosticsSubsection) {
      diagnosticsSubsection.querySelectorAll('.audit-item').forEach((item) => {
        const metrics = item.dataset.metrics
          ? item.dataset.metrics.split(',')
          : [];

        if (filter === 'all' || metrics.includes(filter)) {
          item.style.display = '';
          diagnosticsCount++;
        } else {
          item.style.display = 'none';
        }
      });
    }

    if (passedSubsection) {
      passedSubsection.querySelectorAll('.audit-item').forEach((item) => {
        const metrics = item.dataset.metrics
          ? item.dataset.metrics.split(',')
          : [];

        if (filter === 'all' || metrics.includes(filter)) {
          item.style.display = '';
          passedCount++;
        } else {
          item.style.display = 'none';
        }
      });
    }

    const insightsCountEl = document.getElementById(
      `insights-count-${strategy}`
    );
    if (insightsCountEl) insightsCountEl.textContent = insightsCount;

    const diagnosticsCountEl = document.getElementById(
      `diagnostics-count-${strategy}-performance`
    );
    if (diagnosticsCountEl) diagnosticsCountEl.textContent = diagnosticsCount;

    const passedCountEl = document.getElementById(
      `passed-count-${strategy}-performance`
    );
    if (passedCountEl) passedCountEl.textContent = passedCount;
  }

  toggleInsightsSubsection(strategy) {
    const subsection = document.getElementById(
      `insights-subsection-${strategy}`
    );
    if (!subsection) return;

    const header = subsection.previousElementSibling;
    const toggleBtn = header.querySelector('.toggle-btn');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    const toggleIcon = toggleBtn.querySelector('.material-symbols-outlined');

    if (subsection.classList.contains('hidden')) {
      subsection.classList.remove('hidden');
      toggleText.textContent = '隱藏';
      toggleIcon.textContent = 'expand_less';
    } else {
      subsection.classList.add('hidden');
      toggleText.textContent = '顯示';
      toggleIcon.textContent = 'expand_more';
    }
  }
}
