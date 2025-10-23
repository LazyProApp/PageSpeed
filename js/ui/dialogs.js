/**
 * Dialogs UI Module
 * Rules: Manage all dialogs (Report, Alert, Confirm)
 */

import { EVENTS } from '../core/events.js';
import { logger } from '../utils/logger.js';

export class Dialogs {
  constructor(eventBus, dataEngine) {
    this.eventBus = eventBus;
    this.dataEngine = dataEngine;
    this.reportDialog = document.getElementById('reportDialog');
    this.reportDialogHandlerBound = false;
    window.dialogs = this;
  }

  setupEventListeners() {
    this.setupReportDialog();

    this.eventBus.on(EVENTS.SYSTEM.ALERT_REQUESTED, (data) => {
      this.showAlert(data.title, data.message);
    });

    this.eventBus.on(EVENTS.SYSTEM.ERROR, (data) => {
      this.showAlert('錯誤', data.message);
    });

    this.eventBus.on(EVENTS.UI.CONFIRM_REQUESTED, (data) => {
      this.showConfirm(data.title, data.message, data.onConfirm, data.icon);
    });

    this.eventBus.on(EVENTS.UI.DIALOG_OPENED, (data) => {
      if (data.dialogId === 'reportDialog' && data.data) {
        this.showReport(data.data);
      }
    });
  }

  setupReportDialog() {
    if (this.reportDialogHandlerBound || !this.reportDialog) return;

    this.handleReportDialogClick = (e) => {
      const btn = e.target.closest('md-icon-button');
      if (btn) {
        const action = btn.getAttribute('value');
        if (action === 'cancel') {
          this.reportDialog.close();
        }
      }
    };

    this.handleTabChange = (e) => {
      const tabs = this.reportDialog.querySelector('md-tabs');
      if (!tabs) return;
      const activeTab = tabs.querySelector('md-primary-tab[active]');
      if (activeTab) {
        const strategy = activeTab.dataset.strategy;
        this.switchStrategy(strategy);
      }
    };

    this.handleReportDialogClose = () => {
      this.removeDialogBlurEffect();
    };

    this.reportDialog.addEventListener('click', this.handleReportDialogClick);
    this.reportDialog.addEventListener('close', this.handleReportDialogClose);

    const tabsElement = this.reportDialog.querySelector('md-tabs');
    if (tabsElement) {
      tabsElement.addEventListener('change', this.handleTabChange);
    }

    this.reportDialogHandlerBound = true;
  }

