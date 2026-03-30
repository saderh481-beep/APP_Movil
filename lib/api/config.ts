import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_APP_API_URL = 'https://campo-api-app-campo-saas.up.railway.app';
const DEFAULT_WEB_API_URL = 'https://campo-api-web-campo-saas.up.railway.app';
const DEFAULT_SUPABASE_URL = 'https://gvuzyszsflujzinykqom.supabase.co';

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_APP_API_URL;
  return trimmed.replace(/\/+$/, '');
};

export const API_CONFIG = {
  APP_API_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_APP_API_URL ?? DEFAULT_APP_API_URL),
  WEB_API_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_WEB_API_URL ?? DEFAULT_WEB_API_URL),
  SUPABASE_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL),
  DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE === 'true',
  TIMEOUT_MS: 20_000,
};

export const KEYS = {
  TOKEN: '@saderh:token',
  USUARIO: '@saderh:usuario',
  OFFLINE_AUTH: '@saderh:offline_auth',
  CONEXION: '@saderh:conexion',
  OFFLINE: '@saderh:offline_queue',
  BENEFICIARIOS_OFFLINE: '@saderh:beneficiarios_offline',
} as const;

export type ConnectionConfig = { appApiUrl?: string; modoDemo?: boolean };

export const runtime = {
  loaded: false,
  appApiUrl: API_CONFIG.APP_API_URL,
  demoMode: API_CONFIG.DEMO_MODE,
};

export const normalizeBaseUrlExport = normalizeBaseUrl;

export const parseConnectionConfig = (raw: string | null): ConnectionConfig => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ConnectionConfig;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return {
      appApiUrl: typeof parsed.appApiUrl === 'string' ? parsed.appApiUrl : undefined,
      modoDemo: typeof parsed.modoDemo === 'boolean' ? parsed.modoDemo : undefined,
    };
  } catch {
    return {};
  }
};

export const loadRuntimeConfig = async (force = false) => {
  if (runtime.loaded && !force) return runtime;
  const saved = parseConnectionConfig(await AsyncStorage.getItem(KEYS.CONEXION));
  runtime.appApiUrl = normalizeBaseUrl(saved.appApiUrl ?? API_CONFIG.APP_API_URL);
  runtime.demoMode = saved.modoDemo ?? API_CONFIG.DEMO_MODE;
  runtime.loaded = true;
  return runtime;
};

export const getBaseUrl = async (override?: string): Promise<string> => {
  if (override && override.trim().length > 0) return normalizeBaseUrl(override);
  const cfg = await loadRuntimeConfig();
  return normalizeBaseUrl(cfg.appApiUrl);
};

export const getConnectionInfo = async () => {
  const cfg = await loadRuntimeConfig();
  return { appApiUrl: cfg.appApiUrl };
};

export const saveConnectionInfo = async (next: ConnectionConfig) => {
  const merged = {
    appApiUrl: normalizeBaseUrl(next.appApiUrl ?? runtime.appApiUrl ?? API_CONFIG.APP_API_URL),
  };
  runtime.appApiUrl = merged.appApiUrl;
  runtime.loaded = true;
  await AsyncStorage.setItem(KEYS.CONEXION, JSON.stringify(merged));
};
