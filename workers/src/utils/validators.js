/**
 * Validators Module
 * Rules: Boundary-only validation, no internal checks
 */

export class Validators {
  static validateReportId(reportId) {
    if (!reportId || typeof reportId !== 'string') {
      return { valid: false, error: 'reportId is required' };
    }

    if (!/^[a-f0-9]{16}$/.test(reportId)) {
      return { valid: false, error: 'reportId must be 16-char hex' };
    }

    return { valid: true };
  }

  static validateShareRequest(body) {
    if (!body.urls || !Array.isArray(body.urls)) {
      return { valid: false, error: 'urls array is required' };
    }

    if (body.urls.length === 0) {
      return { valid: false, error: 'urls cannot be empty' };
    }

    return { valid: true };
  }
}
