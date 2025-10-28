/**
 * CrUX Renderer Module
 * Rules: Render Chrome User Experience Report data
 */

export class CruxRenderer {
  constructor(animateNumberFn) {
    this.animateNumber = animateNumberFn;
  }

  renderCrux(data, strategy) {
    const containerId = strategy === 'mobile' ? 'mobileCrux' : 'desktopCrux';
    const container = document.getElementById(containerId);
    if (!container) return;

    const sectionCard = container.closest('.section-card');

    if (!data.loadingExperience?.metrics) {
      container.innerHTML =
        '<p style="text-align: center; color: #CAC4D0;">無真實用戶數據</p>';
      if (sectionCard) sectionCard.style.display = 'block';
      return;
    }

    const { status, statusText } = this.getCruxStatus(data.loadingExperience);
    const html = this.buildCruxHTML(
      data.loadingExperience,
      status,
      statusText,
      strategy
    );
    container.innerHTML = html;
    if (sectionCard) sectionCard.style.display = 'block';
    setTimeout(() => this.animateCruxElements(container), 100);
  }

  replayAnimations(data, strategy) {
    const containerId = strategy === 'mobile' ? 'mobileCrux' : 'desktopCrux';
    const container = document.getElementById(containerId);
    if (!container || !data.loadingExperience?.metrics) return;

    container.querySelectorAll('.crux-metric-value').forEach((el) => {
      el.textContent = '0';
    });

    container.querySelectorAll('.crux-bar-segment').forEach((seg) => {
      seg.style.width = '0%';
    });

    container.querySelectorAll('.crux-value-pointer').forEach((pointer) => {
      pointer.style.left = '0%';
    });

    setTimeout(() => this.animateCruxElements(container), 100);
  }

  getCruxStatus(crux) {
    const map = { FAST: 'fast', AVERAGE: 'average', SLOW: 'slow' };
    const textMap = { FAST: '優秀', AVERAGE: '一般', SLOW: '需改善' };
    const status = map[crux.overall_category] || 'average';
    const statusText = textMap[crux.overall_category] || '一般';
    return { status, statusText };
  }

  buildCruxHTML(crux, status, statusText, strategy) {
    const keys = {
      core: [
        'LARGEST_CONTENTFUL_PAINT_MS',
        'INTERACTION_TO_NEXT_PAINT',
        'CUMULATIVE_LAYOUT_SHIFT_SCORE'
      ],
      other: ['FIRST_CONTENTFUL_PAINT_MS', 'EXPERIMENTAL_TIME_TO_FIRST_BYTE']
    };
    const coreHTML = keys.core
      .map((k) => this.buildCruxMetricHTML(crux, k))
      .join('');
    const otherHTML = keys.other
      .map((k) => this.buildCruxMetricHTML(crux, k))
      .join('');

    return `
      <div class="crux-main-title">
        <span class="material-symbols-outlined">insights</span>
        <span>瞭解實際使用者體驗</span>
      </div>
      <div class="crux-title-divider"></div>
      <div class="crux-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="crux-title">網站體驗核心指標評估 (Core Web Vitals):</div>
          <div class="crux-status ${status}">${statusText}</div>
        </div>
        <button class="crux-expand-toggle" onclick="window.dialogs.toggleCrux('${strategy}')">
          <span class="crux-toggle-text">收合檢視</span>
          <span class="material-symbols-outlined crux-toggle-icon">expand_less</span>
        </button>
      </div>
      <div class="crux-subtitle">真實用戶在過去 28 天的體驗速度（數值代表 75% 用戶）</div>
      <div class="crux-metrics" id="crux-metrics-list-${strategy}">
        <div class="crux-metrics-row crux-three-cols">${coreHTML}</div>
        <div class="crux-metrics-row crux-other-metrics">${otherHTML}</div>
      </div>
    `;
  }

  buildCruxMetricHTML(crux, key) {
    const metric = crux.metrics[key];
    if (!metric) return '';

    const config = this.getCruxMetricConfig(key);
    const value = metric.percentile;
    const dist = metric.distributions;
    const good = (dist[0]?.proportion || 0) * 100;
    const avg = (dist[1]?.proportion || 0) * 100;
    const poor = (dist[2]?.proportion || 0) * 100;
    const pointer = this.calculatePointer(value, config, good, avg, poor);
    const level = this.getCruxLevel(value, config);

    return this.renderCruxMetricCard({
      config,
      value,
      key,
      level,
      good,
      avg,
      poor,
      pointer
    });
  }

