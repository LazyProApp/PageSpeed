/**
 * Metrics Renderer Module
 * Rules: Render performance metrics (FCP, LCP, TBT, CLS, SI)
 */

import {
  getScoreLevel,
  escapeHtml,
  convertLinksToAnchors
} from './report-utils.js';

export class MetricsRenderer {
  renderMetrics(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileMetrics' : 'desktopMetrics';
    const container = document.getElementById(containerId);
    if (!container) return;

    const audits = data.lighthouseResult.audits;
    const coreHTML = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time'
    ]
      .map((key) => this.buildMetricHTML(audits, key))
      .filter(Boolean)
      .join('');

    const otherHTML = ['cumulative-layout-shift', 'speed-index']
      .map((key) => this.buildMetricHTML(audits, key))
      .filter(Boolean)
      .join('');

    container.innerHTML = `
      <div class="crux-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="crux-title">效能指標 (METRICS):</div>
        </div>
        <button class="crux-expand-toggle" onclick="window.dialogs.toggleMetrics('${strategy}')">
          <span class="crux-toggle-text">收合檢視</span>
          <span class="material-symbols-outlined crux-toggle-icon">expand_less</span>
        </button>
      </div>
      <div class="crux-subtitle">Lighthouse 實驗室測試數據</div>
      <div class="crux-metrics" id="metrics-list-${strategy}">
        <div class="crux-metrics-row crux-three-cols">${coreHTML}</div>
        <div class="crux-metrics-row crux-other-metrics">${otherHTML}</div>
      </div>
    `;

    container.querySelectorAll('.metric-description').forEach((el) => {
      const html = el.dataset.description;
      if (html) {
        el.innerHTML = convertLinksToAnchors(html);
        delete el.dataset.description;
      }
    });

    delete container.dataset.animated;
    this.setupMetricsObserver(container);

    const sectionCard = container.closest('.section-card');
    if (sectionCard) sectionCard.style.display = 'block';
  }

  replayAnimations(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileMetrics' : 'desktopMetrics';
    const container = document.getElementById(containerId);
    if (!container) return;

    delete container.dataset.animated;
    this.setupMetricsObserver(container);
  }

  buildMetricHTML(audits, key) {
    const audit = audits[key];
    if (!audit) return '';

    const config = this.getMetricConfig(key);
    const value = audit.numericValue || 0;
    const level = getScoreLevel(audit.score);

    return `
      <div class="crux-metric" data-metric-key="${key}">
        <div class="crux-metric-name">
          <span class="crux-metric-badge ${level}"></span>
          <div>
            <div class="crux-metric-en">${config.en}</div>
            <div class="crux-metric-zh">(${config.abbr}) ${config.zh}</div>
          </div>
        </div>
        <div class="crux-value-bar-wrapper">
          <div class="crux-metric-value" data-target="${value}" data-key="${key}">0</div>
        </div>
        <div class="crux-legend">
          <div class="metric-description" data-description="${escapeHtml(audit.description || '')}"></div>
        </div>
      </div>
    `;
  }

  getMetricConfig(key) {
    const configs = {
      'first-contentful-paint': {
        en: 'First Contentful Paint',
        abbr: 'FCP',
        zh: '首次內容顯示'
      },
      'largest-contentful-paint': {
        en: 'Largest Contentful Paint',
        abbr: 'LCP',
        zh: '最大內容顯示'
      },
      'total-blocking-time': {
        en: 'Total Blocking Time',
        abbr: 'TBT',
        zh: '總阻塞時間'
      },
      'cumulative-layout-shift': {
        en: 'Cumulative Layout Shift',
        abbr: 'CLS',
        zh: '累積版面配置轉移'
      },
      'speed-index': {
        en: 'Speed Index',
        abbr: 'SI',
        zh: '速度指數'
      }
    };
    return configs[key] || { en: key, abbr: '', zh: '' };
  }

  setupMetricsObserver(container) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            this.animateMetrics(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);
  }

  animateMetrics(container) {
    container.querySelectorAll('.crux-metric-value').forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const key = el.dataset.key;
      this.animateNumber(el, 0, target, 1500, (v) =>
        this.formatMetricValue(key, v)
      );
    });
  }

  formatMetricValue(key, value) {
    if (key.includes('shift')) {
      return value < 0.0005 ? '0' : value.toFixed(3);
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + ' s';
    }
    return Math.round(value) + ' ms';
  }

  toggleMetrics(strategy) {
    const list = document.getElementById(`metrics-list-${strategy}`);
    if (!list) return;

    const button = list.parentElement?.querySelector('.crux-expand-toggle');
    if (!button) return;

    const text = button.querySelector('.crux-toggle-text');
    const icon = button.querySelector('.crux-toggle-icon');
    if (!text || !icon) return;

    if (list.classList.contains('collapsed')) {
      list.classList.remove('collapsed');
      text.textContent = '收合檢視';
      icon.textContent = 'expand_less';
    } else {
      list.classList.add('collapsed');
      text.textContent = '展開檢視';
      icon.textContent = 'expand_more';
    }
  }

  animateNumber(element, start, end, duration, formatter) {
    if (element.animationId) {
      cancelAnimationFrame(element.animationId);
    }

    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      element.textContent = formatter(current);
      if (progress < 1) {
        element.animationId = requestAnimationFrame(update);
      } else {
        delete element.animationId;
      }
    };
    element.animationId = requestAnimationFrame(update);
  }
}
