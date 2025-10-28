/**
 * R2 Uploader Module
 * Rules: Pro mode only, user owns R2 storage
 */

import { logger } from '../utils/logger.js';

export class R2Uploader {
  constructor(r2Config) {
    this.config = r2Config;
    this.s3Client = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
      await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    this.S3Client = S3Client;
    this.PutObjectCommand = PutObjectCommand;
    this.GetObjectCommand = GetObjectCommand;
    this.DeleteObjectCommand = DeleteObjectCommand;
    this.getSignedUrl = getSignedUrl;

    this.s3Client = new this.S3Client({
      region: "auto",
      endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      }
    });

    this.initialized = true;
    logger.info('R2 Uploader initialized');
  }

  async testConnection() {
    try {
      if (!this.initialized) await this.initialize();

      const testKey = `test/connection-test-${Date.now()}.txt`;
      const testBlob = new Blob(['test'], { type: 'text/plain' });

      await this.s3Client.send(new this.PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: testKey,
        Body: testBlob
      }));

      logger.info('R2 test file uploaded');

      await this.s3Client.send(new this.DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: testKey
      }));

      logger.info('R2 test completed successfully');
      return { success: true };

    } catch (error) {
      logger.error('R2 connection test failed', { error: error.message });

      let errorMessage = 'R2 連線失敗';

      if (error.name === 'NoSuchBucket') {
        errorMessage = `Bucket "${this.config.bucketName}" 不存在`;
      } else if (error.Code === 'InvalidAccessKeyId') {
        errorMessage = 'Access Key ID 無效';
      } else if (error.Code === 'SignatureDoesNotMatch') {
        errorMessage = 'Secret Access Key 錯誤';
      } else if (error.Code === 'AccessDenied') {
        errorMessage = '沒有寫入權限';
      }

      return { success: false, error: errorMessage, details: error.message };
    }
  }

  async uploadReport(url, reportId, reportData) {
    if (!this.initialized) await this.initialize();

    const domain = new URL(url).hostname;
    const key = `reports/${domain}/${reportId}.json.gz`;
    const compressed = await this.compressReport(reportData);

    await this.s3Client.send(new this.PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: compressed,
      ContentType: 'application/gzip'
    }));

    const presignedUrl = await this.getSignedUrl(
      this.s3Client,
      new this.GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      }),
      { expiresIn: (this.config.shareExpireDays || 7) * 24 * 60 * 60 }
    );

    logger.info('Report uploaded', { url });
    return presignedUrl;
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

  async calculateReportId(reportData) {
    const jsonString = JSON.stringify(reportData);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16);
  }

}
