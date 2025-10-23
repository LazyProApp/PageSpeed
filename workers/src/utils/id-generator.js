/**
 * ID Generator Module
 * Rules: Stateless utility, crypto-secure random
 */

export class IDGenerator {
  static async generateShareId() {
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 12);
  }

  static async hashContent(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
