// Logger utility that respects NODE_ENV for reducing logs in production

/**
 * Check if running in development environment (lazy evaluation)
 */
const isDev = () => {
   return process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'production';
};

/**
 * Log only in development environment
 */
export const devLog = (...args) => {
   if (isDev()) {
      console.log(...args);
   }
};

/**
 * Log errors in both dev and production
 */
export const errorLog = (...args) => {
   console.error(...args);
};

/**
 * Log warnings in both dev and production
 */
export const warnLog = (...args) => {
   console.warn(...args);
};

/**
 * Always log (for critical startup info)
 */
export const infoLog = (...args) => {
   console.log(...args);
};

export default {
   devLog,
   errorLog,
   warnLog,
   infoLog,
   isDev
};

// Export isDev as a function
export { isDev };
