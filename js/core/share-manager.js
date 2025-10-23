/**
 * ShareManager
 * Rules: Manage report upload and share snapshot creation
 */

import { logger } from '../utils/logger.js';

export class ShareManager {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.workersUrl = config.api.workersUrl;
    this.uploadedReportIds = {};
  }

  async uploadReport(url, reportData) {
    const hash = await this.hashReport(reportData);

    // Skip if already uploaded (same content)
    if (this.uploadedReportIds[url] === hash) {
      logger.info('Report unchanged, skip upload', { url, hash });
      return hash;
    }

    const compressed = await this.compressReport(reportData);
    const result = await this.sendToWorkers(url, hash, compressed);

    this.uploadedReportIds[url] = hash;
    logger.info('Report uploaded', { url, hash, status: result.status });

    return hash;
  }

  async sendToWorkers(url, hash, compressed) {
    const formData = new FormData();
    formData.append('reportId', hash);
    formData.append('url', url);
    formData.append('report', compressed, `${hash}.json.gz`);

    const response = await fetch(`${this.workersUrl}/api/upload-report`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
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
    const response = await fetch(`${this.workersUrl}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls,
        config,
        reportIds: this.uploadedReportIds
      })
    });

    if (!response.ok) {
      throw new Error(`Share failed: ${response.status}`);
    }

    const { shareId } = await response.json();
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

  async compressReport(reportData) {
    const jsonString = JSON.stringify(reportData);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonString);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(jsonBytes);
        controller.close();
      }
    });

    const compressed = stream.pipeThrough(new CompressionStream('gzip'));
    return await new Response(compressed).blob();
  }

  loadFromShare(shareData) {
    this.uploadedReportIds = shareData.reportIds || {};
    logger.info('Loaded report IDs from share', {
      count: Object.keys(this.uploadedReportIds).length
    });
  }

  clear() {
    this.uploadedReportIds = {};
    logger.info('Cleared report IDs');
  }
}
