/**
 * Get Share Handler
 * Rules: Read share snapshot and fetch all reports
 */

import { ResponseHelper } from '../utils/response.js';

export async function handleGetShare(url, env, corsHeaders) {
  const shareId = url.searchParams.get('id');

  if (!shareId) {
    return ResponseHelper.error('id parameter is required', 400, corsHeaders);
  }

  const metaJson = await env.SHARE_KV.get(`share:meta:${shareId}`);

  if (!metaJson) {
    return ResponseHelper.notFound('Share not found', corsHeaders);
  }

  const meta = JSON.parse(metaJson);

  if (Date.now() > meta.expiresAt) {
    return ResponseHelper.gone('Share has expired', corsHeaders);
  }

  const reports = {};

  for (const [url, reportData] of Object.entries(meta.reportIds || {})) {
    // reportData 格式：{ hash: 'xxx', domain: 'example.com' }
    // 或相容舊格式：直接是 hash 字串
    const isNewFormat = typeof reportData === 'object' && reportData.hash;
    const reportId = isNewFormat ? reportData.hash : reportData;
    const domain = isNewFormat ? reportData.domain : new URL(url).hostname;

    // 使用分目錄結構：reports/{domain}/{reportId}.json.gz
    const key = `reports/${domain}/${reportId}.json.gz`;
    const file = await env.SHARE_BUCKET.get(key);

    if (file) {
      const decompressed = file.body.pipeThrough(
        new DecompressionStream('gzip')
      );
      const reportJson = await new Response(decompressed).text();
      reports[url] = JSON.parse(reportJson);
    }
  }

  return ResponseHelper.json(
    {
      urls: meta.urls,
      config: meta.config,
      reports,
      metadata: {
        createdAt: meta.createdAt,
        expiresAt: meta.expiresAt
      }
    },
    200,
    corsHeaders
  );
}