  getCruxMetricConfig(key) {
    const names = {
      LARGEST_CONTENTFUL_PAINT_MS: {
        en: 'Largest Contentful Paint',
        abbr: 'LCP',
        zh: '最大內容顯示',
        good: 2500,
        poor: 4000,
        unit: 's'
      },
      INTERACTION_TO_NEXT_PAINT: {
        en: 'Interaction to Next Paint',
        abbr: 'INP',
        zh: '互動反應速度',
        good: 200,
        poor: 500,
        unit: 'ms'
      },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: {
        en: 'Cumulative Layout Shift',
        abbr: 'CLS',
        zh: '頁面穩定性',
        good: 10,
        poor: 25,
        unit: ''
      },
      FIRST_CONTENTFUL_PAINT_MS: {
        en: 'First Contentful Paint',
        abbr: 'FCP',
        zh: '首次內容顯示',
        good: 1800,
        poor: 3000,
        unit: 's'
      },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: {
        en: 'Time to First Byte',
        abbr: 'TTFB',
        zh: '伺服器回應時間',
        good: 800,
        poor: 1800,
        unit: 's'
      }
    };
    return (
      names[key] || { en: key, abbr: '', zh: '', good: 0, poor: 0, unit: '' }
    );
  }

  calculatePointer(value, config, good, avg, poor) {
    if (value <= config.good) {
      return good * Math.min(value / config.good, 1);
    }
    if (value <= config.poor) {
      const ratio = (value - config.good) / (config.poor - config.good);
      return good + avg * ratio;
    }
    const ratio = Math.min((value - config.poor) / config.poor, 1);
    return good + avg + poor * ratio;
  }

  getCruxLevel(value, config) {
    if (value <= config.good) return 'good';
    if (value <= config.poor) return 'needs-improvement';
    return 'poor';
  }

  formatCruxValue(key, value) {
    if (key.includes('SHIFT')) {
      const shiftValue = value / 100;
      return shiftValue < 0.005 ? '0' : shiftValue.toFixed(2);
    }
    if (value >= 1000) return (value / 1000).toFixed(1) + ' s';
    return Math.round(value) + ' ms';
  }

  formatThreshold(value, unit) {
    if (unit === 's')
      return value >= 1000 ? value / 1000 + ' s' : value + ' ms';
    if (unit === '') return (value / 100).toFixed(2);
    return value + ' ' + unit;
  }

  renderCruxMetricCard({
    config,
    value,
    key,
    level,
    good,
    avg,
    poor,
    pointer
  }) {
    const goodLabel = `≤ ${this.formatThreshold(config.good, config.unit)}`;
    const avgLabel = `${this.formatThreshold(config.good, config.unit)} - ${this.formatThreshold(config.poor, config.unit)}`;
    const poorLabel = `> ${this.formatThreshold(config.poor, config.unit)}`;

    return `
      <div class="crux-metric">
        <div class="crux-metric-name">
          <span class="crux-metric-badge ${level}"></span>
          <div>
            <div class="crux-metric-en">${config.en}</div>
            <div class="crux-metric-zh">(${config.abbr}) ${config.zh}</div>
          </div>
        </div>
        <div class="crux-value-bar-wrapper">
          <div class="crux-metric-value" data-target="${value}" data-key="${key}">0</div>
          <div class="crux-value-pointer" data-percent="${pointer}"></div>
          <div class="crux-bar-container">
            <div class="crux-bar-segment good" data-width="${good}"></div>
            <div class="crux-bar-segment needs-improvement" data-width="${avg}"></div>
            <div class="crux-bar-segment poor" data-width="${poor}"></div>
          </div>
        </div>
        <div class="crux-legend">
          <div class="crux-legend-item">
            <span class="crux-legend-label">良好 ${goodLabel}</span>
            <span class="crux-legend-value">${good.toFixed(0)}%</span>
          </div>
          <div class="crux-legend-item">
            <span class="crux-legend-label">需要改善 ${avgLabel}</span>
            <span class="crux-legend-value">${avg.toFixed(0)}%</span>
          </div>
          <div class="crux-legend-item">
            <span class="crux-legend-label">不佳 ${poorLabel}</span>
            <span class="crux-legend-value">${poor.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  animateCruxElements(container) {
    container.querySelectorAll('.crux-metric-value').forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const key = el.dataset.key;
      this.animateNumber(el, 0, target, 1500, (v) =>
        this.formatCruxValue(key, v)
      );
    });

    container.querySelectorAll('.crux-bar-segment').forEach((seg) => {
      seg.style.width = seg.dataset.width + '%';
    });

    container.querySelectorAll('.crux-value-pointer').forEach((pointer) => {
      const percent = parseFloat(pointer.dataset.percent);
      const wrapper = pointer.closest('.crux-value-bar-wrapper');
      const width = wrapper.offsetWidth;
      const padding = 16;
      const barWidth = width - padding * 2;
      const pixelPos = padding + (barWidth * percent) / 100;
      pointer.style.left = pixelPos + 'px';
    });
  }
}
