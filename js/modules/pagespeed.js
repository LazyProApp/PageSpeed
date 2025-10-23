/**
 * PageSpeed Module
 * Rules: Wrap PageSpeed API calls, delegate report extraction to Workers
 */

import { logger } from '../utils/logger.js';

export class PageSpeedAPI {
  constructor() {
    this.googleApiUrl =
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    this.workersAnalyzeUrl =
      'https://lazy-pagespeed-api.blackflash.workers.dev/api/analyze';
  }

  /**
   * Test Mode: Analyze both mobile and desktop
   */
  async analyzeViaWorkers(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL parameter');
    }

    try {
      logger.debug('Analyzing mobile + desktop', { url });

      const [mobile, desktop] = await Promise.all([
        this.fetchStrategy(url, 'mobile'),
        this.fetchStrategy(url, 'desktop')
      ]);

      logger.debug('Analysis complete', { url });
      return { mobile, desktop };
    } catch (error) {
      logger.error('Analysis failed', { url, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch single strategy report
   */
  async fetchStrategy(url, strategy) {
    const response = await fetch(this.workersAnalyzeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, strategy, locale: 'zh_TW' })
    });

    if (!response.ok) {
      throw this.createFetchError(response);
    }

    return await response.json();
  }

  /**
   * Create appropriate error from response
   */
  async createFetchError(response) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 429) {
      return new Error(
        'Test Mode daily limit reached. Please use your own API Key.'
      );
    }

    if (response.status === 503) {
      return new Error(
        'Workers monthly limit reached. Please try again later.'
      );
    }

    return new Error(
      `Workers API error: ${response.status} ${errorData.error || ''}`
    );
  }

  /**
   * Pro Mode: Direct Google PageSpeed API call
   */
  async analyzeWithAPI(url, strategy, apiKey) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL parameter');
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API Key is required');
    }

    if (!['mobile', 'desktop'].includes(strategy)) {
      throw new Error('Invalid strategy parameter');
    }

    const params = new URLSearchParams([
      ['url', url],
      ['strategy', strategy],
      ['category', 'performance'],
      ['category', 'accessibility'],
      ['category', 'best-practices'],
      ['category', 'seo'],
      ['locale', 'zh_TW'],
      ['key', apiKey]
    ]);

    const apiUrl = `${this.googleApiUrl}?${params.toString()}`;

    try {
      logger.debug('Calling PageSpeed API', { url, strategy });
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PageSpeed API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!data.lighthouseResult) {
        throw new Error('Invalid PageSpeed API response');
      }

      logger.debug('PageSpeed API success', { url });
      return data;
    } catch (error) {
      logger.error('PageSpeed API failed', { url, error: error.message });
      throw error;
    }
  }

}
