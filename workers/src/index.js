/**
 * Lazy PageSpeed API - Cloudflare Workers
 * 端點：
 * - POST /api/analyze - 呼叫 Google PageSpeed API 並回傳完整報告
 * - POST /api/upload-report - 上傳報告到 R2
 * - POST /api/share - 建立分享快照
 * - GET  /share?id={shareId} - 讀取分享
 */

import { handleUploadReport } from './share/upload-report.js';
import { handleCreateShare } from './share/create-share.js';
import { handleGetShare } from './share/get-share.js';

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/workers/, '');

    try {
      // POST /api/analyze
      if (pathname === '/api/analyze' && request.method === 'POST') {
        return await handleAnalyze(request, env, corsHeaders);
      }

      // POST /api/upload-report
      if (pathname === '/api/upload-report' && request.method === 'POST') {
        return await handleUploadReport(request, env, corsHeaders);
      }

      // POST /api/share
      if (pathname === '/api/share' && request.method === 'POST') {
        return await handleCreateShare(request, env, corsHeaders);
      }

      // GET /share
      if (pathname === '/share' && request.method === 'GET') {
        return await handleGetShare(url, env, corsHeaders);
      }

      // 404 for other paths
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }
};

/**
 * POST /api/analyze
 * Body: { url: string, strategy: 'mobile' | 'desktop' }
 * Response: 完整 Google PageSpeed API 報告
 */
async function handleAnalyze(request, env, corsHeaders) {
  const { url: targetUrl, strategy = 'mobile', locale = 'zh_TW' } = await request.json();

  if (!targetUrl || typeof targetUrl !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Invalid URL parameter' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  if (!['mobile', 'desktop'].includes(strategy)) {
    return new Response(
      JSON.stringify({ error: 'Invalid strategy parameter' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // 檢查 API Key
  const apiKey = env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing API Key' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // 呼叫 Google PageSpeed API（含中文語系）
    const params = new URLSearchParams([
      ['url', targetUrl],
      ['strategy', strategy],
      ['category', 'performance'],
      ['category', 'accessibility'],
      ['category', 'best-practices'],
      ['category', 'seo'],
      ['locale', locale],
      ['key', apiKey]
    ]);

    const googleApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

    const response = await fetch(googleApiUrl);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Daily API limit reached' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const errorText = await response.text();
      throw new Error(`PageSpeed API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.lighthouseResult) {
      throw new Error('Invalid PageSpeed API response');
    }

    // 返回完整報告
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('analyze-kick error:', error);
    return new Response(
      JSON.stringify({ error: 'Analysis failed', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

