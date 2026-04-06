import AsyncStorage from '@react-native-async-storage/async-storage';

const envAppApiUrl = process.env.EXPO_PUBLIC_APP_API_URL?.trim();
const envWebApiUrl = process.env.EXPO_PUBLIC_WEB_API_URL?.trim();

export const API_CONFIG = {
  APP_API_URL: envAppApiUrl && /^https?:\/\//i.test(envAppApiUrl)
    ? envAppApiUrl
    : 'https://campo-api-app-production.up.railway.app',
  WEB_API_URL: envWebApiUrl && /^https?:\/\//i.test(envWebApiUrl)
    ? envWebApiUrl
    : envAppApiUrl && /^https?:\/\//i.test(envAppApiUrl)
      ? envAppApiUrl
      : 'https://campo-api-app-production.up.railway.app',
  LOCAL_API_URL: 'http://localhost:3002', // Dev local
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
    return baseUrlOverride;
  }
  const raw = await AsyncStorage.getItem(KEYS.CONEXION);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.appApiUrl ?? API_CONFIG.APP_API_URL;
    } catch {
      return API_CONFIG.APP_API_URL;
    }
  }
  return API_CONFIG.APP_API_URL;
};

export const getConnectionInfo = async (): Promise<string> => {
  const base = await getBaseUrl();
  return base;
};

export const saveConnectionInfo = async (info: { appApiUrl: string }): Promise<void> => {
  await AsyncStorage.setItem(KEYS.CONEXION, JSON.stringify(info));
};
