/**
 * Application Configuration
 * Rules: Centralized configuration, no hardcoded values
 */

export const config = {
  api: {
    workersUrl:
      window.CONFIG?.WORKERS_URL ||
      'https://lazy-pagespeed-api.blackflash.workers.dev'
  }
};
