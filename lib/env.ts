export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_APP_API_URL || 'https://campo-api-app-production.up.railway.app',
  WEB_API_URL: process.env.EXPO_PUBLIC_WEB_API_URL || 'https://campo-api-app-production.up.railway.app',
  NODE_ENV: process.env.NODE_ENV || 'production',
  DEBUG: process.env.DEBUG === 'true',
} as const;

export default ENV;