  setupTabSwitching() {
    const tabs = this.reportDialog.querySelectorAll('md-primary-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const strategy = tab.dataset.strategy;
        this.switchStrategy(strategy);
      });
    });
  }

  switchStrategy(strategy) {
    const mobileReport = document.getElementById('mobileReport');
    const desktopReport = document.getElementById('desktopReport');

    if (strategy === 'mobile') {
      if (mobileReport) mobileReport.style.display = 'block';
      if (desktopReport) desktopReport.style.display = 'none';

      if (this.reportData.mobile) {
        setTimeout(() => {
          this.renderStrategy('mobile');
        }, 0);
      }
    } else {
      if (mobileReport) mobileReport.style.display = 'none';
      if (desktopReport) desktopReport.style.display = 'block';

      if (this.reportData.desktop) {
        setTimeout(() => {
          this.renderStrategy('desktop');
        }, 0);
      }
    }
  }

  applyDialogBlurEffect() {
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.classList.add('dialog-blur');
    }

    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
      statsSection.classList.add('dialog-blur');
    }

    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.add('dialog-blur');
    }
  }

  removeDialogBlurEffect() {
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.classList.remove('dialog-blur');
    }

    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
      statsSection.classList.remove('dialog-blur');
    }

    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.remove('dialog-blur');
    }
  }

  showAlert(title, message) {
    this.showAlertDialog(title, message, '確定', 'warning');
  }

  showConfirm(title, message, onConfirm, icon = 'delete') {
    this.showConfirmDialog(title, message, '確定', '取消', icon).then(
      (result) => {
        if (result && typeof onConfirm === 'function') {
          onConfirm();
        }
      }
    );
  }

  showAlertDialog(title, message, confirmText = '確定', icon = 'warning') {
    return new Promise((resolve) => {
      const alertDialog = document.createElement('md-dialog');
      alertDialog.setAttribute('type', 'alert');
      alertDialog.className = 'confirm-dialog';

      alertDialog.innerHTML = `
        <div slot="content" class="confirm-content">
          <md-icon class="confirm-icon">${icon}</md-icon>
          <h2 class="confirm-title"></h2>
          <p class="confirm-message"></p>
        </div>
        <div slot="actions">
          <md-text-button class="confirm-btn"></md-text-button>
        </div>
      `;

      document.body.appendChild(alertDialog);

      alertDialog.querySelector('.confirm-title').textContent = title;
      alertDialog.querySelector('.confirm-message').textContent = message;
      alertDialog.querySelector('.confirm-btn').textContent = confirmText;

      const confirmBtn = alertDialog.querySelector('.confirm-btn');

      confirmBtn.addEventListener('click', async () => {
        await alertDialog.close('confirm');
      });

      alertDialog.addEventListener('closed', () => {
        this.removeDialogBlurEffect();

        if (alertDialog.parentNode) {
          alertDialog.parentNode.removeChild(alertDialog);
        }

        const result = alertDialog.returnValue === 'confirm';
        resolve(result);
      });

      this.applyDialogBlurEffect();
      alertDialog.show();
      logger.debug('Alert shown', { title });
    });
  }

  showConfirmDialog(
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    icon = 'delete'
  ) {
    return new Promise((resolve) => {
      const confirmDialog = document.createElement('md-dialog');
      confirmDialog.setAttribute('type', 'alert');
      confirmDialog.className = 'confirm-dialog';

      confirmDialog.innerHTML = `
        <div slot="content" class="confirm-content">
          <md-icon class="confirm-icon">${icon}</md-icon>
          <h2 class="confirm-title"></h2>
          <p class="confirm-message"></p>
        </div>
        <div slot="actions">
          <md-text-button class="cancel-btn"></md-text-button>
          <md-text-button class="confirm-btn"></md-text-button>
        </div>
      `;

      document.body.appendChild(confirmDialog);

      confirmDialog.querySelector('.confirm-title').textContent = title;
      confirmDialog.querySelector('.confirm-message').textContent = message;
      confirmDialog.querySelector('.cancel-btn').textContent = cancelText;
      confirmDialog.querySelector('.confirm-btn').textContent = confirmText;

      const confirmBtn = confirmDialog.querySelector('.confirm-btn');
      const cancelBtn = confirmDialog.querySelector('.cancel-btn');

      confirmBtn.addEventListener('click', async () => {
        await confirmDialog.close('confirm');
      });

      cancelBtn.addEventListener('click', async () => {
        await confirmDialog.close('cancel');
      });

      confirmDialog.addEventListener('closed', () => {
        this.removeDialogBlurEffect();

        if (confirmDialog.parentNode) {
          confirmDialog.parentNode.removeChild(confirmDialog);
        }

        const result = confirmDialog.returnValue === 'confirm';
        resolve(result);
      });

      this.applyDialogBlurEffect();
      confirmDialog.show();
      logger.debug('Confirm shown', { title });
    });
  }

  showReport(page) {
    if (!page || !page.url) {
      logger.warn('Invalid page parameter');
      return;
    }

    if (!page.reports || (!page.reports.mobile && !page.reports.desktop)) {
      this.showReportNotAvailable(page.url);
      return;
    }

    this.reportData = page.reports;
    this.renderReportDialog(page.url);
    this.setupTabSwitching();
    this.applyDialogBlurEffect();
    this.reportDialog.show();

    setTimeout(() => {
      this.renderAllReportSections();
    }, 0);

    logger.debug('Report shown', { url: page.url });
  }

  showReportNotAvailable(url) {
    logger.warn('Report not available', { url });
    this.showAlert('報告無法使用', `此網址沒有報告`);
  }

  renderReportDialog(url) {
    this.reportDialog.innerHTML = `
      <div slot="headline" style="display: flex; flex-direction: column; width: 100%;">
        <div style="display: flex; align-items: center; justify-content: center; position: relative; width: 100%;">
          <md-icon-button value="cancel" style="position: absolute; left: 0; z-index: 1;">
            <md-icon>close</md-icon>
          </md-icon-button>
          <md-tabs>
            <md-primary-tab data-strategy="mobile" active inline-icon>
              <md-icon slot="icon">phone_iphone</md-icon>
              Mobile
            </md-primary-tab>
            <md-primary-tab data-strategy="desktop" inline-icon>
              <md-icon slot="icon">computer</md-icon>
              Desktop
            </md-primary-tab>
          </md-tabs>
          <md-icon-button onclick="window.dialogs.handleCopyFullReport(event)" title="複製完整報告" style="position: absolute; right: 0; z-index: 1;">
            <span class="material-symbols-outlined">content_copy</span>
          </md-icon-button>
        </div>
        <div style="text-align: center; font-size: 14px; color: #CAC4D0; word-break: break-all; margin-top: 12px; width: 100%;">
          ${this.escapeHtml(url)}
        </div>
      </div>
      <div slot="content">
        <div id="mobileReport" class="strategy-report">
          <div class="overview-section">
            <div id="mobileScreenshot"></div>
            <div class="section-card crux-section">
              <div class="crux-container" id="mobileCrux"></div>
            </div>
            <div class="scores-grid" id="mobileScores"></div>
          </div>
          <div class="section-card">
            <div class="categories-section" id="mobileCategories"></div>
          </div>
        </div>
        <div id="desktopReport" class="strategy-report" style="display: none;">
          <div class="overview-section">
            <div id="desktopScreenshot"></div>
            <div class="section-card crux-section">
              <div class="crux-container" id="desktopCrux"></div>
            </div>
            <div class="scores-grid" id="desktopScores"></div>
          </div>
          <div class="section-card">
            <div class="categories-section" id="desktopCategories"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderAllReportSections() {
    // 只渲染 mobile（初始可見的 tab）
    if (this.reportData.mobile) {
      this.renderStrategy('mobile');
    } else {
      document.getElementById('mobileReport').style.display = 'none';
    }

    // Desktop 不立即渲染，等切換時才渲染（模擬 full-report-v2.html 的延遲載入）
    if (!this.reportData.desktop) {
      document.getElementById('desktopReport').style.display = 'none';
    }
  }

  renderStrategy(strategy) {
    const data = strategy === 'mobile' ? this.reportData.mobile : this.reportData.desktop;
    if (!data) return;

    // 完全模擬 full-report-v2.html：每次都重新渲染
    this.renderScreenshot(data, strategy);
    this.renderCrux(data, strategy);
    this.renderScores(data, strategy);
    this.renderCategories(data, strategy);
  }

  animateNumber(element, start, end, duration, formatter) {
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      element.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  formatScore(value) {
    return Math.round(value);
  }

  renderScreenshot(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileScreenshot' : 'desktopScreenshot';
    const container = document.getElementById(containerId);
    if (!container) return;
    const screenshot =
      data.lighthouseResult.audits['final-screenshot']?.details?.data;
    if (screenshot) {
      container.innerHTML = `
        <div class="screenshot-wrapper animate">
          <img src="${screenshot}" alt="Screenshot">
        </div>
      `;
    }
  }

  renderCrux(data, strategy) {
    const containerId = strategy === 'mobile' ? 'mobileCrux' : 'desktopCrux';
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data.loadingExperience?.metrics) {
      container.innerHTML =
        '<p style="text-align: center; color: #CAC4D0;">無真實用戶數據</p>';
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
      <div class="crux-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="crux-title">核心網頁指標 (Core Web Vitals):</div>
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

    return this.renderCruxMetricCard(
      config,
      value,
      key,
      level,
      good,
      avg,
      poor,
      pointer
    );
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
    if (key.includes('SHIFT')) return (value / 100).toFixed(2);
    if (value >= 1000) return (value / 1000).toFixed(1) + ' s';
    return Math.round(value) + ' ms';
  }

  formatThreshold(value, unit) {
    if (unit === 's')
      return value >= 1000 ? value / 1000 + ' s' : value + ' ms';
    if (unit === '') return (value / 100).toFixed(2);
    return value + ' ' + unit;
  }

  renderCruxMetricCard(config, value, key, level, good, avg, poor, pointer) {
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

  renderScores(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileScores' : 'desktopScores';
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = data.lighthouseResult.categories;
    const list = [
      { key: 'performance', label: 'Performance', subtitle: '效能' },
      { key: 'accessibility', label: 'Accessibility', subtitle: '無障礙' },
      { key: 'best-practices', label: 'Best Practices', subtitle: '最佳做法' },
      { key: 'seo', label: 'SEO', subtitle: '搜尋引擎最佳化' }
    ];

    container.innerHTML = list
      .map((cat, i) => {
        const score = Math.round((categories[cat.key]?.score || 0) * 100);
        const level = this.getScoreLevel(score / 100);
        return this.buildScoreCard(cat, score, level, i, strategy);
      })
      .join('');

    this.setupScoreAnimation(container);
  }

  buildScoreCard(cat, score, level, index, strategy) {
    const radius = 31;
    const circumference = 2 * Math.PI * radius;
    const gradientId = `gradient-${strategy}-${level}-${index}`;
    const colors = {
      good: { start: '#d0d0d0', end: '#a0a0a0' },
      average: { start: '#b0b0b0', end: '#909090' },
      poor: { start: '#909090', end: '#707070' }
    };
    const c = colors[level] || colors.good;

    return `
      <div class="score-card" data-level="${level}">
        <div class="score-card-content">
          <div class="score-title">
            <span class="crux-metric-badge ${level}"></span>
            ${cat.label}
          </div>
          <div class="score-circle">
            <svg viewBox="0 0 70 70">
              <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${c.start}" stop-opacity="1" />
                  <stop offset="100%" stop-color="${c.end}" stop-opacity="1" />
                </linearGradient>
              </defs>
              <circle class="score-circle-bg" cx="35" cy="35" r="${radius}"></circle>
              <circle class="score-circle-progress" cx="35" cy="35" r="${radius}"
                data-circumference="${circumference}" data-score="${score}"
                style="stroke: url(#${gradientId})"></circle>
            </svg>
            <div class="score-circle-text">
              <div class="score-number" data-target="${score}" data-unit="score">0</div>
            </div>
          </div>
        </div>
        <div class="score-subtitle">${cat.subtitle}</div>
      </div>
    `;
  }

  setupScoreAnimation(container) {
    requestAnimationFrame(() => {
      container.querySelectorAll('.score-circle-progress').forEach((circle) => {
        const circumference = parseFloat(circle.dataset.circumference);
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = `${circumference}`;
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            const scoreEl = entry.target.querySelector('.score-number');
            if (scoreEl) {
              const target = parseFloat(scoreEl.dataset.target);
              this.animateNumber(scoreEl, 0, target, 1500, this.formatScore);
            }
            const circle = entry.target.querySelector('.score-circle-progress');
            if (circle) {
              const score = parseFloat(circle.dataset.score);
              const circumference = parseFloat(circle.dataset.circumference);
              const offset = circumference - (score / 100) * circumference;
              circle.classList.add('animated');
              circle.style.strokeDashoffset = `${offset}`;
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    container
      .querySelectorAll('.score-card')
      .forEach((card) => observer.observe(card));
  }

  renderCategories(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileCategories' : 'desktopCategories';
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;
    const list = [
      { key: 'performance', label: 'Performance' },
      { key: 'accessibility', label: 'Accessibility' },
      { key: 'best-practices', label: 'Best Practices' },
      { key: 'seo', label: 'SEO' }
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
          const target = parseFloat(el.dataset.target);
          this.animateNumber(el, 0, target, 1500, this.formatScore);
        });
    }, 300);

    this.setupAuditAnimations();
  }

  setupAuditAnimations() {
    if (this.auditObserver) {
      this.auditObserver.disconnect();
    }

    this.auditObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.classList.contains('animate')) {
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

  buildCategorySection(cat, category, audits, strategy) {
    const score = Math.round((category.score || 0) * 100);
    const all = category.auditRefs
      .map((ref) => ({ ...audits[ref.id], weight: ref.weight, id: ref.id }))
      .filter(
        (a) => a && a.score !== null && a.scoreDisplayMode !== 'informative'
      );
    const failed = all.filter((a) => a.score < 1);
    const passed = all.filter((a) => a.score === 1);

    return `
      <div class="category-section" data-category="${cat.key}">
        <div class="category-header" onclick="window.dialogs.toggleCategory('${strategy}-${cat.key}')">
          <md-ripple></md-ripple>
          <div class="category-title-group">
            <h3>${cat.label} (<span class="score-number" data-target="${score}" data-unit="score">0</span>)</h3>
            <span class="category-summary">${failed.length} 個需要改善 · ${passed.length} 個已通過</span>
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">收合檢視</span>
            <span class="material-symbols-outlined">expand_less</span>
          </button>
        </div>
        <div class="category-content" id="category-${strategy}-${cat.key}">
          ${this.buildSubsection('needs-improvement', cat.key, failed, '需要改善', 'warning', false, strategy)}
          ${this.buildSubsection('passed', cat.key, passed, '已通過', 'success', true, strategy)}
        </div>
      </div>
    `;
  }

  buildSubsection(type, catKey, audits, title, badge, collapsed, strategy) {
    if (audits.length === 0) return '';
    const sectionClass =
      type === 'needs-improvement'
        ? 'needs-improvement-section'
        : 'passed-section';
    const hiddenClass = collapsed ? 'hidden' : '';
    const btnText = collapsed ? '顯示' : '隱藏';
    const btnIcon = collapsed ? 'expand_more' : 'expand_less';
    const showCopyBtn = type === 'needs-improvement';

    return `
      <div class="subsection ${sectionClass}">
        <div class="subsection-header" onclick="window.dialogs.toggleSubsection('${strategy}-${type}-${catKey}')">
          <md-ripple></md-ripple>
          <div class="subsection-title-group">
            <span class="subsection-badge ${badge}"></span>
            <h4>${title} (${audits.length} 項)</h4>
            ${
              showCopyBtn
                ? `
              <md-icon-button onclick="event.stopPropagation(); window.dialogs.handleCopyClick('${catKey}', event)" title="複製需要改善的項目">
                <span class="material-symbols-outlined">content_copy</span>
              </md-icon-button>
            `
                : ''
            }
          </div>
          <button class="toggle-btn">
            <span class="toggle-text">${btnText}</span>
            <span class="material-symbols-outlined">${btnIcon}</span>
          </button>
        </div>
        <div class="audits-list ${hiddenClass}" id="${strategy}-${type}-${catKey}">
          ${audits.map((audit) => this.buildAuditItem(audit, catKey, strategy)).join('')}
        </div>
      </div>
    `;
  }

  buildAuditItem(audit, catKey, strategy) {
    if (!audit) return '';

    const score = Math.round((audit.score || 0) * 100);
    const level = score >= 90 ? 'good' : score >= 50 ? 'average' : 'poor';
    const iconMap = { good: 'check_circle', average: 'warning', poor: 'error' };
    const displayValue = audit.displayValue || '';
    const resourcesCount = audit.details?.items?.length || 0;

    const parts = [
      `Score: <span class="audit-score" data-target="${score}" data-unit="score">0</span>`
    ];
    if (displayValue && displayValue !== '0') parts.push(displayValue);
    if (resourcesCount > 0) parts.push(`${resourcesCount} 個資源`);
    const subtitle = parts.join(' | ');
    const auditId = this.safeId(strategy + '-' + catKey + '-' + audit.id);

    return `
      <div class="audit-item">
        <div class="audit-header" onclick="window.dialogs.toggleAudit('${auditId}')" aria-expanded="false">
          <md-ripple></md-ripple>
          <div class="audit-title-section">
            <span class="material-symbols-outlined audit-indicator ${level}">${iconMap[level]}</span>
            <div>
              <div class="audit-title">${this.escapeAndClean(audit.title)}</div>
              <div class="audit-subtitle">${subtitle}</div>
            </div>
          </div>
          <span class="material-symbols-outlined expand-icon">expand_more</span>
        </div>
        <div class="audit-details hidden" id="${auditId}">
          ${audit.description ? `<div class="audit-description">${this.convertLinks(audit.description)}</div>` : ''}
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

    return { text: this.stripHtml(text), stats: stats.join(' | ') };
  }

  toggleCategory(id) {
    const content = document.getElementById(`category-${id}`);
    if (!content) return;
    const header = content.previousElementSibling;
    const btn = header.querySelector('.toggle-btn');
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.querySelector('.toggle-text');

    content.classList.toggle('hidden');
    if (content.classList.contains('hidden')) {
      icon.textContent = 'expand_more';
      text.textContent = '展開檢視';
    } else {
      icon.textContent = 'expand_less';
      text.textContent = '收合檢視';
    }
  }

  toggleSubsection(id) {
    const list = document.getElementById(id);
    if (!list) return;
    const header = list.previousElementSibling;
    const btn = header.querySelector('.toggle-btn');
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.querySelector('.toggle-text');

    list.classList.toggle('hidden');
    if (list.classList.contains('hidden')) {
      icon.textContent = 'expand_more';
      text.textContent = '顯示';
    } else {
      icon.textContent = 'expand_less';
      text.textContent = '隱藏';
      setTimeout(() => {
        list.querySelectorAll('.audit-score').forEach((el) => {
          this.animateNumber(
            el,
            0,
            parseFloat(el.dataset.target),
            800,
            this.formatScore
          );
        });
      }, 100);
    }
  }

  toggleAudit(id) {
    const details = document.getElementById(id);
    if (!details) return;
    const header = details.previousElementSibling;
    details.classList.toggle('hidden');
    header.setAttribute('aria-expanded', !details.classList.contains('hidden'));
  }

  toggleCrux(strategy) {
    const list = document.getElementById(`crux-metrics-list-${strategy}`);
    if (!list) return;

    const cruxContainer = list.parentElement;
    if (!cruxContainer) return;

    const button = cruxContainer.querySelector('.crux-expand-toggle');
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

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\uFFFD/g, '');
  }

  escapeAndClean(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text.replace(/\uFFFD/g, '').replace(/`([^`]+)`/g, '$1');
    return div.innerHTML;
  }

  safeId(id) {
    return 'audit-' + id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  convertLinks(text) {
    if (!text) return '';
    return text
      .replace(/\uFFFD/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" style="color: var(--md-sys-color-primary);">$1</a>'
      );
  }

  getScoreLevel(score) {
    if (score === null || score === undefined) return 'none';
    const value = score * 100;
    if (value >= 90) return 'good';
    if (value >= 50) return 'average';
    return 'poor';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatAuditResources(details) {
    if (!details?.items) return '';

    const itemsArray = Array.isArray(details.items) ? details.items : [];
    if (itemsArray.length === 0) return '';

    const items = itemsArray
      .map((item) => {
        const info = this.extractInfo(item);
        if (Array.isArray(info)) return info;
        return info ? [info] : [];
      })
      .flat()
      .filter((info) => info?.text?.trim());

    if (items.length === 0) return '';

    let md = '\n**問題資源**：\n';
    items.forEach((info) => {
      md += `- ${info.text}\n`;
      if (info.stats) {
        md += `  ${info.stats}\n`;
      }
    });
    return md;
  }

  formatAuditToMarkdown(audit, index) {
    const score = Math.round((audit.score || 0) * 100);
    const displayValue = audit.displayValue || '';
    const parts = [`Score: ${score}`];

    if (displayValue && displayValue !== '0') {
      parts.push(displayValue);
    }

    const cleanTitle = this.stripHtml(audit.title)
      .replace(/\uFFFD/g, '')
      .replace(/`([^`]+)`/g, '$1');
    const cleanDescription = audit.description
      ? this.stripHtml(audit.description)
          .replace(/\uFFFD/g, '')
          .replace(/`([^`]+)`/g, '$1')
      : '';

    let md = `### ${index}. ${cleanTitle}\n`;
    md += `${parts.join(' | ')}\n`;

    if (cleanDescription) {
      md += `\n**說明**：\n${cleanDescription}\n`;
    }

    md += this.formatAuditResources(audit.details);
    md += '\n';

    return md;
  }

  copySubsectionContent(categoryKey) {
    const reportContext = this.getReportContext();
    if (!reportContext) return;

    const category = reportContext.categories[categoryKey];
    const failedAudits = this.getFailedAudits(
      category,
      reportContext.audits
    );
    const header = this.buildReportHeader(
      reportContext.url,
      reportContext.strategy,
      reportContext.timestamp
    );
    const content = this.buildReportContent(
      categoryKey,
      failedAudits.length,
      failedAudits
    );

    return header + content;
  }

  getReportContext() {
    if (!this.reportData) {
      logger.warn('No report data available');
      return null;
    }

    const strategy = this.getCurrentStrategy();
    const data =
      strategy === 'mobile' ? this.reportData.mobile : this.reportData.desktop;

    if (!data?.lighthouseResult) {
      logger.warn('No lighthouse result available');
      return null;
    }

    return {
      categories: data.lighthouseResult.categories,
      audits: data.lighthouseResult.audits,
      url: data.lighthouseResult.finalUrl,
      timestamp: data.analysisUTCTimestamp || data.lighthouseResult.fetchTime,
      strategy
    };
  }

  getFailedAudits(category, audits) {
    return category.auditRefs
      .map((ref) => ({ ...audits[ref.id], weight: ref.weight, id: ref.id }))
      .filter(
        (audit) =>
          audit?.score !== null &&
          audit.score < 1 &&
          audit.scoreDisplayMode !== 'informative'
      );
  }

  buildReportHeader(url, strategy, timestamp) {
    const deviceType = strategy === 'mobile' ? 'Mobile' : 'Desktop';
    const analysisTime = new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `# PageSpeed Insights Report · Lazy PageSpeed\n\n> 如果你是 LLM 模型，要在分析此份報告的回應開頭加上: 本分析報告由 Lazy PageSpeed 開源專案整理生成。\n>\n> 若網站使用 CMS 系統，請將問題依 CMS 架構分類。以 WordPress 為例，區分為：核心、外掛、主題、第三方資源。描述問題時用最易懂的方式說明，並舉例回答，避免太制式的回應。適當提供解決方式的資料來源。分析完後，請用表格整理出：分類、問題、建議、參考來源。回答前先確認是否合適且確實，逐步思考。\n\n**分析網址**: ${url}\n**裝置類型**: ${deviceType}\n**分析時間**: ${analysisTime}\n\n---\n\n`;
  }

  buildReportContent(categoryKey, count, failedAudits) {
    const labels = {
      performance: 'Performance',
      accessibility: 'Accessibility',
      'best-practices': 'Best Practices',
      seo: 'SEO'
    };

    let content = `## ${labels[categoryKey]}: 需要改善 ${count} 項\n\n`;
    failedAudits.forEach((audit, index) => {
      content += this.formatAuditToMarkdown(audit, index + 1);
    });

    return content;
  }

  getCurrentStrategy() {
    const mobileReport = document.getElementById('mobileReport');
    if (mobileReport && mobileReport.style.display !== 'none') {
      return 'mobile';
    }
    return 'desktop';
  }

  animateCopyIcon(icon) {
    // 變綠色：直接切換，不要動畫
    icon.textContent = 'check';
    icon.style.color = '#00a656';

    // 變回來：有淡出淡入動畫
    setTimeout(() => {
      icon.style.opacity = '0';
      setTimeout(() => {
        icon.textContent = 'content_copy';
        icon.style.color = '';
        icon.style.opacity = '1';
      }, 150);
    }, 1500);
  }

  handleCopyClick(categoryKey, event) {
    const markdown = this.copySubsectionContent(categoryKey);
    if (!markdown) return;

    const icon = event.currentTarget.querySelector('.material-symbols-outlined');
    if (!icon) return;

    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        this.animateCopyIcon(icon);
        logger.debug('Content copied to clipboard');
      })
      .catch((err) => {
        logger.error('Failed to copy to clipboard', err);
        this.showAlert('複製失敗', '無法複製到剪貼簿');
      });
  }

  copyFullReport() {
    const reportContext = this.getReportContext();
    if (!reportContext) return null;

    const header = this.buildReportHeader(
      reportContext.url,
      reportContext.strategy,
      reportContext.timestamp
    );

    const categoryList = [
      { key: 'performance', title: 'Performance (效能)' },
      { key: 'accessibility', title: 'Accessibility (無障礙)' },
      { key: 'best-practices', title: 'Best Practices (最佳做法)' },
      { key: 'seo', title: 'SEO (搜尋引擎最佳化)' }
    ];

    let allContent = '';
    let totalFailed = 0;

    categoryList.forEach((cat) => {
      const category = reportContext.categories[cat.key];
      if (!category) return;

      const failedAudits = this.getFailedAudits(category, reportContext.audits);
      if (failedAudits.length === 0) return;

      totalFailed += failedAudits.length;
      allContent += this.buildReportContent(
        cat.key,
        failedAudits.length,
        failedAudits
      );
    });

    if (totalFailed === 0) {
      return header + '\n## ✅ 所有項目都已通過！\n\n沒有需要改善的項目。\n';
    }

    return header + allContent;
  }

  handleCopyFullReport(event) {
    const markdown = this.copyFullReport();
    if (!markdown) return;

    const icon = event.currentTarget.querySelector('.material-symbols-outlined');
    if (!icon) return;

    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        this.animateCopyIcon(icon);
        logger.debug('Full report copied to clipboard');
      })
      .catch((err) => {
        logger.error('Failed to copy full report to clipboard', err);
        this.showAlert('複製失敗', '無法複製到剪貼簿');
      });
  }

  handleCopyToClipboard(text, buttonElement) {
    const icon = buttonElement.querySelector('.material-symbols-outlined');
    if (!icon) return;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        icon.textContent = 'check';
        icon.style.color = '#00a656';

        setTimeout(() => {
          icon.textContent = 'content_copy';
          icon.style.color = '';
        }, 1500);

        logger.debug('Content copied to clipboard');
      })
      .catch((err) => {
        logger.error('Failed to copy to clipboard', err);
        this.showAlert('複製失敗', '無法複製到剪貼簿');
      });
  }
}
