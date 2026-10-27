/**
 * Sanitizes a log argument by redacting secrets, credentials, tokens, and MongoDB URIs.
 *
 * @param {unknown} item
 * @returns {unknown}
 */
export const sanitizeLogItem = (item) => {
  if (typeof item === 'string') {
    return item
      .replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://***:***@')
      .replace(/Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi, 'Bearer eyJ***')
      .replace(/\b(AIzaSy[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9_-]{10,})\b/g, '[REDACTED_KEY]')
      .replace(/(["']?password(?:Hash)?["']?\s*[:=]\s*["'])[^"']+["']/gi, '$1***"');
  }
  if (item && typeof item === 'object') {
    try {
      // Avoid mutating original objects or attempting circular serialization
      const str = JSON.stringify(item);
      const sanitizedStr = sanitizeLogItem(str);
      return JSON.parse(sanitizedStr);
    } catch {
      return item;
    }
  }
  return item;
};

export const logger = {
  info: (message, ...args) => {
    const cleanMsg = sanitizeLogItem(message);
    const cleanArgs = args.map(sanitizeLogItem);
    console.log(`[INFO] ${new Date().toISOString()} - ${cleanMsg}`, ...cleanArgs);
  },
  warn: (message, ...args) => {
    const cleanMsg = sanitizeLogItem(message);
    const cleanArgs = args.map(sanitizeLogItem);
    console.warn(`[WARN] ${new Date().toISOString()} - ${cleanMsg}`, ...cleanArgs);
  },
  error: (message, ...args) => {
    const cleanMsg = sanitizeLogItem(message);
    const cleanArgs = args.map(sanitizeLogItem);
    console.error(`[ERROR] ${new Date().toISOString()} - ${cleanMsg}`, ...cleanArgs);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      const cleanMsg = sanitizeLogItem(message);
      const cleanArgs = args.map(sanitizeLogItem);
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${cleanMsg}`, ...cleanArgs);
    }
  },
};
