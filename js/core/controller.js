/**
 * Controller Module
 * Rules: Cross-module communication via events, no direct DOM manipulation
 */

import { EVENTS } from './events.js';
import { logger } from '../utils/logger.js';
import { ReportFormatter } from '../utils/report-formatter.js';

export class Controller {
  constructor(
    eventBus,
    dataEngine,
    batchProcessor,
    exportManager,
    sitemapParser,
    shareManager,
    r2Uploader = null
  ) {
    this.eventBus = eventBus;
    this.dataEngine = dataEngine;
    this.batchProcessor = batchProcessor;
    this.exportManager = exportManager;
    this.sitemapParser = sitemapParser;
    this.shareManager = shareManager;
    this.r2Uploader = r2Uploader;
    this.reportFormatter = new ReportFormatter();

    this.state = {
      isProcessing: false,
      hasProcessingURL: false,
      dataSourceValue: ''
    };

    setTimeout(() => {
      this.updateButtonState();
    }, 100);
  }

  setR2Uploader(r2Uploader) {
    this.r2Uploader = r2Uploader;
    logger.info('R2Uploader set');
  }

  setState(key, value) {
    this.state[key] = value;
  }

  calculateButtonState() {
    const { isProcessing, hasProcessingURL, dataSourceValue } = this.state;
    const stats = this.dataEngine.getStatistics();
    const hasTableData = stats.total > 0;
    const hasDataSourceInput = Boolean(dataSourceValue?.trim());
    const hasAnalyzingItem = stats.analyzing > 0;
    const hasPendingItem = stats.pending > 0;

    const showSend = !hasTableData && !isProcessing;
    const showStart = hasTableData && !isProcessing;
    const showStop = isProcessing;

    const canSend = showSend && hasDataSourceInput;
    const canStart = showStart && !hasProcessingURL;

    return {
      isProcessing,
      hasProcessingURL,
      hasTableData,
      hasAnalyzingItem,
      hasPendingItem,
      canStart,
      canSend,
      canStop: isProcessing,
      showSend,
      showStart,
      showStop
    };
  }

  updateButtonState() {
    const buttonState = this.calculateButtonState();
    this.eventBus.emit(EVENTS.UI.UPDATE_BUTTON, {
      action: 'update_action_button',
      ...buttonState
    });
  }

  setupEventListeners() {
    this.eventBus.on(EVENTS.COMMAND.ADD_URL, (data) => this.handleAddURL(data));
    this.eventBus.on(EVENTS.COMMAND.UPDATE_URL, (data) =>
      this.handleUpdateURL(data)
    );
    this.eventBus.on(EVENTS.COMMAND.REMOVE_URL, (data) =>
      this.handleRemoveURL(data)
    );
    this.eventBus.on(EVENTS.COMMAND.REANALYZE_URL, (data) =>
      this.handleReanalyzeURL(data)
    );
    this.eventBus.on(EVENTS.COMMAND.CLEAR_ALL, () => this.handleClearAll());
    this.eventBus.on(EVENTS.COMMAND.START_ANALYSIS, () =>
      this.handleStartAnalysis()
    );
    this.eventBus.on(EVENTS.COMMAND.STOP_ANALYSIS, () =>
      this.handleStopAnalysis()
    );
    this.eventBus.on(EVENTS.COMMAND.EXPORT_DATA, () => this.handleExportData());
    this.eventBus.on(EVENTS.COMMAND.IMPORT_DATA, (data) =>
      this.handleImportData(data)
    );
    this.eventBus.on(EVENTS.COMMAND.PARSE_SITEMAP, (data) =>
      this.handleParseSitemap(data)
    );
    this.eventBus.on(EVENTS.COMMAND.OPEN_REPORT, (data) =>
      this.handleOpenReport(data)
    );
    this.eventBus.on(EVENTS.COMMAND.DOWNLOAD_REPORT, (data) =>
      this.handleDownloadReport(data)
    );
    this.eventBus.on(EVENTS.COMMAND.TOGGLE_PRO_MODE, () =>
      this.handleToggleProMode()
    );
    this.eventBus.on(EVENTS.COMMAND.CREATE_SHARE, () =>
      this.handleCreateShare()
    );
    this.eventBus.on(EVENTS.UI.EDIT_URL_REQUESTED, (data) =>
      this.handleEditUrlRequest(data)
    );
    this.eventBus.on(EVENTS.DOMAIN.ANALYSIS_COMPLETED, (data) =>
      this.handleAnalysisCompleted(data)
    );
    this.eventBus.on(EVENTS.DOMAIN.STATISTICS_UPDATED, () =>
      this.updateButtonState()
    );
    this.eventBus.on(EVENTS.PROCESS.BATCH_STARTED, () => {
      this.setState('isProcessing', true);
      this.setState('hasProcessingURL', false);
      this.updateButtonState();
    });
    this.eventBus.on(EVENTS.PROCESS.BATCH_COMPLETED, () => {
      this.setState('isProcessing', false);
      this.setState('hasProcessingURL', false);
      this.updateButtonState();
    });
    this.eventBus.on(EVENTS.PROCESS.BATCH_ABORTED, () => {
      this.setState('isProcessing', false);
      this.setState('hasProcessingURL', false);
      this.updateButtonState();
    });
    this.eventBus.on(EVENTS.PROCESS.BATCH_PAUSED, () => {
      this.setState('isProcessing', false);
      this.setState('hasProcessingURL', true);
      this.updateButtonState();
    });
  }

