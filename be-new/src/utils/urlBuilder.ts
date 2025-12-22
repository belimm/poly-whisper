/**
 * URL builder utility to handle dev/prod domains and protocols
 */

/**
 * Check if running in development environment
 */
const getIsDev = (): boolean => {
   return (
      process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'production'
   );
};

/**
 * Get the appropriate domain based on environment
 */
const getDomain = (): string | undefined => {
   const isDev = getIsDev();
   return isDev ? process.env.DEV_DOMAIN : process.env.PROD_DOMAIN;
};

/**
 * Build HTTP/HTTPS URL based on environment
 */
export const buildRestUrl = (path = '', port: number | null = null): string => {
   const isDev = getIsDev();
   const domain = getDomain() || 'localhost';
   const protocol = isDev ? 'http' : 'https';
   const portString = port && isDev ? `:${port}` : '';
   return `${protocol}://${domain}${portString}${path}`;
};

/**
 * Build WebSocket URL based on environment
 */
export const buildWebSocketUrl = (
   path = '/ws',
   port: number | null = null
): string => {
   const isDev = getIsDev();
   const domain = getDomain() || 'localhost';
   const protocol = isDev ? 'ws' : 'wss';
   const portString = port && isDev ? `:${port}` : '';
   return `${protocol}://${domain}${portString}${path}`;
};

/**
 * Get environment info for logging
 */
export const getEnvironmentInfo = (): {
   isDev: boolean;
   domain: string | undefined;
   nodeEnv: string;
} => ({
   isDev: getIsDev(),
   domain: getDomain(),
   nodeEnv: process.env.NODE_ENV || 'development',
});

/**
 * Export getter function for isDev (lazy evaluation)
 */
export { getIsDev as isDev };

export default {
   buildRestUrl,
   buildWebSocketUrl,
   getEnvironmentInfo,
   isDev: getIsDev,
};
