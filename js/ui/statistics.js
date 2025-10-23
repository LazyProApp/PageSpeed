/**
 * Statistics UI Module
 * Rules: Display statistics, listen to data change events
 */

import { EVENTS } from '../core/events.js';
import { logger } from '../utils/logger.js';

export class Statistics {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.totalCount = document.getElementById('totalCount');
    this.analyzingCount = document.getElementById('analyzingCount');
    this.completedCount = document.getElementById('completedCount');
  }

  setupEventListeners() {
    this.eventBus.on(EVENTS.DOMAIN.STATISTICS_UPDATED, (stats) => {
      this.updateStatistics(stats);
    });
  }

  updateStatistics(stats) {
    if (!stats || typeof stats !== 'object') {
      logger.warn('Invalid statistics data');
      return;
    }

    this.totalCount.textContent = stats.total || 0;
    this.analyzingCount.textContent = stats.analyzing || 0;
    this.completedCount.textContent = stats.completed || 0;

    logger.debug('Statistics updated', stats);
  }
}
