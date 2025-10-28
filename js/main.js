/**
 * Main Entry Point
 * Rules: Initialize app, load all modules, setup event listeners
 */

import { config } from './core/config.js';
import { EventBus } from './core/event-bus.js';
import { DataEngine } from './core/data-engine.js';
import { Controller } from './core/controller.js';
import { BatchProcessor } from './core/batch-processor.js';
import { ExportManager } from './core/export-manager.js';
import { ShareManager } from './core/share-manager.js';
import { PageSpeedAPI } from './modules/pagespeed.js';
import { SitemapParser } from './modules/sitemap.js';
import { Statistics } from './ui/statistics.js';
import { Table } from './ui/table.js';
import { Dialogs } from './ui/dialogs.js';
import { UIHandlers } from './ui/handlers.js';
import { logger } from './utils/logger.js';

class App {
  constructor() {
    this.modules = {};
    this.isInitialized = false;
  }

  async init() {
    try {
      logger.info('Initializing Lazy Page Insights...');

      // Core Layer
      this.modules.eventBus = new EventBus();
      this.modules.dataEngine = new DataEngine(this.modules.eventBus);

      // Platform Adapters
      this.modules.pageSpeedAPI = new PageSpeedAPI();
      this.modules.sitemapParser = new SitemapParser();

      // Core Services
      this.modules.exportManager = new ExportManager(
        this.modules.dataEngine,
        this.modules.sitemapParser
      );

      this.modules.shareManager = new ShareManager(
        this.modules.eventBus,
        config
      );

      this.modules.batchProcessor = new BatchProcessor(
        this.modules.eventBus,
        this.modules.dataEngine,
        this.modules.pageSpeedAPI
      );

      this.modules.controller = new Controller(
        this.modules.eventBus,
        this.modules.dataEngine,
        this.modules.batchProcessor,
        this.modules.exportManager,
        this.modules.sitemapParser,
        this.modules.shareManager
      );

      // UI Layer
      this.modules.statistics = new Statistics(this.modules.eventBus);
      this.modules.table = new Table(
        this.modules.eventBus,
        this.modules.dataEngine
      );
      this.modules.dialogs = new Dialogs(
        this.modules.eventBus,
        this.modules.dataEngine
      );
      this.modules.uiHandlers = new UIHandlers(
        this.modules.eventBus,
        this.modules.dialogs
      );

      // Setup Event Listeners
      this.modules.controller.setupEventListeners();
      this.modules.statistics.setupEventListeners();
      this.modules.table.setupEventListeners();
      this.modules.dialogs.setupEventListeners();
      this.modules.uiHandlers.setupEventListeners();

      this.isInitialized = true;
      logger.info('App initialized successfully');

      // Check for share parameter
      await this.checkShareParameter();

      // Remove initial loader
      this.removeInitialLoader();
    } catch (error) {
      logger.error('Failed to initialize app', error);
      this.showInitError(error);
    }
  }

  async checkShareParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    let shareId = urlParams.get('share');

    if (!shareId) return;

    shareId = shareId.split('?')[0].split('&')[0];
    logger.info('Loading share', { shareId });

    const response = await fetch(
      `${config.api.workersUrl}/share?id=${shareId}`
    );

    if (!response.ok) {
      logger.error('Failed to load share', { shareId, status: response.status });
      return;
    }

    const shareData = await response.json();

    logger.info('Share data received', {
      urlsCount: shareData.urls?.length || 0,
      reportsCount: Object.keys(shareData.reports || {}).length
    });

    this.modules.dataEngine.clearAll();
    this.modules.shareManager.clear();

    for (const url of shareData.urls) {
      this.modules.dataEngine.addURL(url);
    }

    await this._loadShareReports(shareData);
    this._loadShareReportIds(shareData);
    this.modules.shareManager.setOldShareId(shareId);

