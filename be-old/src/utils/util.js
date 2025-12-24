export const getFrontendUrl = () => {
   console.log(process.env.NODE_ENV);
   console.log(
      process.env.FRONTEND_DEV_URL?.split(',').map((url) => url.trim()) || [
         'http://localhost:3001',
      ]
   );
   console.log(
      process.env.FRONTEND_PROD_URL?.split(',').map((url) => url.trim()) || [
         'http://localhost:3001',
      ]
   );
   if (
      process.env.NODE_ENV === 'DEV' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev'
   ) {
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
