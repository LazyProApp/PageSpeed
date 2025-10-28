/**
 * Report Dialog Module
 * Rules: Main controller for Report Dialog, coordinates all renderers
 */

import { logger } from '../../utils/logger.js';
import { ReportFormatter } from '../../utils/report-formatter.js';
import { escapeHtml } from './report-utils.js';

import { renderFinalScreenshot, renderScreenshotThumbnails } from './screenshot-renderer.js';
import { ScoresRenderer } from './scores-renderer.js';
import { MetricsRenderer } from './metrics-renderer.js';
import { CruxRenderer } from './crux-renderer.js';
import { CategoriesRenderer } from './categories-renderer.js';
import { CopyHandler } from './copy-handler.js';

export class ReportDialog {
  constructor(dialogElement) {
    this.dialog = dialogElement;
    this.reportData = null;
    this.reportFormatter = new ReportFormatter();
    this.renderedStrategies = new Set();

    this.animateNumber = this.animateNumber.bind(this);

    this.scoresRenderer = new ScoresRenderer(this.animateNumber);
    this.metricsRenderer = new MetricsRenderer();
    this.metricsRenderer.animateNumber = this.animateNumber;
    this.cruxRenderer = new CruxRenderer(this.animateNumber);
    this.categoriesRenderer = new CategoriesRenderer(this.animateNumber);
    this.copyHandler = new CopyHandler(
      this.reportFormatter,
      () => this.reportData
    );

    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    if (!window.dialogs) window.dialogs = {};

    window.dialogs.toggleCategory = this.toggleCategory.bind(this);
    window.dialogs.toggleSubsection = this.toggleSubsection.bind(this);
    window.dialogs.toggleAudit = this.toggleAudit.bind(this);
    window.dialogs.toggleCrux = this.toggleCrux.bind(this);
    window.dialogs.toggleMetrics = this.metricsRenderer.toggleMetrics.bind(this.metricsRenderer);
    window.dialogs.toggleInsightsSubsection = this.categoriesRenderer.toggleInsightsSubsection.bind(this.categoriesRenderer);
    window.dialogs.handleCopyClick = this.copyHandler.handleCopyClick.bind(this.copyHandler);
    window.dialogs.handleCopyFullReport = this.copyHandler.handleCopyFullReport.bind(this.copyHandler);
  }

  showReport(page) {
    if (!page?.url) {
      logger.warn('Invalid page parameter');
      return;
    }

    if (!page.reports || (!page.reports.mobile && !page.reports.desktop)) {
      logger.warn('Report not available', { url: page.url });
      return;
    }

    this.reportData = page.reports;
    this.renderedStrategies.clear();
    this.renderReportDialog(page.url);
    this.setupTabSwitching();
    this.dialog.show();

    setTimeout(() => {
      this.renderAllReportSections();
    }, 0);

    logger.debug('Report shown', { url: page.url });
  }

  renderReportDialog(url) {
    this.dialog.innerHTML = `
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
          ${escapeHtml(url)}
        </div>
      </div>
      <div slot="content">
        <div id="mobileReport" class="strategy-report">
          <div class="overview-section">
            <div id="mobileFinalScreenshot"></div>
            <div class="section-card crux-section" style="display: none;">
              <div class="crux-container" id="mobileCrux"></div>
            </div>
            <div class="scores-grid" id="mobileScores" style="display: none;"></div>
          </div>
          <div class="section-card crux-section" style="display: none;">
            <div class="metrics-container" id="mobileMetrics"></div>
          </div>
          <div class="section-card screenshot-section" style="display: none;">
            <div id="mobileScreenshotThumbnails"></div>
          </div>
          <div class="section-card" style="display: none;">
            <div class="categories-section" id="mobileCategories"></div>
          </div>
        </div>
        <div id="desktopReport" class="strategy-report" style="display: none;">
          <div class="overview-section">
            <div id="desktopFinalScreenshot"></div>
            <div class="section-card crux-section" style="display: none;">
              <div class="crux-container" id="desktopCrux"></div>
            </div>
            <div class="scores-grid" id="desktopScores" style="display: none;"></div>
          </div>
          <div class="section-card crux-section" style="display: none;">
            <div class="metrics-container" id="desktopMetrics"></div>
          </div>
          <div class="section-card screenshot-section" style="display: none;">
            <div id="desktopScreenshotThumbnails"></div>
          </div>
          <div class="section-card" style="display: none;">
            <div class="categories-section" id="desktopCategories"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderAllReportSections() {
    if (this.reportData.mobile) {
      this.renderStrategy('mobile');
    } else {
      document.getElementById('mobileReport').style.display = 'none';
    }

    if (!this.reportData.desktop) {
      document.getElementById('desktopReport').style.display = 'none';
    }
  }

  renderStrategy(strategy) {
    const data =
      strategy === 'mobile' ? this.reportData.mobile : this.reportData.desktop;
    if (!data) return;

    if (this.renderedStrategies.has(strategy)) {
      this.replayAnimations(strategy);
      return;
    }

    this.renderedStrategies.add(strategy);
    renderFinalScreenshot(data, strategy);
    this.cruxRenderer.renderCrux(data, strategy);
    this.scoresRenderer.renderScores(data, strategy);
    this.metricsRenderer.renderMetrics(data, strategy);
    renderScreenshotThumbnails(data, strategy);
    this.categoriesRenderer.renderCategories(data, strategy);
  }

  replayAnimations(strategy) {
    const data =
      strategy === 'mobile' ? this.reportData.mobile : this.reportData.desktop;
    if (!data) return;

    this.scoresRenderer.replayAnimations(data, strategy);
    this.metricsRenderer.replayAnimations(data, strategy);
    this.cruxRenderer.replayAnimations(data, strategy);
  }

  setupTabSwitching() {
    const tabs = this.dialog.querySelector('md-tabs');
    if (!tabs) return;

    tabs.addEventListener('change', (event) => {
      const activeTab = event.target.activeTab;
      const strategy = activeTab?.dataset?.strategy;
      if (strategy) {
        this.switchStrategy(strategy);
      }
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

  toggleCategory(id) {
    const content = document.getElementById(`category-${id}`);
    if (!content) return;

    const section = content.parentElement;
    const header = section.querySelector('.category-header');
    const toggleBtn = header.querySelector('.toggle-btn');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    const toggleIcon = toggleBtn.querySelector('.material-symbols-outlined');

    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      toggleText.textContent = '收合檢視';
      toggleIcon.textContent = 'expand_less';
    } else {
      content.classList.add('hidden');
      toggleText.textContent = '展開檢視';
      toggleIcon.textContent = 'expand_more';
    }
  }

  toggleSubsection(id) {
    const content = document.getElementById(id);
    if (!content) return;

    const header = content.previousElementSibling;
    const toggleBtn = header.querySelector('.toggle-btn');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    const toggleIcon = toggleBtn.querySelector('.material-symbols-outlined');

    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      toggleText.textContent = '隱藏';
      toggleIcon.textContent = 'expand_less';
    } else {
      content.classList.add('hidden');
      toggleText.textContent = '顯示';
      toggleIcon.textContent = 'expand_more';
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
