// URL builder utility to handle dev/prod domains and protocols
// Note: All env variable reads happen at function call time (after dotenv.config())

/**
 * Check if running in development environment
 */
const getIsDev = () => {
   return process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'production';
};

/**
 * Get the appropriate domain based on environment
 */
const getDomain = () => {
   const isDev = getIsDev();
   return isDev
      ? process.env.DEV_DOMAIN
      : process.env.PROD_DOMAIN;
};

/**
 * Build HTTP/HTTPS URL based on environment
 * @param {string} path - API path (e.g., '/health', '/api/tweets')
 * @param {number} port - Server port
 * @returns {string} Full URL with appropriate protocol
 */
export const buildRestUrl = (path = '', port = null) => {
   const isDev = getIsDev();
   const domain = getDomain();
   const protocol = isDev ? 'http' : 'https';
   const portString = port && isDev ? `:${port}` : '';
   return `${protocol}://${domain}${portString}${path}`;
};

/**
 * Build WebSocket URL based on environment
 * @param {string} path - WebSocket path (e.g., '/ws')
 * @param {number} port - Server port
 * @returns {string} Full WebSocket URL with appropriate protocol
 */
export const buildWebSocketUrl = (path = '/ws', port = null) => {
   const isDev = getIsDev();
   const domain = getDomain();
   const protocol = isDev ? 'ws' : 'wss';
   const portString = port && isDev ? `:${port}` : '';
   return `${protocol}://${domain}${portString}${path}`;
};

/**
 * Get environment info for logging
 */
export const getEnvironmentInfo = () => ({
   isDev: getIsDev(),
   domain: getDomain(),
   nodeEnv: process.env.NODE_ENV || 'development'
});

/**
 * Export getter function for isDev (lazy evaluation)
 */
export { getIsDev as isDev };

export default {
   buildRestUrl,
   buildWebSocketUrl,
   getEnvironmentInfo,
   isDev: getIsDev
};
