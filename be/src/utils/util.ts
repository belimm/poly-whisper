/**
 * Utility functions
 */

export const getFrontendUrl = (): string[] => {
   const isDev =
      process.env.NODE_ENV === 'DEV' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev';

   if (isDev) {
      return (
         process.env.FRONTEND_DEV_URL?.split(',').map((url) => url.trim()) || [
            'http://localhost:3001',
         ]
      );
   } else {
      return (
         process.env.FRONTEND_PROD_URL?.split(',').map((url) => url.trim()) || [
            'http://polywhisper.io',
         ]
      );
   }
};

export const isDev = (): boolean => {
   return (
      process.env.NODE_ENV === 'DEV' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev'
   );
};
