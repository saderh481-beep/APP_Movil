const PRODUCTION_API_URL = 'https://campo-api-app-campo-saas.up.railway.app';
const envAppApiUrl = process.env.EXPO_PUBLIC_APP_API_URL?.trim();

const resolveApiUrl = () => {
  if (envAppApiUrl && /^https?:\/\//i.test(envAppApiUrl)) {
    return envAppApiUrl.replace(/\/+$/, '');
  }
  return PRODUCTION_API_URL;
};

export const API_CONFIG = {
  APP_API_URL: resolveApiUrl(),
  TIMEOUT_MS: 20_000,
} as const;

export const KEYS = {
  TOKEN: '@saderh:token',
  USUARIO: '@saderh:usuario',
  OFFLINE_AUTH: '@saderh:offline_auth',
  CONEXION: '@saderh:conexion',
  OFFLINE: '@saderh:offline_queue',
  BENEFICIARIOS_OFFLINE: '@saderh:beneficiarios_offline',
} as const;

export const getBaseUrl = async (baseUrlOverride?: string): Promise<string> => {
  if (baseUrlOverride) {
    return baseUrlOverride.replace(/\/+$/, '');
  }
  return API_CONFIG.APP_API_URL;
};

export const getConnectionInfo = async (): Promise<string> => {
  return API_CONFIG.APP_API_URL;
};

export const saveConnectionInfo = async (info: { appApiUrl: string }): Promise<void> => {
  if (info.appApiUrl && info.appApiUrl.replace(/\/+$/, '') !== API_CONFIG.APP_API_URL) {
    console.warn('[API CONFIG] Se ignoró una URL distinta a la API productiva configurada.');
  }
};