  handleAddURL(data) {
    if (!data || typeof data !== 'object') {
      logger.warn('ADD_URL: invalid data payload');
      return;
    }

    const { url } = data;
    if (!url || typeof url !== 'string') {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '輸入無效',
        message: '請提供有效的網址'
      });
      return;
    }

    const trimmedURL = url.trim();
    if (!this.isValidURL(trimmedURL)) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '網址無效',
        message: '請輸入有效的網址格式'
      });
      return;
    }

    const success = this.dataEngine.addURL(trimmedURL);
    if (!success) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '網址重複',
        message: '此網址已存在'
      });
    }
  }

  handleRemoveURL(data) {
    if (!data || typeof data !== 'object' || !data.url) {
      logger.warn('REMOVE_URL: invalid data payload');
      return;
    }

    this.dataEngine.removeURL(data.url);
  }

  handleUpdateURL(data) {
    this.dataEngine.updateURL(data.oldUrl, data.newUrl);
  }

  handleEditUrlRequest({ url }) {
    const page = this.dataEngine.getPage(url);
    if (!page) {
      logger.warn('Page not found for edit', { url });
      return;
    }
    this.eventBus.emit(EVENTS.UI.DIALOG_OPENED, {
      dialogId: 'addUrlDialog',
      data: { mode: 'edit', url }
    });
  }

  handleReanalyzeURL(data) {
    if (!data?.url) {
      logger.warn('REANALYZE_URL: missing URL parameter');
      return;
    }

    const { url } = data;
    const page = this.dataEngine.getPage(url);

    if (!page) {
      logger.warn('REANALYZE_URL: URL not found', url);
      return;
    }

    const config = this.dataEngine.getConfig();

    if (!config.proMode) {
      const allPages = this.dataEngine.getAllPages();
      const urlIndex = allPages.findIndex((p) => p.url === url);

      if (urlIndex >= 3) {
        this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
          title: 'URL 超過上限',
          message:
            '分析超過 3 組網址需切換 Pro Mode ( 使用 Google PageSpeed API Key )'
        });
        return;
      }
    }

    if (config.proMode && !config.apiKey) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '需要 API 金鑰',
        message: 'Pro Mode 需要提供您自己的 Google PageSpeed API'
      });
      return;
    }

    this.dataEngine.updateURLStatus(url, 'pending');

    if (this.batchProcessor) {
      this.batchProcessor.start(config, [url]);
    } else {
      logger.warn('BatchProcessor not available');
    }

    logger.info('Re-analysis started for URL', { url });
  }

  handleClearAll() {
    const stats = this.dataEngine.getStatistics();
    if (stats.total === 0) {
      return;
    }

    this.dataEngine.clearAll();
  }

  handleToggleProMode() {
    const config = this.dataEngine.getConfig();
    this.dataEngine.updateConfig({ proMode: !config.proMode });
  }

  handleToggleStrategy(data) {
    if (!data?.strategy) {
      logger.warn('TOGGLE_STRATEGY: missing strategy parameter');
      return;
    }

    const strategy = data.strategy;
    if (strategy !== 'mobile' && strategy !== 'desktop') {
      logger.warn('TOGGLE_STRATEGY: invalid strategy value', strategy);
      return;
    }

    this.dataEngine.updateConfig({ strategy });
  }

  handleUpdateAPIKey(data) {
    if (!data || typeof data !== 'object') {
      logger.warn('UPDATE_API_KEY: invalid data payload');
      return;
    }

    const { apiKey } = data;
    this.dataEngine.updateConfig({ apiKey });
  }

  handleStartAnalysis() {
    const config = this.dataEngine.getConfig();
    const allPages = this.dataEngine.getAllPages();

    if (allPages.length === 0) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '沒有網址',
        message: '請先加入要分析的網址'
      });
      return;
    }

    if (!config.proMode && allPages.length > 3) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: 'URL 超過上限',
        message:
          '分析超過 3 組網址需切換 Pro Mode ( 使用 Google PageSpeed API Key )'
      });
      return;
    }

    const urlsToAnalyze = allPages
      .filter((page) => page.status === 'pending' || page.status === 'failed')
      .map((page) => page.url);

    if (urlsToAnalyze.length === 0) {
      // 檢查是否有已完成的網址
      const successPages = allPages.filter((page) => page.status === 'success');

      if (successPages.length > 0) {
        // 有已完成的網址，詢問是否重新分析
        this.eventBus.emit(EVENTS.UI.CONFIRM_REQUESTED, {
          title: '重新分析',
          message: '全部都分析完了，要重新分析嗎？',
          icon: 'analytics',
          onConfirm: () => {
            // 將所有 success 狀態重設為 pending，並清空舊報告資料
            successPages.forEach((page) => {
              this.dataEngine.updateURLStatus(page.url, 'pending', {
                clearReports: true
              });
            });

            // 重新開始分析
            const urls = successPages.map((p) => p.url);
            if (this.batchProcessor) {
              this.batchProcessor.start(config, urls);
            }
          }
        });
      } else {
        // 沒有任何網址
        this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
          title: '沒有網址',
          message: '請先添加要分析的網址'
        });
      }
      return;
    }

    if (config.proMode && !config.apiKey) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '需要 API 金鑰',
        message: 'Pro Mode 需要提供您自己的 Google PageSpeed API'
      });
      return;
    }

    if (this.batchProcessor) {
      this.batchProcessor.start(config, urlsToAnalyze);
    } else {
      logger.warn('BatchProcessor not available');
    }
  }

  handleStopAnalysis() {
    if (this.batchProcessor) {
      this.batchProcessor.stopBatch();
    }
  }

  handleExportData() {
    if (!this.exportManager) {
      logger.error('ExportManager not available');
      return;
    }

    const exportData = this.exportManager.exportToJSON();
    const dataStr = JSON.stringify(exportData, null, 2);
    const filename = `pagespeed-reports-${new Date().toISOString().split('T')[0]}.json`;

    this.eventBus.emit(EVENTS.SYSTEM.DOWNLOAD_REQUESTED, {
      filename,
      data: dataStr,
      type: 'application/json'
    });

    logger.debug('Export data prepared', { filename });
  }

  async handleImportData(data) {
    if (!data?.jsonData) {
      logger.warn('IMPORT_DATA: invalid data payload');
      return;
    }

    if (!this.exportManager) {
      logger.error('ExportManager not available');
      return;
    }

    const result = await this.exportManager.importFromJSON(data.jsonData);
    logger.debug('Import successful', result);

    const config = this.dataEngine.getConfig();

    if (config.shareReportUpload && config.r2Config) {
      this.testR2InBackground(config.r2Config);
    }
  }

  async testR2InBackground(r2Config) {
    logger.info('Testing R2 connection', {
      accountId: r2Config.accountId?.substring(0, 8),
      bucketName: r2Config.bucketName
    });

    const { R2Uploader } = await import('../modules/r2-uploader.js');
    const uploader = new R2Uploader(r2Config);
    const result = await uploader.testConnection();

    if (result.success) {
      this.setR2Uploader(uploader);
      logger.info('R2 connection test succeeded');
      return;
    }

    logger.error('R2 connection test failed', { error: result.error });

    let errorDetail = '';
    if (result.error?.includes('NetworkError')) {
      errorDetail = '網路錯誤，請檢查 CORS 設定';
    } else if (result.error?.includes('403') || result.error?.includes('401')) {
      errorDetail = '憑證錯誤，請檢查 Access Key';
    } else if (result.error?.includes('404')) {
      errorDetail = 'Bucket 不存在';
    } else if (result.error) {
      errorDetail = result.error;
    }

    logger.warn('R2 upload disabled due to connection failure', { errorDetail });
  }

  async handleParseSitemap(data) {
    if (!data || typeof data !== 'object' || !data.url) {
      logger.warn('PARSE_SITEMAP: invalid data payload');
      return;
    }

    const sitemapUrl = data.url.trim();
    logger.debug('PARSE_SITEMAP requested', sitemapUrl);

    this.setState('isProcessing', true);
    this.updateButtonState();
    this.eventBus.emit(EVENTS.SYSTEM.PARSING_STARTED);

    try {
      const urls = await this.sitemapParser.parse(sitemapUrl);
      const config = this.dataEngine.getConfig();
      const stats = this.dataEngine.getStatistics();

      let added = 0;
      let skipped = 0;

      urls.forEach((url) => {
        if (!config.proMode && stats.total + added >= 3) {
          skipped++;
          return;
        }

        const success = this.dataEngine.addURL(url);
        if (success) {
          added++;
        } else {
          skipped++;
        }
      });

      let message;
      if (!config.proMode && stats.total + added >= 3) {
        message = `已加入 ${added} 個網址，${skipped} 個超過上限（非 Pro Mode 限制 3 個）`;
      } else {
        const duplicateText = skipped > 0 ? `，跳過 ${skipped} 個重複` : '';
        message = `已加入 ${added} 個網址${duplicateText}`;
      }

      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: 'Sitemap 解析完成',
        message
      });
    } catch (error) {
      logger.error('Failed to parse sitemap', error);
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: 'Sitemap 解析失敗',
        message: error.message || 'Sitemap 解析失敗'
      });
    } finally {
      this.eventBus.emit(EVENTS.SYSTEM.PARSING_ENDED);
      this.setState('isProcessing', false);
      this.updateButtonState();
    }
  }

  handleOpenReport(data) {
    if (!data || typeof data !== 'object' || !data.url) {
      logger.warn('OPEN_REPORT: invalid data payload');
      return;
    }

    const page = this.dataEngine.getPage(data.url);
    if (!page) {
      logger.warn('Page not found', data.url);
      return;
    }

    this.eventBus.emit(EVENTS.UI.DIALOG_OPENED, {
      dialogId: 'reportDialog',
      data: page
    });
  }

  handleDownloadReport(data) {
    if (!data || typeof data !== 'object' || !data.url) {
      logger.warn('DOWNLOAD_REPORT: invalid data payload');
      return;
    }

    const page = this.dataEngine.getPage(data.url);
    if (!page) {
      logger.warn('Page not found for download', data.url);
      return;
    }

    if (!page.reports || (!page.reports.mobile && !page.reports.desktop)) {
      logger.warn('No reports available for download', data.url);
      return;
    }

    const markdown = this.reportFormatter.formatFullReport(page);
    const urlObj = new URL(page.url);
    const hostname = urlObj.hostname.replace(/\./g, '-');
    const filename = `lazy-pagespeed-report-${hostname}-${new Date().toISOString().split('T')[0]}.md`;

    this.eventBus.emit(EVENTS.SYSTEM.DOWNLOAD_REQUESTED, {
      filename,
      data: markdown,
      type: 'text/markdown'
    });

    logger.debug('Report download prepared', { url: page.url, filename });
  }

  isValidURL(url) {
    try {
      const parsed = new URL(url);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '[::1]'
      ) {
        return false;
      }

      const privateIPv4Patterns = [
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./
      ];

      if (privateIPv4Patterns.some((pattern) => pattern.test(hostname))) {
        return false;
      }

      const privateIPv6Patterns = [
        /^fc00:/i,
        /^fd00:/i,
        /^\[?fc00:/i,
        /^\[?fd00:/i
      ];

      return !privateIPv6Patterns.some((pattern) => pattern.test(hostname));
    } catch {
      return false;
    }
  }

  async handleAnalysisCompleted(data) {
    if (!data?.url || !data?.reports) {
      logger.warn('ANALYSIS_COMPLETED: invalid data payload');
      return;
    }

    logger.debug('Analysis completed', { url: data.url });

    const config = this.dataEngine.getConfig();

    if (config.proMode && config.shareReportUpload && this.r2Uploader) {
      await this._uploadToUserR2(data.url, data.reports);
    } else if (!config.proMode && data.reportIds) {
      this._saveReportIdsForBasicMode(data.url, data.reportIds);
    }
  }

  async _uploadToUserR2(url, reports) {
    logger.info('Starting R2 upload', { url });

    const reportId = await this.r2Uploader.calculateReportId(reports);
    const presignedUrl = await this.r2Uploader.uploadReport(
      url,
      reportId,
      reports
    );

    this.shareManager.setReportUrl(url, presignedUrl);
    logger.info('Report uploaded to user R2', {
      url,
      reportId: reportId.substring(0, 8)
    });
  }

  _saveReportIdsForBasicMode(url, reportIds) {
    this.shareManager.setReportIds(url, reportIds);

    logger.debug('Report IDs saved for sharing', {
      url,
      mobile: reportIds.mobile?.substring(0, 8),
      desktop: reportIds.desktop?.substring(0, 8)
    });
  }

  async calculateReportId(reportData) {
    const jsonString = JSON.stringify(reportData);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex.substring(0, 16);
  }

  async handleCreateShare() {
    if (!this.shareManager) {
      logger.error('ShareManager not available');
      return;
    }

    const pages = this.dataEngine.getAllPages();
    const urls = pages.map((p) => p.url);
    const config = this.dataEngine.getConfig();

    const result = await this.shareManager.handleShare(urls, config);

    if (result) {
      this.eventBus.emit(EVENTS.UI.DIALOG_OPENED, {
        dialogId: 'shareSuccessDialog',
        data: result
      });
    }
  }
}
