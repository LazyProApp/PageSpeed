/**
 * Sitemap Parser Module
 * Rules: Parse sitemap.xml, support Sitemap Index, recursive processing
 */

import {
    logger
} from '../utils/logger.js';

export class SitemapParser {
    async parse(url) {
        try {
            logger.debug('Parsing sitemap', {
                url
            });

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
            }

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML format');
            }

            if (xmlDoc.querySelector('sitemapindex')) {
                return await this.parseSitemapIndex(xmlDoc);
            } else {
                return this.parseUrlSet(xmlDoc);
            }
        } catch (error) {
            logger.error('Sitemap parse failed', {
                url,
                error: error.message
            });
            throw error;
        }
    }

    async parseSitemapIndex(xmlDoc) {
        const sitemaps = xmlDoc.querySelectorAll('sitemap > loc');
        const allUrls = [];

        logger.debug('Sitemap Index found', {
            count: sitemaps.length
        });

        for (const sitemap of sitemaps) {
            const sitemapUrl = sitemap.textContent.trim();

            try {
                const urls = await this.parse(sitemapUrl);
                allUrls.push(...urls);
            } catch (error) {
                logger.warn('Failed to parse child sitemap', {
                    sitemapUrl,
                    error: error.message
                });
            }
        }

        logger.debug('Sitemap Index parsed', {
            totalUrls: allUrls.length
        });
        return allUrls;
    }

    parseUrlSet(xmlDoc) {
        const urlElements = xmlDoc.querySelectorAll('url > loc');
        const urls = Array.from(urlElements).map(el => el.textContent.trim());

        logger.debug('URL set parsed', {
            count: urls.length
        });
        return urls;
    }
}