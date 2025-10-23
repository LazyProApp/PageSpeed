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
    const shareId = urlParams.get('share');

    if (shareId) {
      logger.info('Loading share', { shareId });

      try {
        const response = await fetch(
          `${config.api.workersUrl}/share?id=${shareId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load share: ${response.status}`);
        }

        const shareData = await response.json();

        // Clear existing data before loading share
        this.modules.dataEngine.clearAll();
        this.modules.shareManager.clear();

        // Load URLs into data engine
        for (const url of shareData.urls) {
          this.modules.dataEngine.addURL(url);
        }

        // Load reports (按照 URLs 順序，不是 reports 的順序)
        for (const url of shareData.urls) {
          const reports = shareData.reports[url];
          if (!reports) continue;

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

        // Load report IDs into shareManager
        const reportIds = {};
        for (const [url, reports] of Object.entries(shareData.reports)) {
          // Calculate hash from reports (simplified)
          const hash = await this.modules.shareManager.hashReport(reports);
          reportIds[url] = hash;
        }
        this.modules.shareManager.loadFromShare({ reportIds });

        logger.info('Share loaded successfully', {
          urls: shareData.urls.length
        });
      } catch (error) {
        logger.error('Failed to load share', error);
        this.modules.eventBus.emit('SYSTEM.ALERT_REQUESTED', {
          message: `載入分享失敗: ${error.message}`
        });
      }
    }
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

    // Destroy UI modules first
    if (this.modules.uiHandlers) this.modules.uiHandlers.destroy();
    if (this.modules.dialogs) this.modules.dialogs.destroy();
    if (this.modules.table) this.modules.table.destroy();
    if (this.modules.statistics) this.modules.statistics.destroy();

    // Destroy core modules
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

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason
  });
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
  });
} else {
  window.app = new App();
  window.app.init();
}

// Export for debugging
export { App };