    logger.info('Share loaded successfully', { urls: shareData.urls.length });
  }

  async _loadShareReports(shareData) {
    for (const url of shareData.urls) {
      const reportData = shareData.reports[url];

      if (!reportData) continue;

      const reports = await this._fetchReportByType(url, reportData);

      if (reports) {
        this._updateReportsToEngine(url, reports);
      }
    }
  }

  async _fetchReportByType(url, reportData) {
    if (reportData.type === 'presigned_url') {
      return await this._fetchPresignedReport(url, reportData.url);
    }

    if (reportData.type === 'embedded') {
      logger.info('Loading embedded report', { url });
      return reportData.data;
    }

    logger.error('Unknown report type', { url, type: reportData.type });
    return null;
  }

  async _fetchPresignedReport(url, presignedUrl) {
    logger.info('Loading from presigned URL', { url, presignedUrl });

    const response = await fetch(presignedUrl);

    if (!response.ok) {
      logger.error('Presigned URL fetch failed', { url, status: response.status });
      return null;
    }

    if (typeof DecompressionStream === 'undefined' || !response.body) {
      logger.warn('DecompressionStream not supported, using fallback');
      const arrayBuffer = await response.arrayBuffer();
      const decompressed = await this._decompressGzipFallback(arrayBuffer);
      return JSON.parse(decompressed);
    }

    const decompressed = response.body.pipeThrough(
      new DecompressionStream('gzip')
    );
    const reportJson = await new Response(decompressed).text();
    const reports = JSON.parse(reportJson);

    logger.info('Presigned URL loaded successfully', { url });
    return reports;
  }

  async _decompressGzipFallback(arrayBuffer) {
    if (typeof pako !== 'undefined') {
      const uint8Array = new Uint8Array(arrayBuffer);
      const decompressed = pako.ungzip(uint8Array, { to: 'string' });
      return decompressed;
    }

    logger.error('DecompressionStream not supported and no fallback available');
    return null;
  }

  _updateReportsToEngine(url, reports) {
    if (reports.mobile) {
      this.modules.dataEngine.updateURLStatus(url, 'success', {
        strategy: 'mobile',
        report: reports.mobile
      });
    }

    if (reports.desktop) {
      this.modules.dataEngine.updateURLStatus(url, 'success', {
        strategy: 'desktop',
        report: reports.desktop
      });
    }
  }

  _loadShareReportIds(shareData) {
    const reportIds = {};

    for (const [url, reportData] of Object.entries(shareData.reports || {})) {
      if (reportData.type === 'presigned_url') {
        reportIds[url] = { type: 'url', value: reportData.url };
      } else if (reportData.type === 'embedded') {
        reportIds[url] = { type: 'embedded' };
      }
    }

    this.modules.shareManager.loadFromShare({ reportIds });

    logger.info('Share report IDs loaded', {
      count: Object.keys(reportIds).length
    });
  }

  removeInitialLoader() {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.style.display = 'none';
          document.body.classList.remove('loading');
        }, 300);
      }, 500);
    }
  }

  showInitError(error) {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.innerHTML = `
        <div style="text-align: center; color: #ef4444;">
          <h2 style="margin-bottom: 1rem;">Initialization Failed</h2>
          <p>${error.message}</p>
          <button
            onclick="location.reload()"
            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            Reload
          </button>
        </div>
      `;
    }
  }

  destroy() {
    if (!this.isInitialized) return;

    logger.info('Destroying app...');

    if (this.modules.uiHandlers) this.modules.uiHandlers.destroy();
    if (this.modules.dialogs) this.modules.dialogs.destroy();
    if (this.modules.table) this.modules.table.destroy();
    if (this.modules.statistics) this.modules.statistics.destroy();
    if (this.modules.controller) this.modules.controller.destroy();
    if (this.modules.batchProcessor) this.modules.batchProcessor.destroy();

    this.modules = {};
    this.isInitialized = false;

    logger.info('App destroyed');
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason
  });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
  });
} else {
  window.app = new App();
  window.app.init();
}

export { App };
