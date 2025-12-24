/**
 * Logger utility with different log levels
 */

export const devLog = (message: string, ...args: unknown[]): void => {
   if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev'
   ) {
      console.log(`[DEV] ${message}`, ...args);
   }
};

export const infoLog = (message: string, ...args: unknown[]): void => {
   console.log(`[INFO] ${message}`, ...args);
};

export const errorLog = (message: string, ...args: unknown[]): void => {
   console.error(`[ERROR] ${message}`, ...args);
};

export const warnLog = (message: string, ...args: unknown[]): void => {
   console.warn(`[WARN] ${message}`, ...args);
};

export default {
   devLog,
   infoLog,
   errorLog,
   warnLog,
};
