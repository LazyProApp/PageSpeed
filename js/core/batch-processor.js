/**
 * Batch Processor Module
 * Rules: Batch analysis logic, concurrency control, progress notification, Test Mode routing
 */

import { EVENTS } from './events.js';
import { logger } from '../utils/logger.js';

export class BatchProcessor {
  constructor(eventBus, dataEngine, pageSpeedAPI) {
    this.eventBus = eventBus;
    this.dataEngine = dataEngine;
    this.pageSpeedAPI = pageSpeedAPI;
    this.abortController = null;
    this.isProcessing = false;
    this.isPaused = false;
    this.hasProcessingURL = false;
    this.queue = [];
  }

  async start(config, urls) {
    if (!config || !urls) {
      logger.warn('BatchProcessor.start: invalid parameters');
      return;
    }

    if (urls.length === 0) {
      logger.warn('No URLs to analyze');
      return;
    }

    if (this.isProcessing) {
      logger.warn('BatchProcessor already running');
      return;
    }

    if (urls.length === 1) {
      logger.debug('Single URL analysis, starting immediately');
      this.isProcessing = true;
      this.eventBus.emit(EVENTS.PROCESS.BATCH_STARTED, { total: 1 });

      try {
        await this.analyzeSingle(config, urls[0]);
        this.eventBus.emit(EVENTS.PROCESS.BATCH_COMPLETED, {
          total: 1,
          completed: 1,
          failed: 0
        });
      } catch (error) {
        this.eventBus.emit(EVENTS.PROCESS.BATCH_COMPLETED, {
          total: 1,
          completed: 0,
          failed: 1
        });
      } finally {
        this.isProcessing = false;
      }
      return;
    }

    this.isProcessing = true;
    this.isPaused = false;
    this.hasProcessingURL = false;
    this.abortController = new AbortController();
    this.queue = [...urls];

    const initialTotal = urls.length;
    let completed = 0;
    let failed = 0;

    logger.debug('Batch analysis started', {
      total: initialTotal,
      proMode: config.proMode
    });
    this.eventBus.emit(EVENTS.PROCESS.BATCH_STARTED, {
      total: initialTotal
    });

    try {
      const results = await this.processWithConcurrency(
        config,
        (progress) => {
          completed = progress.completed;
          failed = progress.failed;
          this.eventBus.emit(EVENTS.PROCESS.BATCH_PROGRESS, {
            current: progress.current,
            total: initialTotal,
            completed,
            failed
          });
        }
      );

      if (this.abortController.signal.aborted) {
        logger.debug('Batch analysis aborted', {
          completed,
          remaining: initialTotal - completed
        });
        this.eventBus.emit(EVENTS.PROCESS.BATCH_ABORTED, {
          completed,
          remaining: initialTotal - completed
        });
      } else {
        logger.debug('Batch analysis completed', {
          total: completed + failed,
          completed,
          failed
        });
        this.eventBus.emit(EVENTS.PROCESS.BATCH_COMPLETED, {
          total: completed + failed,
          completed,
          failed
        });
      }
    } catch (error) {
      logger.error('Batch analysis error', {
        error: error.message
      });
      this.eventBus.emit(EVENTS.SYSTEM.ERROR, {
        message: 'Batch analysis failed',
        details: error.message
      });
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.queue = [];
    }
  }

  async analyzeSingle(config, url) {
    await this.analyzeURL(url, config);
  }

  async processWithConcurrency(config, onProgress) {
    const state = { current: 0, completed: 0, failed: 0 };
    const analyzePromises = [];

    for (const url of this.queue) {
      if (this.abortController.signal.aborted || this.isPaused) {
        break;
      }

      state.current++;
      const promise = this.processURL(url, config, state, onProgress);
      analyzePromises.push(promise);

      if (state.current < this.queue.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await Promise.all(analyzePromises);
  }

  async processURL(url, config, state, onProgress) {
    try {
      await this.analyzeURL(url, config);
      state.completed++;
    } catch (error) {
      state.failed++;
      logger.error('URL analysis failed', { url, error: error.message });
    }

    onProgress({
      current: state.current,
      completed: state.completed,
      failed: state.failed
    });
  }

  async analyzeURL(url, config) {
    if (!url || !config) {
      throw new Error('Invalid parameters');
    }

    try {
      this.dataEngine.updateURLStatus(url, 'processing');

      logger.debug('Analyzing URL (mobile + desktop)', {
        url,
        proMode: config.proMode
      });

      const reports = config.proMode
        ? await this.analyzeProMode(url, config.apiKey)
        : await this.analyzeTestMode(url);

      this.dataEngine.updateURLStatus(url, 'success', {
        reports
      });

      logger.debug('All analyses completed', {
        url
      });
    } catch (error) {
      logger.error('Analysis failed', {
        url,
        error: error.message
      });

      this.dataEngine.updateURLStatus(url, 'failed', {
        error: error.message
      });

      if (error.message.includes('403') || error.message.includes('401')) {
        this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
          title: 'API Key 錯誤',
          message: 'API Key 無效或已過期，請檢查您的設定'
        });
      }
    }
  }

  async analyzeTestMode(url) {
    const { mobile, desktop } = await this.pageSpeedAPI.analyzeViaWorkers(url);
    return { mobile, desktop };
  }

  async analyzeProMode(url, apiKey) {
    const [mobile, desktop] = await Promise.all([
      this.analyzeStrategy(url, 'mobile', apiKey),
      this.analyzeStrategy(url, 'desktop', apiKey)
    ]);
    return { mobile, desktop };
  }

  async analyzeStrategy(url, strategy, apiKey) {
    return await this.pageSpeedAPI.analyzeWithAPI(url, strategy, apiKey);
  }


  stopBatch() {
    this.isPaused = true;

    this.eventBus.emit(EVENTS.PROCESS.BATCH_PAUSED, {
      hasProcessingURL: this.hasProcessingURL,
      timestamp: new Date().toISOString()
    });

    logger.debug('Batch analysis paused', {
      hasProcessingURL: this.hasProcessingURL
    });
  }

  // 保留供未來 UI 中止功能使用
  abort() {
    if (!this.isProcessing) {
      logger.warn('No batch processing to abort');
      return;
    }

    logger.debug('Aborting batch analysis');
    this.abortController.abort();
  }
}
