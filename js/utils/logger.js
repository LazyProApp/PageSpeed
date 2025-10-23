/**
 * Logger Utility
 * Rules: Unified logging, auto-disabled in production
 */

const isNode = typeof window === 'undefined';
const DEBUG_MODE = isNode ? true : window.location.hostname === 'localhost';
const noop = () => {};

export const logger = {
    debug: DEBUG_MODE ? console.log.bind(console, '[DEBUG]') : noop,
    info: DEBUG_MODE ? console.info.bind(console, '[INFO]') : noop,
    warn: DEBUG_MODE ? console.warn.bind(console, '[WARN]') : noop,
    error: DEBUG_MODE ? console.error.bind(console, '[ERROR]') : noop
};