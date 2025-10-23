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
      credentials: {
        api_key: config.apiKey || ''
      },
      urls: pages.map((page) => page.url),
      reports
    };

    logger.debug('Export data prepared', {
      urlsCount: exportData.urls.length,
      reportsCount: Object.keys(reports).length,
      hasApiKey: !!config.apiKey
    });

    return exportData;
  }

  async importFromJSON(jsonData) {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('Invalid JSON data');
    }

    if (!jsonData.urls || !Array.isArray(jsonData.urls)) {
      throw new Error('Missing or invalid urls array');
    }

    const apiKey = jsonData.credentials?.api_key || null;
    const config = {
      proMode: !!apiKey,
      apiKey
    };

    const reports = jsonData.reports || {};
    const seenUrls = new Set();
    const resolvedUrls = [];

    for (const originalUrl of jsonData.urls) {
      if (typeof originalUrl !== 'string') continue;

      const trimmedUrl = originalUrl.trim();
      if (!trimmedUrl) continue;

      const lowerUrl = trimmedUrl.toLowerCase();
      const looksLikeSitemap =
        lowerUrl.includes('sitemap') && lowerUrl.endsWith('.xml');

      if (looksLikeSitemap && this.sitemapParser) {
        try {
          const parsedUrls = await this.sitemapParser.parse(trimmedUrl);
          parsedUrls.forEach((parsedUrl) => {
            if (typeof parsedUrl !== 'string') return;

            const cleanParsedUrl = parsedUrl.trim();
            if (!cleanParsedUrl) return;

            if (!seenUrls.has(cleanParsedUrl)) {
              seenUrls.add(cleanParsedUrl);
              resolvedUrls.push(cleanParsedUrl);
            }
          });
          continue;
        } catch (error) {
          logger.warn('Sitemap import failed, fallback to original URL', {
            url: trimmedUrl,
            error: error.message
          });
        }
      }

      if (!seenUrls.has(trimmedUrl)) {
        seenUrls.add(trimmedUrl);
        resolvedUrls.push(trimmedUrl);
      }
    }

    if (resolvedUrls.length === 0) {
      throw new Error('匯入的資料中沒有可用的網址');
    }

    const pagesData = resolvedUrls.map((url) => {
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

    logger.debug('Import data validated', {
      configKeys: Object.keys(config),
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
}
