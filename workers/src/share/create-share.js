/**
 * Create Share Handler
 * Rules: Create share snapshot in KV
 */

import { Validators } from '../utils/validators.js';
import { ResponseHelper } from '../utils/response.js';
import { IDGenerator } from '../utils/id-generator.js';

export async function handleCreateShare(request, env, corsHeaders) {
  const body = await request.json();

  const validation = Validators.validateShareRequest(body);
  if (!validation.valid) {
    return ResponseHelper.error(validation.error, 400, corsHeaders);
  }

  const contentHash = await IDGenerator.hashContent(JSON.stringify({
    urls: [...body.urls].sort(),
    reportIds: body.reportIds
  }));
  const shareId = contentHash.substring(0, 12);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const reportIdsWithDomain = {};
  for (const [url, reportId] of Object.entries(body.reportIds || {})) {
    let domain;
    try {
      domain = new URL(url).hostname;
    } catch (error) {
      continue;
    }
    reportIdsWithDomain[url] = {
      hash: reportId,
      domain
    };
  }

  const metadata = {
    urls: body.urls,
    config: body.config || {},
    reportIds: reportIdsWithDomain,
    createdAt: Date.now(),
    expiresAt
  };

  await env.SHARE_KV.put(
    `share:meta:${shareId}`,
    JSON.stringify(metadata),
    {
      expirationTtl: 7 * 24 * 60 * 60
    }
  );

  return ResponseHelper.json({ shareId }, 200, corsHeaders);
}
