/**
 * Upload Report Handler
 * Rules: Upload compressed report to R2 with deduplication
 */

import { Validators } from '../utils/validators.js';
import { ResponseHelper } from '../utils/response.js';

export async function handleUploadReport(request, env, corsHeaders) {
  const formData = await request.formData();
  const reportId = formData.get('reportId');
  const url = formData.get('url');
  const reportBlob = formData.get('report');

  const validation = Validators.validateReportId(reportId);
  if (!validation.valid) {
    return ResponseHelper.error(validation.error, 400, corsHeaders);
  }

  if (!url) {
    return ResponseHelper.error('url is required', 400, corsHeaders);
  }

  if (!reportBlob) {
    return ResponseHelper.error('report file is required', 400, corsHeaders);
  }

  // 提取 domain 作為目錄名稱
  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (error) {
    return ResponseHelper.error('invalid url format', 400, corsHeaders);
  }

  // 使用分目錄結構：reports/{domain}/{reportId}.json.gz
  const key = `reports/${domain}/${reportId}.json.gz`;
  const existing = await env.SHARE_BUCKET.head(key);

  if (existing) {
    return ResponseHelper.json(
      {
        reportId,
        domain,
        status: 'already_exists'
      },
      200,
      corsHeaders
    );
  }

  await env.SHARE_BUCKET.put(key, reportBlob, {
    httpMetadata: {
      contentType: 'application/json',
      contentEncoding: 'gzip'
    }
  });

  return ResponseHelper.json(
    {
      reportId,
      domain,
      status: 'uploaded'
    },
    200,
    corsHeaders
  );
}
