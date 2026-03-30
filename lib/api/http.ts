import { API_CONFIG, getBaseUrl } from './config';
import { isRecord, unwrapData } from './utils';

const FALLBACK_REMOTE_SERVER_ERROR = 'El servidor remoto falló o no tiene desplegados los cambios más recientes.';

const normalizeServerErrorMessage = (candidate: string): string => {
  const trimmed = candidate.trim();
  const normalized = trimmed.toLowerCase();
  if (
    normalized.includes('something went wrong') ||
    normalized.includes('<html') ||
    normalized.includes('<!doctype')
  ) {
    return FALLBACK_REMOTE_SERVER_ERROR;
  }
  return trimmed;
};

const extractError = (status: number, json: unknown): string => {
  if (isRecord(json)) {
    const candidate = json.error ?? json.message ?? (isRecord(json.data) ? json.data.error ?? json.data.message : undefined);
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return normalizeServerErrorMessage(candidate);
    }
  }
  return `Error ${status}`;
};

export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('tiempo de espera') ||
    msg.includes('abort') ||
    msg.includes('internet') ||
    msg.includes('connection') ||
    msg.includes('conexi')
  );
};

export const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (isNetworkError(error)) return true;
  if (msg.includes('error 5') || msg.includes('error del servidor') || msg.includes('503') || msg.includes('service unavailable')) return true;
  return false;
};

export const isLikelyNetworkError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  return [
    'network request failed',
    'no se pudo conectar',
    'tiempo de espera',
    'timeout',
    'fetch',
    '503',
    'conexión',
    'internet',
    'servidor',
    'abort',
  ].some((fragment) => msg.includes(fragment));
};

const parseResponseBody = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
};

export async function http<T>(method: string, path: string, body?: unknown, token?: string, baseUrlOverride?: string): Promise<T> {
  return httpWithRetry<T>(method, path, body, token, baseUrlOverride, 0);
}

async function httpWithRetry<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  baseUrlOverride?: string,
  attempt: number = 0
): Promise<T> {
  const MAX_RETRIES = path === '/auth/tecnico' ? 5 : 3;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT_MS);
  
  try {
    const base = await getBaseUrl(baseUrlOverride);
    const url = `${base}${path}`;
    
    console.log(`[HTTP ${attempt + 1}/${MAX_RETRIES + 1}] ${method} ${path}`);
    
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const json = await parseResponseBody(res);
    
    if (!res.ok) {
      const serverError = extractError(res.status, json);
      console.warn(`[HTTP ERROR ${res.status}] ${serverError}`);
      
      if (res.status === 401) {
        console.warn('[AUTH ERROR] Token inválido o expirado. Limpiar sesión.');
        throw new Error(`Autenticación falló: ${serverError}`);
      }
      if (res.status === 403) {
        throw new Error('No tienes permiso para realizar esta acción.');
      }
      if (res.status === 404) {
        throw new Error('Recurso no encontrado. Verifica la conexión al servidor.');
      }
      if (res.status === 503) {
        throw new Error(serverError === `Error ${res.status}` ? 'Servidor no disponible (503). Reintentando...' : serverError);
      }
      if (res.status >= 500) {
        throw new Error(serverError === `Error ${res.status}` ? 'Error del servidor. Intenta más tarde.' : serverError);
      }
      throw new Error(serverError);
    }
    
    console.log(`[HTTP SUCCESS] ${method} ${path}`);
    return json as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      const timeoutError = new Error('Tiempo de espera agotado. Verifica tu conexión a internet.');
      
      if (attempt < MAX_RETRIES && isRetryableError(timeoutError)) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(`[RETRY TIMEOUT] Esperando ${backoff}ms antes de reintentar...`);
        await new Promise(r => setTimeout(r, backoff));
        return httpWithRetry<T>(method, path, body, token, baseUrlOverride, attempt + 1);
      }
      throw timeoutError;
    }
    
    if (isRetryableError(e) && attempt < MAX_RETRIES) {
      const isLoginPath = path === '/auth/tecnico';
      const baseWait = isLoginPath ? 2000 : 1000;
      const backoff = Math.pow(2, attempt) * baseWait;
      const remainingAttempts = MAX_RETRIES - attempt;
      console.warn(`[RETRY ERROR] ${e instanceof Error ? e.message : 'Error desconocido'}. ${remainingAttempts} intentos restantes. Esperando ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
      return httpWithRetry<T>(method, path, body, token, baseUrlOverride, attempt + 1);
    }
    
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

type UploadFile = { uri: string; name: string; type: string };

const getMimeType = (uri: string) => {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return { ext: 'png', mime: 'image/png' };
  if (lower.endsWith('.webp')) return { ext: 'webp', mime: 'image/webp' };
  if (lower.endsWith('.svg')) return { ext: 'svg', mime: 'image/svg+xml' };
  return { ext: 'jpg', mime: 'image/jpeg' };
};

const buildUploadFile = (uri: string, prefix: string): UploadFile => {
  const { ext, mime } = getMimeType(uri);
  return { uri, type: mime, name: `${prefix}-${Date.now()}.${ext}` };
};

export async function httpMultipart<T>(method: string, path: string, form: FormData, token?: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT_MS);
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
    const json = await parseResponseBody(res);
    if (!res.ok) throw new Error(extractError(res.status, json));
    return json as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado. Verifica tu conexión.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export { buildUploadFile };
