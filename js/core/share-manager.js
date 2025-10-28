/**
 * ShareManager
 * Rules: Manage share snapshot creation, support hash and URL formats
 */

import { logger } from '../utils/logger.js';

export class ShareManager {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.workersUrl = config.api.workersUrl;
    this.uploadedReportIds = {};
    this.oldShareId = null;
  }

  setOldShareId(shareId) {
    this.oldShareId = shareId;
    logger.info('Set old share ID', { oldShareId: shareId });
  }

  setReportId(url, reportId) {
    this.uploadedReportIds[url] = { type: 'hash', value: reportId };
    logger.debug('Report ID saved', { url, reportId });
  }

  setReportIds(url, reportIds) {
    this.uploadedReportIds[url] = {
      type: 'hash-pair',
      mobile: reportIds.mobile,
      desktop: reportIds.desktop
    };
    logger.debug('Report IDs saved', { url, reportIds });
  }

  setReportUrl(url, presignedUrl) {
    this.uploadedReportIds[url] = { type: 'url', value: presignedUrl };
    logger.debug('Report URL saved', { url });
  }

  async handleShare(urls, config) {
    if (urls.length === 0) {
      this.eventBus.emit('SYSTEM.ALERT_REQUESTED', {
        title: '無法分享',
        message: '請先新增 URL'
      });
      return null;
    }

    const shareId = await this.createShareSnapshot(urls, config);
    const shareUrl = this.generateShareUrl(shareId);
    await navigator.clipboard.writeText(shareUrl);

    logger.info('Share created', {
      shareId,
      urlCount: urls.length,
      reportCount: Object.keys(this.uploadedReportIds).length
    });

    return {
      shareUrl,
      totalUrls: urls.length,
      completedReports: Object.keys(this.uploadedReportIds).length
    };
  }

  generateShareUrl(shareId) {
    if (window.location.hostname === 'pagespeed.lazypro.app') {
      return `https://pagespeed.lazypro.app/?share=${shareId}`;
    }
    const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
    return `${window.location.origin}${basePath}/?share=${shareId}`;
  }

  async createShareSnapshot(urls, config) {
    const safeConfig = {
      strategy: config.strategy || 'mobile'
    };

    logger.info('Creating share snapshot', {
      urlsCount: urls.length,
      reportIdsCount: Object.keys(this.uploadedReportIds).length,
      reportIds: this.uploadedReportIds
    });

    const response = await fetch(`${this.workersUrl}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls,
        config: safeConfig,
        oldShareId: this.oldShareId,
        reportIds: this.uploadedReportIds
      })
    });

    if (!response.ok) {
      throw new Error(`Share failed: ${response.status}`);
    }

    const { shareId } = await response.json();

    this.oldShareId = null;

    return shareId;
  }

  async hashReport(reportData) {
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

  loadFromShare(shareData) {
    this.uploadedReportIds = shareData.reportIds || {};
    logger.info('Loaded report IDs from share', {
      count: Object.keys(this.uploadedReportIds).length
    });
  }

  clear() {
    this.uploadedReportIds = {};
    this.oldShareId = null;
    logger.info('Cleared report IDs and old share ID');
  }
}
