/**
 * Data Engine Module
 * Rules: Single source of truth, emit events on data change, no direct DOM manipulation
 */

import { EVENTS } from './events.js';
import { logger } from '../utils/logger.js';

export class DataEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.pages = new Map();
    this.config = {
      proMode: false,
      strategy: 'mobile',
      apiKey: null
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(updates) {
    Object.assign(this.config, updates);
    logger.debug('Config updated', this.config);
    this.eventBus.emit(EVENTS.DOMAIN.CONFIG_UPDATED, this.getConfig());
  }

  addURL(url) {
    if (this.pages.has(url)) {
      logger.warn('URL already exists', url);
      return false;
    }

    this.pages.set(url, {
      url,
      status: 'pending',
      reports: {
        mobile: null,
        desktop: null
      },
      error: null,
      addedAt: new Date().toISOString()
    });

    logger.debug('URL added', url);
    this.eventBus.emit(EVENTS.DOMAIN.URL_ADDED, { url, status: 'pending' });
    this.emitStatistics();
    return true;
  }

  removeURL(url) {
    if (!this.pages.has(url)) {
      logger.warn('URL not found', url);
      return false;
    }

    this.pages.delete(url);
    logger.debug('URL removed', url);
    this.eventBus.emit(EVENTS.DOMAIN.URL_REMOVED, { url });
    this.emitStatistics();
    return true;
  }

  updateURL(oldUrl, newUrl) {
    if (!this.pages.has(oldUrl)) {
      logger.warn('Old URL not found', oldUrl);
      return false;
    }

    if (oldUrl === newUrl) {
      logger.debug('URL unchanged', oldUrl);
      return true;
    }

    if (this.pages.has(newUrl)) {
      logger.warn('New URL already exists', newUrl);
      return false;
    }

    const pageData = this.pages.get(oldUrl);
    this.pages.delete(oldUrl);

    const updatedPage = {
      ...pageData,
      url: newUrl
    };

    this.pages.set(newUrl, updatedPage);

    logger.debug('URL updated', { oldUrl, newUrl });
    this.eventBus.emit(EVENTS.DOMAIN.URL_UPDATED, {
      oldUrl,
      newUrl,
      page: updatedPage
    });
    this.emitStatistics();
    return true;
  }

  updateURLStatus(url, status, data = {}) {
    const page = this.pages.get(url);
    if (!page) {
      logger.error('URL not found for status update', url);
      return false;
    }

    page.status = status;

    // 如果要清空報告資料（用於重新分析）
    if (data.clearReports) {
      page.reports = { mobile: null, desktop: null };
      page.error = null;
    }

    if (data.strategy && data.report) {
      page.reports[data.strategy] = data.report;
    }

    if (data.reports) {
      page.reports.mobile = data.reports.mobile || null;
      page.reports.desktop = data.reports.desktop || null;
    }

    if (data.reportIds) {
      page.reportIds = data.reportIds;
      logger.debug('Page reportIds saved', { url, reportIds: data.reportIds });
    }

    if (data.error) {
      page.error = data.error;
    }

    logger.debug(`URL status updated: ${status}`, url);

    if (status === 'pending') {
      this.eventBus.emit(EVENTS.DOMAIN.ANALYSIS_RESET, {
        url,
        status: 'pending'
      });
    } else if (status === 'processing') {
      this.eventBus.emit(EVENTS.DOMAIN.ANALYSIS_STARTED, {
        url,
        status: 'processing'
      });
    } else if (status === 'success') {
      this.eventBus.emit(EVENTS.DOMAIN.ANALYSIS_COMPLETED, {
        url,
        status,
        reports: page.reports,
        reportIds: page.reportIds
      });
    } else if (status === 'failed') {
      this.eventBus.emit(EVENTS.DOMAIN.ANALYSIS_FAILED, {
        url,
        status,
        error: data.error
      });
    }

    this.emitStatistics();
    return true;
  }

  clearAll() {
    const count = this.pages.size;
    this.pages.clear();
    logger.debug('All data cleared', { count });
    this.eventBus.emit(EVENTS.DOMAIN.DATA_CLEARED, {});
    this.emitStatistics();
  }

  importData(config, pagesData) {
    this.config = { ...this.config, ...config };
    this.pages.clear();

    pagesData.forEach((pageData) => {
      this.pages.set(pageData.url, pageData);
    });

    logger.debug('Data imported', {
      configKeys: Object.keys(config),
      pagesCount: pagesData.length
    });

    this.eventBus.emit(EVENTS.DOMAIN.CONFIG_UPDATED, this.getConfig());
    this.eventBus.emit(EVENTS.DOMAIN.DATA_IMPORTED, {
      config: this.getConfig(),
      urls: pagesData.map((p) => p.url),
      reports: pagesData
    });
    this.emitStatistics();
  }

  getAllPages() {
    return Array.from(this.pages.values());
  }

  getPage(url) {
    return this.pages.get(url);
  }

  getPendingURLs() {
    return this.getAllPages()
      .filter((p) => p.status === 'pending')
      .map((p) => p.url);
  }

  getStatistics() {
    const pages = this.getAllPages();
    return {
      total: pages.length,
      pending: pages.filter((p) => p.status === 'pending').length,
      analyzing: pages.filter((p) => p.status === 'processing').length,
      completed: pages.filter((p) => p.status === 'success').length,
      failed: pages.filter((p) => p.status === 'failed').length
    };
  }

  emitStatistics() {
    const stats = this.getStatistics();
    this.eventBus.emit(EVENTS.DOMAIN.STATISTICS_UPDATED, stats);
  }
}
