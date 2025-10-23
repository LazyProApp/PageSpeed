/**
 * Response Helpers Module
 * Rules: Standardized response formatting
 */

export class ResponseHelper {
  static json(data, status = 200, corsHeaders = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  static error(message, status = 400, corsHeaders = {}) {
    return ResponseHelper.json({ error: message }, status, corsHeaders);
  }

  static notFound(message = 'Not found', corsHeaders = {}) {
    return ResponseHelper.error(message, 404, corsHeaders);
  }

  static gone(message = 'Resource expired', corsHeaders = {}) {
    return ResponseHelper.error(message, 410, corsHeaders);
  }

  static serverError(message = 'Internal server error', corsHeaders = {}) {
    return ResponseHelper.error(message, 500, corsHeaders);
  }
}
