/**
 * Export Manager Module
 * Rules: Handle JSON export/import, data format validation
 */

import { logger } from '../utils/logger.js';

export class ExportManager {
  constructor(dataEngine, sitemapParser = null) {
    this.dataEngine = dataEngine;
    this.sitemapParser = sitemapParser;
  }

  exportToJSON() {
    const config = this.dataEngine.getConfig();
    const pages = this.dataEngine.getAllPages();

    const reports = {};
    pages.forEach((page) => {
      if (page.reports && (page.reports.mobile || page.reports.desktop)) {
        reports[page.url] = {
          mobile: page.reports.mobile,
          desktop: page.reports.desktop
        };
      }
    });

    const exportData = {
      urls: pages.map((page) => page.url),
      reports
    };

    if (config.r2Config) {
      exportData.share_report = {
        upload: config.shareReportUpload || false,
        r2: {
          accountId: config.r2Config.accountId || '',
          bucketName: config.r2Config.bucketName || '',
          autoDelete: config.r2Config.autoDelete ?? true,
          deleteDays: config.r2Config.deleteDays || 7,
          shareExpireDays: config.r2Config.shareExpireDays || 7
        }
      };
    }

    logger.debug('Export data prepared', {
      urlsCount: exportData.urls.length,
      reportsCount: Object.keys(reports).length,
      hasShareConfig: !!exportData.share_report
    });

    return exportData;
  }

  async importFromJSON(jsonData) {
    const hasUrls =
      jsonData?.urls && Array.isArray(jsonData.urls) && jsonData.urls.length > 0;
    const hasCredentials =
      jsonData?.credentials?.api_key || jsonData?.share_report?.r2;

    if (!hasUrls && !hasCredentials) {
      logger.error('Import validation failed: no URLs or credentials');
      const error = new Error('JSON 檔案必須包含網址或憑證');
      error.code = 'ERR_IMPORT_001';
      error.retriable = false;
      error.timestamp = Date.now();
      throw error;
    }

    const config = this._parseConfig(jsonData);

    if (!hasUrls) {
      logger.info('Config-only import');
      this.dataEngine.updateConfig(config);
      return {
        imported: 0,
        configOnly: true,
        config
      };
    }

    const reports = jsonData.reports || {};
    const resolvedUrls = await this._resolveUrls(jsonData.urls);

    if (resolvedUrls.length === 0) {
      logger.error('Import validation failed: no valid URLs');
      const error = new Error('匯入的資料中沒有可用的網址');
      error.code = 'ERR_IMPORT_002';
      error.retriable = false;
      error.timestamp = Date.now();
      throw error;
    }

    const pagesData = this._buildPagesData(resolvedUrls, reports);

    logger.debug('Import data validated', {
      pagesCount: pagesData.length,
      reportsCount: Object.keys(reports).length,
      hasApiKey: !!config.apiKey
    });

    this.dataEngine.importData(config, pagesData);

    return {
      imported: pagesData.length,
      config
    };
  }

  _parseConfig(jsonData) {
    const apiKey = jsonData.credentials?.api_key || null;
    const r2Raw = jsonData.share_report?.r2;

    return {
      proMode: !!apiKey,
      apiKey,
      shareReportUpload: jsonData.share_report?.upload === true,
      r2Config: r2Raw
        ? {
            accountId: r2Raw.accountId,
            accessKeyId: r2Raw.accessKeyId,
            secretAccessKey: r2Raw.secretAccessKey,
            bucketName: r2Raw.bucketName,
            autoDelete: r2Raw.autoDelete ?? true,
            deleteDays: r2Raw.deleteDays || 7,
            shareExpireDays: r2Raw.shareExpireDays || 7
          }
        : null
    };
  }

  async _resolveUrls(urls) {
    const seenUrls = new Set();
    const resolvedUrls = [];

    for (const originalUrl of urls) {
      if (typeof originalUrl !== 'string') continue;

      const trimmedUrl = originalUrl.trim();
      if (!trimmedUrl) continue;

      const lowerUrl = trimmedUrl.toLowerCase();
      const looksLikeSitemap =
        lowerUrl.includes('sitemap') && lowerUrl.endsWith('.xml');

      if (looksLikeSitemap && this.sitemapParser) {
        const parsedUrls = await this._parseSitemapUrl(trimmedUrl, seenUrls);
        resolvedUrls.push(...parsedUrls);
        continue;
      }

      if (!seenUrls.has(trimmedUrl)) {
        seenUrls.add(trimmedUrl);
        resolvedUrls.push(trimmedUrl);
      }
    }

    return resolvedUrls;
  }

  async _parseSitemapUrl(sitemapUrl, seenUrls) {
    const parsedUrls = [];

    const urls = await this.sitemapParser.parse(sitemapUrl);

    urls.forEach((parsedUrl) => {
      if (typeof parsedUrl !== 'string') return;

      const cleanParsedUrl = parsedUrl.trim();
      if (!cleanParsedUrl) return;

      if (!seenUrls.has(cleanParsedUrl)) {
        seenUrls.add(cleanParsedUrl);
        parsedUrls.push(cleanParsedUrl);
      }
    });

    if (parsedUrls.length === 0 && !seenUrls.has(sitemapUrl)) {
      logger.warn('Sitemap parse failed, using sitemap URL as fallback', {
        sitemapUrl
      });
      seenUrls.add(sitemapUrl);
      parsedUrls.push(sitemapUrl);
    }

    return parsedUrls;
  }

  _buildPagesData(resolvedUrls, reports) {
    return resolvedUrls.map((url) => {
      const urlReports = reports[url];
      const hasMobile = urlReports?.mobile;
      const hasDesktop = urlReports?.desktop;
      const hasReports = hasMobile || hasDesktop;

      return {
        url: url,
        status: hasReports ? 'success' : 'pending',
        reports: {
          mobile: hasMobile || null,
          desktop: hasDesktop || null
        },
        error: null,
        addedAt: new Date().toISOString()
      };
    });
  }
}
