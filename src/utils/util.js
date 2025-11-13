export const getFrontendUrl = () => {
   if (
      process.env.NODE_ENV === 'DEV' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev'
   ) {
      return (
         process.env.FRONTEND_DEV_URL?.split(',') || ['http://localhost:3001']
      );
   } else {
      return (
         process.env.FRONTEND_PROD_URL?.split(',') || ['http://polywhisper.io']
      );
   }
};
