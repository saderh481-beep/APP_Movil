import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ApiResponse,
  Asignacion,
  AsignacionesResponse,
  AuthResponse,
  Beneficiario,
  BeneficiariosResponse,
  Bitacora,
  CadenaProductiva,
  Actividad,
  Evidencia,
  Usuario,
  Notificacion,
  HealthResponse,
  SyncResponse,
  CrearBeneficiarioPayload,
} from '../types/models';

const DEFAULT_APP_API_URL = 'https://campo-api-app-campo-saas.up.railway.app';
const DEFAULT_WEB_API_URL = 'https://campo-api-web-campo-saas.up.railway.app';
const DEFAULT_SUPABASE_URL = 'https://gvuzyszsflujzinykqom.supabase.co';

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_APP_API_URL;
  return trimmed.replace(/\/+$/, '');
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(n)) return true;
    if (['false', '0', 'no'].includes(n)) return false;
  }
  return fallback;
};

const toIsoDate = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const unwrapData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if ('data' in value && value.data !== undefined) return value.data;
  return value;
};

const nowIso = () => new Date().toISOString();

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const normalizeBeneficiario = (raw: unknown): Beneficiario => {
  const rec = isRecord(raw) ? raw : {};
  const id = String(rec.id ?? rec.id_beneficiario ?? '');
  const nombreCompleto = String(rec.nombre_completo ?? rec.nombre ?? '');

  return {
    id,
    id_beneficiario: toStringOrUndefined(rec.id_beneficiario ?? rec.id),
    nombre: String(rec.nombre ?? nombreCompleto),
    nombre_completo: nombreCompleto || String(rec.nombre ?? ''),
    municipio: String(rec.municipio ?? ''),
    localidad: rec.localidad ? String(rec.localidad) : undefined,
    direccion: rec.direccion ? String(rec.direccion) : undefined,
    cp: rec.cp ? String(rec.cp) : undefined,
    telefono_principal: rec.telefono_principal ? String(rec.telefono_principal) : undefined,
    telefono_secundario: rec.telefono_secundario ? String(rec.telefono_secundario) : undefined,
    coord_parcela: rec.coord_parcela ? String(rec.coord_parcela) : undefined,
    telefono_contacto: rec.telefono_contacto ? String(rec.telefono_contacto) : undefined,
    curp: rec.curp ? String(rec.curp) : undefined,
    folio_saderh: rec.folio_saderh ? String(rec.folio_saderh) : undefined,
    cadena_productiva: rec.cadena_productiva ? String(rec.cadena_productiva) : undefined,
    latitud_predio: typeof rec.latitud_predio === 'number' ? rec.latitud_predio : null,
    longitud_predio: typeof rec.longitud_predio === 'number' ? rec.longitud_predio : null,
    activo: toBoolean(rec.activo, true),
    cadenas: asArray<unknown>(isRecord(rec.cadenas) ? [] : rec.cadenas).map(c => {
      const cadena = isRecord(c) ? c : {};
      return {
        id: String(cadena.id ?? ''),
        nombre: String(cadena.nombre ?? ''),
      };
    }).filter(c => c.id && c.nombre),
  };
};

const normalizeActividad = (raw: unknown): Actividad => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? rec.id_actividad ?? ''),
    nombre: String(rec.nombre ?? rec.titulo ?? ''),
    descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
    activo: toBoolean(rec.activo, true),
    created_by: String(rec.created_by ?? rec.id_usuario_creo ?? ''),
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
  };
};

const normalizeAsignacionFromActividad = (actividad: Actividad, raw?: unknown): Asignacion => {
  const rec = isRecord(raw) ? raw : {};
  return {
    ...actividad,
    id_asignacion: actividad.id,
    id_tecnico: toStringOrUndefined(rec.id_tecnico ?? rec.tecnico_id),
    id_usuario_creo: actividad.created_by,
    id_beneficiario: toStringOrUndefined(rec.id_beneficiario ?? rec.beneficiario_id),
    tipo_asignacion: 'actividad',
    descripcion_actividad: actividad.descripcion,
    prioridad: 'MEDIA',
    completado: false,
    fecha_limite: toStringOrUndefined(rec.fecha_limite),
    fecha_completado: toStringOrUndefined(rec.fecha_completado),
  };
};

const normalizeAsignacionFromBeneficiario = (beneficiario: Beneficiario, raw?: unknown): Asignacion => {
  const rec = isRecord(raw) ? raw : {};
  const idBase = beneficiario.id_beneficiario ?? beneficiario.id;
  return {
    id: `beneficiario-${idBase}`,
    nombre: beneficiario.nombre_completo ?? beneficiario.nombre,
    descripcion: beneficiario.cadena_productiva ?? 'Beneficiario asignado',
    activo: beneficiario.activo,
    created_by: String(rec.created_by ?? rec.id_usuario_creo ?? ''),
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
    id_asignacion: `beneficiario-${idBase}`,
    id_tecnico: toStringOrUndefined(rec.id_tecnico ?? rec.tecnico_id),
    id_usuario_creo: toStringOrUndefined(rec.id_usuario_creo ?? rec.created_by),
    id_beneficiario: idBase,
    tipo_asignacion: 'beneficiario',
    descripcion_actividad: beneficiario.cadena_productiva ?? 'Seguimiento de beneficiario',
    prioridad: 'MEDIA',
    completado: false,
    fecha_limite: toStringOrUndefined(rec.fecha_limite),
    fecha_completado: toStringOrUndefined(rec.fecha_completado),
    beneficiario,
  };
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
  CONEXION: '@saderh:conexion',
  OFFLINE: '@saderh:offline_queue',
  BENEFICIARIOS_OFFLINE: '@saderh:beneficiarios_offline',
} as const;

export interface PendingBitacoraUpload {
  local_id: string;
  created_at: string;
  payload: Omit<Bitacora, 'id_bitacora'>;
  foto_rostro_uri: string;
  firma_uri: string;
  fotos_campo_uris: string[];
}

/**
 * Beneficiario pendiente de sincronización offline
 */
export interface PendingBeneficiarioUpload {
  local_id: string;
  created_at: string;
  payload: CrearBeneficiarioPayload;
  sync_status: 'pending' | 'syncing' | 'failed';
}

type ConnectionConfig = { appApiUrl?: string; modoDemo?: boolean };

const runtime = {
  loaded: false,
  appApiUrl: API_CONFIG.APP_API_URL,
  demoMode: API_CONFIG.DEMO_MODE,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const getToken = async () => {
  try {
    console.log('[API] Intentando obtener token de AsyncStorage...');
    const token = await AsyncStorage.getItem(KEYS.TOKEN);
    console.log('[API] Token encontrado:', token ? 'Sí, longitud: ' + token.length : 'No');
    // Retornar undefined si no hay token (no null)
    return token && token.trim().length > 0 ? token : undefined;
  } catch (error) {
    console.error('Error obteniendo token de AsyncStorage:', error);
    return undefined;
  }
};

const parseConnectionConfig = (raw: string | null): ConnectionConfig => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ConnectionConfig;
    if (!isRecord(parsed)) return {};
    return {
      appApiUrl: typeof parsed.appApiUrl === 'string' ? parsed.appApiUrl : undefined,
      modoDemo: typeof parsed.modoDemo === 'boolean' ? parsed.modoDemo : undefined,
    };
  } catch {
    return {};
  }
};

const loadRuntimeConfig = async (force = false) => {
  if (runtime.loaded && !force) return runtime;
  const saved = parseConnectionConfig(await AsyncStorage.getItem(KEYS.CONEXION));
  runtime.appApiUrl = normalizeBaseUrl(saved.appApiUrl ?? API_CONFIG.APP_API_URL);
  runtime.demoMode = saved.modoDemo ?? API_CONFIG.DEMO_MODE;
  runtime.loaded = true;
  return runtime;
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

const getBaseUrl = async (override?: string): Promise<string> => {
  if (override && override.trim().length > 0) return normalizeBaseUrl(override);
  const cfg = await loadRuntimeConfig();
  return normalizeBaseUrl(cfg.appApiUrl);
};

// Modo demo eliminado - siempre usar API real

const parseResponseBody = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
};

const extractError = (status: number, json: unknown): string => {
  if (isRecord(json)) {
    const candidate = json.error ?? json.message ?? (isRecord(json.data) ? json.data.error ?? json.data.message : undefined);
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
  }
  return `Error ${status}`;
};

const isNetworkError = (error: unknown): boolean => {
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

const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  // Errores de red y timeouts son reintentables
  if (isNetworkError(error)) return true;
  // Errores 5xx son reintentables (especialmente 503 Service Unavailable)
  if (msg.includes('error 5') || msg.includes('error del servidor') || msg.includes('503') || msg.includes('service unavailable')) return true;
  return false;
};

async function http<T>(method: string, path: string, body?: unknown, token?: string, baseUrlOverride?: string): Promise<T> {
  return httpWithRetry<T>(method, path, body, token, baseUrlOverride, 0);
}

/**
 * HTTP con retry exponencial automático
 * Reintenta en caso de errores de red o timeouts
 * Para login (/auth/tecnico), usa más reintentos debido a problemas de disponibilidad
 */
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
        // Error de autenticación - no reintentar
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
        throw new Error('Servidor no disponible (503). Reintentando...');
      }
      if (res.status >= 500) {
        throw new Error('Error del servidor. Intenta más tarde.');
      }
      throw new Error(serverError);
    }
    
    console.log(`[HTTP SUCCESS] ${method} ${path}`);
    return json as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      const timeoutError = new Error('Tiempo de espera agotado. Verifica tu conexión a internet.');
      
      // Reintentar en caso de timeout
      if (attempt < MAX_RETRIES && isRetryableError(timeoutError)) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[RETRY TIMEOUT] Esperando ${backoff}ms antes de reintentar...`);
        await new Promise(r => setTimeout(r, backoff));
        return httpWithRetry<T>(method, path, body, token, baseUrlOverride, attempt + 1);
      }
      throw timeoutError;
    }
    
    // Reintentar en caso de errores de red
    if (isRetryableError(e) && attempt < MAX_RETRIES) {
      // Para /auth/tecnico, usar backoff más agresivo debido a 503s
      const isLoginPath = path === '/auth/tecnico';
      const baseWait = isLoginPath ? 2000 : 1000; // 2s base para login
      const backoff = Math.pow(2, attempt) * baseWait; // 2s, 4s, 8s, 16s, 32s para login
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

async function httpMultipart<T>(method: string, path: string, form: FormData, token?: string): Promise<T> {
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

// ── AUTH ──────────────────────────────────────────────────
// Rate limiting para login (exponential backoff)
const loginAttempts: Record<string, { count: number; resetTime: number }> = {};

const checkLoginRateLimit = async (codigo: string): Promise<void> => {
  const now = Date.now();
  const key = codigo;
  
  if (loginAttempts[key]) {
    const attempt = loginAttempts[key];
    
    // Resetear después de 5 minutos
    if (now > attempt.resetTime) {
      loginAttempts[key] = { count: 0, resetTime: now + 5 * 60 * 1000 };
      return;
    }
    
    // Si hay 3+ intentos fallidos, esperar exponencialmente
    if (attempt.count >= 3) {
      const backoff = Math.pow(2, attempt.count - 3) * 10_000; // 10s, 20s, 40s, etc
      const waitTime = Math.min(backoff, 5 * 60 * 1000); // Max 5 minutos
      const waitedTime = now - (attempt.resetTime - 5 * 60 * 1000);
      
      if (waitedTime < waitTime) {
        const remainingTime = Math.ceil((waitTime - waitedTime) / 1000);
        throw new Error(`Demasiados intentos fallidos. Intenta en ${remainingTime}s.`);
      }
    }
  }
};

const recordLoginAttempt = (codigo: string, success: boolean) => {
  const key = codigo;
  const now = Date.now();
  
  if (success) {
    delete loginAttempts[key];
  } else {
    if (!loginAttempts[key]) {
      loginAttempts[key] = { count: 1, resetTime: now + 5 * 60 * 1000 };
    } else {
      loginAttempts[key].count += 1;
    }
  }
};

export const authApi = {
  /** POST /auth/tecnico */
  async login(codigo: string): Promise<AuthResponse> {
    // Verificar rate limit client-side
    await checkLoginRateLimit(codigo);
    
    try {
      // Login always uses real server - no demo mode
      // El backend espera exactamente 5 dígitos
      const json = await http<unknown>('POST', '/auth/tecnico', { codigo });
      const data = unwrapData(json);
      const src = isRecord(data) ? data : {};
      const root = isRecord(json) ? json : {};
      const tokenValue = src.token ?? src.access_token ?? root.token ?? root.access_token;
      const token = typeof tokenValue === 'string' ? tokenValue : '';
      if (!token) throw new Error('No se recibió token de autenticación');

      // El backend devuelve tecnico: { id, nombre, ...otras propiedades }
      const tecnicoRaw = src.tecnico ?? root.tecnico ?? src.usuario ?? root.usuario ?? src;
      const tecnico = isRecord(tecnicoRaw) ? {
        id: String(tecnicoRaw.id ?? tecnicoRaw.id_usuario ?? ''),
        nombre: String(tecnicoRaw.nombre ?? tecnicoRaw.nombre_completo ?? ''),
        rol: typeof tecnicoRaw.rol === 'string' ? tecnicoRaw.rol : 'tecnico',
      } : { id: '', nombre: '', rol: 'tecnico' };

      if (!tecnico.id || !tecnico.nombre) {
        throw new Error('Respuesta de login inválida: falta id o nombre del técnico');
      }

      // Registrar éxito
      recordLoginAttempt(codigo, true);
      return { success: true, token, tecnico };
    } catch (e) {
      // Registrar intento fallido
      recordLoginAttempt(codigo, false);
      throw e;
    }
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
  },

  async forgotPassword(_email: string): Promise<ApiResponse> {
    return { success: false, message: 'Recuperación de contraseña no disponible en esta app.' };
  },
};

// ── HEALTH ────────────────────────────────────────────────
export const healthApi = {
  /** GET /health */
  async check(): Promise<HealthResponse> {
    try {
      const json = await http<unknown>('GET', '/health', undefined, undefined);
      const data = unwrapData(json);
      const result = isRecord(data) ? data : (isRecord(json) ? json : {});
      return {
        status: String(result.status ?? 'unknown'),
        service: String(result.service ?? 'api-app'),
        ts: String(result.ts ?? new Date().toISOString()),
      };
    } catch (e) {
      throw new Error('No se pudo conectar al servidor');
    }
  },
};

// ── ACTIVIDADES / ASIGNACIONES ────────────────────────────
export const actividadesApi = {
  /** GET /mis-actividades */
  async listar(): Promise<Actividad[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /mis-actividades');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('GET', '/mis-actividades', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.actividades ? data.actividades : data);
    return arr.map(raw => normalizeActividad(raw)).filter(a => a.id && a.nombre);
  },
};

// ── ASIGNACIONES (usando Actividades) ──────────────────────
export const asignacionesApi = {
  /** Combina actividades y beneficiarios del técnico autenticado */
  async listar(): Promise<AsignacionesResponse> {
    const token = await getToken();
    if (!token) {
      console.error('[API ERROR] No hay token disponible para asignaciones');
      throw new Error('No autenticado: Token no disponible');
    }

    const [actividadesJson, beneficiariosJson] = await Promise.all([
      http<unknown>('GET', '/mis-actividades', undefined, token),
      http<unknown>('GET', '/mis-beneficiarios', undefined, token),
    ]);

    const actividadesData = unwrapData(actividadesJson);
    const actividadesRaw = asArray<unknown>(isRecord(actividadesData) && actividadesData.actividades ? actividadesData.actividades : actividadesData);
    const actividades = actividadesRaw
      .map(raw => normalizeAsignacionFromActividad(normalizeActividad(raw), raw))
      .filter(a => a.id_asignacion && a.nombre);

    const beneficiariosData = unwrapData(beneficiariosJson);
    const beneficiariosRaw = asArray<unknown>(isRecord(beneficiariosData) && beneficiariosData.beneficiarios ? beneficiariosData.beneficiarios : beneficiariosData);
    const beneficiarios = beneficiariosRaw
      .map(raw => normalizeAsignacionFromBeneficiario(normalizeBeneficiario(raw), raw))
      .filter(a => a.id_asignacion && a.beneficiario?.id);

    const asignaciones = [...beneficiarios, ...actividades];
    return { success: true, asignaciones, total: asignaciones.length };
  },
};

// ── BENEFICIARIOS ─────────────────────────────────────────
export const beneficiariosApi = {
  /** GET /mis-beneficiarios */
  async listar(search?: string): Promise<Beneficiario[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /mis-beneficiarios');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('GET', '/mis-beneficiarios', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.beneficiarios ? data.beneficiarios : data);
    let list = arr.map(raw => normalizeBeneficiario(raw)).filter(b => b.id && (b.nombre || b.nombre_completo));

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        [b.nombre, b.nombre_completo ?? '', b.municipio, b.localidad ?? '', b.folio_saderh ?? ''].some(f => f.toLowerCase().includes(q))
      );
    }

    return list;
  },

  /** POST /beneficiarios - Crear beneficiario con guardado offline */
  async crear(payload: CrearBeneficiarioPayload): Promise<Beneficiario> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /beneficiarios');
      throw new Error('No autenticado: Token no disponible');
    }
    
    try {
      // Intentar crear en el servidor
      const json = await http<unknown>('POST', '/beneficiarios', payload, token);
      const data = unwrapData(json);
      const rec = isRecord(data) ? data : {};
      
      console.log('[beneficiariosApi.crear] Beneficiario creado en servidor:', rec.id ?? 'sin id');
      
      return {
        id: String(rec.id ?? rec.id_beneficiario ?? ''),
        nombre: String(rec.nombre ?? payload.nombre_completo),
        nombre_completo: payload.nombre_completo,
        municipio: payload.municipio,
        localidad: payload.localidad,
        curp: payload.curp,
        folio_saderh: payload.folio_saderh,
        cadena_productiva: payload.cadena_productiva,
        telefono_contacto: payload.telefono_contacto,
        activo: true,
      };
    } catch (error) {
      // Si hay error de red, guardar localmente para sincronizar después
      console.warn('[beneficiariosApi.crear] Error de red, guardando offline:', error instanceof Error ? error.message : 'error desconocido');
      
      // Guardar en cola offline
      const offlineBeneficiarios = await offlineQueue.getPendingBeneficiarios();
      const nuevoBeneficiario = {
        local_id: `local_${Date.now()}`,
        created_at: new Date().toISOString(),
        payload,
        sync_status: 'pending' as const,
      };
      
      await offlineQueue.addPendingBeneficiario(nuevoBeneficiario);
      console.log('[beneficiariosApi.crear] Beneficiario guardado en cola offline');
      
      // Devolver beneficiario local con ID temporal
      return {
        id: nuevoBeneficiario.local_id,
        nombre: payload.nombre_completo,
        nombre_completo: payload.nombre_completo,
        municipio: payload.municipio,
        localidad: payload.localidad,
        curp: payload.curp,
        folio_saderh: payload.folio_saderh,
        cadena_productiva: payload.cadena_productiva,
        telefono_contacto: payload.telefono_contacto,
        activo: true,
      };
    }
  },
};

// ── CADENAS PRODUCTIVAS ───────────────────────────────────
export const cadenasApi = {
  /** GET /cadenas-productivas */
  async listar(): Promise<CadenaProductiva[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /cadenas-productivas');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('GET', '/cadenas-productivas', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.cadenas ? data.cadenas : data);
    return arr.map(raw => {
      const rec = isRecord(raw) ? raw : {};
      return {
        id: String(rec.id ?? ''),
        nombre: String(rec.nombre ?? ''),
        descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
        activo: toBoolean(rec.activo, true),
        created_by: String(rec.created_by ?? ''),
        created_at: String(rec.created_at ?? nowIso()),
        updated_at: String(rec.updated_at ?? nowIso()),
      };
    }).filter(c => c.id && c.nombre);
  },
};

// ── BITÁCORAS ─────────────────────────────────────────────
export const bitacorasApi = {
  /** POST /bitacoras */
  async crear(payload: {
    tipo: 'beneficiario' | 'actividad';
    beneficiario_id?: string;
    cadena_productiva_id?: string;
    actividad_id?: string;
    fecha_inicio: string;
    coord_inicio?: string;
    sync_id?: string;
  }): Promise<Bitacora> {
    const token = await getToken();
    const json = await http<unknown>('POST', '/bitacoras', payload, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : {};
    return {
      id: String(rec.id ?? ''),
      tipo: (rec.tipo ?? payload.tipo) as 'beneficiario' | 'actividad',
      estado: String(rec.estado ?? 'borrador') as 'borrador' | 'cerrada',
      tecnico_id: String(rec.tecnico_id ?? ''),
      beneficiario_id: rec.beneficiario_id ? String(rec.beneficiario_id) : undefined,
      cadena_productiva_id: rec.cadena_productiva_id ? String(rec.cadena_productiva_id) : undefined,
      actividad_id: rec.actividad_id ? String(rec.actividad_id) : undefined,
      fecha_inicio: String(rec.fecha_inicio ?? payload.fecha_inicio),
      fecha_fin: rec.fecha_fin ? String(rec.fecha_fin) : undefined,
      coord_inicio: rec.coord_inicio ? String(rec.coord_inicio) : payload.coord_inicio,
      coord_fin: rec.coord_fin ? String(rec.coord_fin) : undefined,
      actividades_desc: rec.actividades_desc ? String(rec.actividades_desc) : undefined,
      recomendaciones: rec.recomendaciones ? String(rec.recomendaciones) : undefined,
      comentarios_beneficiario: rec.comentarios_beneficiario ? String(rec.comentarios_beneficiario) : undefined,
      coordinacion_interinst: toBoolean(rec.coordinacion_interinst, false),
      instancia_coordinada: rec.instancia_coordinada ? String(rec.instancia_coordinada) : undefined,
      proposito_coordinacion: rec.proposito_coordinacion ? String(rec.proposito_coordinacion) : undefined,
      observaciones_coordinador: rec.observaciones_coordinador ? String(rec.observaciones_coordinador) : undefined,
      foto_rostro_url: rec.foto_rostro_url ? String(rec.foto_rostro_url) : undefined,
      firma_url: rec.firma_url ? String(rec.firma_url) : undefined,
      fotos_campo: asArray<string>(rec.fotos_campo),
      sync_id: rec.sync_id ? String(rec.sync_id) : undefined,
      created_at: String(rec.created_at ?? nowIso()),
      updated_at: String(rec.updated_at ?? nowIso()),
    };
  },

  /** GET /bitacoras */
  async listar(): Promise<Bitacora[]> {
    const token = await getToken();
    const json = await http<unknown>('GET', '/bitacoras', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.bitacoras ? data.bitacoras : data);
    return arr.map(raw => {
      const rec = isRecord(raw) ? raw : {};
      return {
        id: String(rec.id ?? ''),
        tipo: String(rec.tipo ?? 'actividad') as 'beneficiario' | 'actividad',
        estado: String(rec.estado ?? 'borrador') as 'borrador' | 'cerrada',
        tecnico_id: String(rec.tecnico_id ?? ''),
        beneficiario_id: rec.beneficiario_id ? String(rec.beneficiario_id) : undefined,
        cadena_productiva_id: rec.cadena_productiva_id ? String(rec.cadena_productiva_id) : undefined,
        actividad_id: rec.actividad_id ? String(rec.actividad_id) : undefined,
        fecha_inicio: String(rec.fecha_inicio ?? ''),
        fecha_fin: rec.fecha_fin ? String(rec.fecha_fin) : undefined,
        coord_inicio: rec.coord_inicio ? String(rec.coord_inicio) : undefined,
        coord_fin: rec.coord_fin ? String(rec.coord_fin) : undefined,
        actividades_desc: rec.actividades_desc ? String(rec.actividades_desc) : undefined,
        sync_id: rec.sync_id ? String(rec.sync_id) : undefined,
        created_at: String(rec.created_at ?? nowIso()),
        updated_at: String(rec.updated_at ?? nowIso()),
      };
    }).filter(b => b.id);
  },

  /** GET /bitacoras/:id */
  async detalle(id: string): Promise<Bitacora> {
    const token = await getToken();
    const json = await http<unknown>('GET', `/bitacoras/${id}`, undefined, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : {};
    return {
      id: String(rec.id ?? id),
      tipo: String(rec.tipo ?? 'actividad') as 'beneficiario' | 'actividad',
      estado: String(rec.estado ?? 'borrador') as 'borrador' | 'cerrada',
      tecnico_id: String(rec.tecnico_id ?? ''),
      beneficiario_id: rec.beneficiario_id ? String(rec.beneficiario_id) : undefined,
      cadena_productiva_id: rec.cadena_productiva_id ? String(rec.cadena_productiva_id) : undefined,
      actividad_id: rec.actividad_id ? String(rec.actividad_id) : undefined,
      fecha_inicio: String(rec.fecha_inicio ?? ''),
      fecha_fin: rec.fecha_fin ? String(rec.fecha_fin) : undefined,
      coord_inicio: rec.coord_inicio ? String(rec.coord_inicio) : undefined,
      coord_fin: rec.coord_fin ? String(rec.coord_fin) : undefined,
      actividades_desc: rec.actividades_desc ? String(rec.actividades_desc) : undefined,
      recomendaciones: rec.recomendaciones ? String(rec.recomendaciones) : undefined,
      comentarios_beneficiario: rec.comentarios_beneficiario ? String(rec.comentarios_beneficiario) : undefined,
      coordinacion_interinst: toBoolean(rec.coordinacion_interinst, false),
      instancia_coordinada: rec.instancia_coordinada ? String(rec.instancia_coordinada) : undefined,
      proposito_coordinacion: rec.proposito_coordinacion ? String(rec.proposito_coordinacion) : undefined,
      observaciones_coordinador: rec.observaciones_coordinador ? String(rec.observaciones_coordinador) : undefined,
      foto_rostro_url: rec.foto_rostro_url ? String(rec.foto_rostro_url) : undefined,
      firma_url: rec.firma_url ? String(rec.firma_url) : undefined,
      fotos_campo: asArray<string>(rec.fotos_campo),
      sync_id: rec.sync_id ? String(rec.sync_id) : undefined,
      created_at: String(rec.created_at ?? nowIso()),
      updated_at: String(rec.updated_at ?? nowIso()),
    };
  },

  /** PATCH /bitacoras/:id */
  async editar(id: string, payload: Partial<Bitacora>): Promise<Bitacora> {
    const token = await getToken();
    const json = await http<unknown>('PATCH', `/bitacoras/${id}`, payload, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : {};
    return {
      id: String(rec.id ?? id),
      tipo: String(rec.tipo ?? 'actividad') as 'beneficiario' | 'actividad',
      estado: String(rec.estado ?? 'borrador') as 'borrador' | 'cerrada',
      tecnico_id: String(rec.tecnico_id ?? ''),
      beneficiario_id: rec.beneficiario_id ? String(rec.beneficiario_id) : undefined,
      cadena_productiva_id: rec.cadena_productiva_id ? String(rec.cadena_productiva_id) : undefined,
      actividad_id: rec.actividad_id ? String(rec.actividad_id) : undefined,
      fecha_inicio: String(rec.fecha_inicio ?? ''),
      fecha_fin: rec.fecha_fin ? String(rec.fecha_fin) : undefined,
      coord_inicio: rec.coord_inicio ? String(rec.coord_inicio) : undefined,
      coord_fin: rec.coord_fin ? String(rec.coord_fin) : undefined,
      actividades_desc: rec.actividades_desc ? String(rec.actividades_desc) : undefined,
      recomendaciones: rec.recomendaciones ? String(rec.recomendaciones) : undefined,
      comentarios_beneficiario: rec.comentarios_beneficiario ? String(rec.comentarios_beneficiario) : undefined,
      coordinacion_interinst: toBoolean(rec.coordinacion_interinst, false),
      instancia_coordinada: rec.instancia_coordinada ? String(rec.instancia_coordinada) : undefined,
      proposito_coordinacion: rec.proposito_coordinacion ? String(rec.proposito_coordinacion) : undefined,
      observaciones_coordinador: rec.observaciones_coordinador ? String(rec.observaciones_coordinador) : undefined,
      foto_rostro_url: rec.foto_rostro_url ? String(rec.foto_rostro_url) : undefined,
      firma_url: rec.firma_url ? String(rec.firma_url) : undefined,
      fotos_campo: asArray<string>(rec.fotos_campo),
      sync_id: rec.sync_id ? String(rec.sync_id) : undefined,
      created_at: String(rec.created_at ?? nowIso()),
      updated_at: String(rec.updated_at ?? nowIso()),
    };
  },

  /** POST /bitacoras/:id/cerrar */
  async cerrar(id: string, payload?: { fecha_fin: string; coord_fin?: string }): Promise<Bitacora> {
    const token = await getToken();
    const body = payload || { fecha_fin: nowIso() };
    const json = await http<unknown>('POST', `/bitacoras/${id}/cerrar`, body, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : {};
    return {
      id: String(rec.id ?? id),
      tipo: String(rec.tipo ?? 'actividad') as 'beneficiario' | 'actividad',
      estado: 'cerrada',
      tecnico_id: String(rec.tecnico_id ?? ''),
      fecha_inicio: String(rec.fecha_inicio ?? ''),
      fecha_fin: String(body.fecha_fin),
      coord_fin: body.coord_fin,
      created_at: String(rec.created_at ?? nowIso()),
      updated_at: String(rec.updated_at ?? nowIso()),
    };
  },

  /** POST /bitacoras/:id/foto-rostro */
  async subirFotoRostro(id: string, uri: string): Promise<{ foto_rostro_url: string }> {
    const token = await getToken();
    const file = buildUploadFile(uri, 'foto-rostro');
    const form = new FormData();
    form.append('foto', file as unknown as Blob);
    const result = await httpMultipart<unknown>('POST', `/bitacoras/${id}/foto-rostro`, form, token);
    const rec = isRecord(result) ? result : {};
    return {
      foto_rostro_url: String(rec.foto_rostro_url ?? ''),
    };
  },

  /** POST /bitacoras/:id/firma */
  async subirFirma(id: string, uri: string): Promise<{ firma_url: string }> {
    const token = await getToken();
    const file = buildUploadFile(uri, 'firma');
    const form = new FormData();
    form.append('firma', file as unknown as Blob);
    const result = await httpMultipart<unknown>('POST', `/bitacoras/${id}/firma`, form, token);
    const rec = isRecord(result) ? result : {};
    return {
      firma_url: String(rec.firma_url ?? ''),
    };
  },

  /** POST /bitacoras/:id/fotos-campo */
  async subirFotosCampo(id: string, uris: string[]): Promise<{ fotos_campo: string[] }> {
    if (!uris.length) return { fotos_campo: [] };
    const token = await getToken();
    const form = new FormData();
    uris.forEach((uri, idx) => {
      const file = buildUploadFile(uri, `foto-campo-${idx + 1}`);
      form.append('fotos', file as unknown as Blob);
    });
    const result = await httpMultipart<unknown>('POST', `/bitacoras/${id}/fotos-campo`, form, token);
    const rec = isRecord(result) ? result : {};
    return {
      fotos_campo: asArray<string>(rec.fotos_campo),
    };
  },

  /** DELETE /bitacoras/:id */
  async eliminar(id: string): Promise<{ message: string }> {
    const token = await getToken();
    const result = await http<unknown>('DELETE', `/bitacoras/${id}`, undefined, token);
    const rec = isRecord(result) ? result : {};
    return {
      message: String(rec.message ?? 'Bitácora eliminada'),
    };
  },
};

// ── NOTIFICACIONES ────────────────────────────────────────
export const notificacionesApi = {
  /** GET /notificaciones */
  async listar(): Promise<Notificacion[]> {
    const token = await getToken();
    const json = await http<unknown>('GET', '/notificaciones', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.notificaciones ? data.notificaciones : data);
    return arr.map(raw => {
      const rec = isRecord(raw) ? raw : {};
      return {
        id: String(rec.id ?? ''),
        destino_id: String(rec.destino_id ?? ''),
        destino_tipo: String(rec.destino_tipo ?? ''),
        tipo: String(rec.tipo ?? ''),
        titulo: String(rec.titulo ?? ''),
        cuerpo: String(rec.cuerpo ?? ''),
        leido: toBoolean(rec.leido, false),
        enviado_push: toBoolean(rec.enviado_push, false),
        enviado_email: toBoolean(rec.enviado_email, false),
        created_at: String(rec.created_at ?? nowIso()),
      };
    }).filter(n => n.id);
  },

  /** PATCH /notificaciones/:id/leer */
  async marcarComoLeida(id: string): Promise<{ message: string }> {
    const token = await getToken();
    const result = await http<unknown>('PATCH', `/notificaciones/${id}/leer`, {}, token);
    const rec = isRecord(result) ? result : {};
    return {
      message: String(rec.message ?? 'Marcada como leída'),
    };
  },
};

// ── EVIDENCIAS ────────────────────────────────────────────
export const evidenciasApi = {
  async subir(e: Omit<Evidencia, 'id_evidencia'>): Promise<Evidencia> {
    return {
      ...e,
      id_evidencia: Date.now(),
      sincronizado: true,
    };
  },
};

// ── PERFIL ────────────────────────────────────────────────
export const perfilApi = {
  async obtener() {
    const str = await AsyncStorage.getItem(KEYS.USUARIO);
    if (!str) return { success: true, usuario: null };
    try {
      return { success: true, usuario: JSON.parse(str) as Usuario };
    } catch {
      return { success: true, usuario: null };
    }
  },
};

// ── SYNC ──────────────────────────────────────────────────
export const syncApi = {
  isNetworkError,

  /**
   * Health check mejorado: intenta conectar al servidor
   * Reintenta 3 veces con backoff exponencial
   */
  async healthCheck(urlOverride?: string): Promise<boolean> {
    const base = await getBaseUrl(urlOverride);
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(`${base}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        
        clearTimeout(timeout);
        
        if (res && res.ok) {
          console.log(`✅ Health check OK (${res.status})`);
          return true;
        }
        
        if (res && res.status >= 500) {
          console.warn(`⚠️ Server error ${res.status}, reintentar...`);
          if (attempt < 2) {
            const backoff = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
        }
      } catch (e) {
        console.warn(`[Health Check Attempt ${attempt + 1}] Error:`, e instanceof Error ? e.message : 'Unknown');
        if (attempt < 2) {
          const backoff = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
      }
    }
    
    console.error('❌ Health check failed after 3 retries');
    return false;
  },

  /** POST /sync - Sincroniza operaciones offline */
  async sincronizar(operaciones: Array<{
    operacion: string;
    timestamp: string;
    payload: unknown;
  }>): Promise<SyncResponse> {
    const token = await getToken();
    const json = await http<unknown>('POST', '/sync', { operaciones }, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : (isRecord(json) ? json : {});
    return {
      procesadas: toNumber(rec.procesadas, 0),
      resultados: asArray<unknown>(rec.resultados).map(r => {
        const result = isRecord(r) ? r : {};
        return {
          sync_id: String(result.sync_id ?? ''),
          operacion: String(result.operacion ?? ''),
          exito: toBoolean(result.exito, false),
          mensaje: result.mensaje ? String(result.mensaje) : undefined,
        };
      }),
    };
  },

  /** GET /sync/delta?ultimo_sync=ISO-8601 */
  async delta(ultimo_sync?: string): Promise<{
    sync_ts: string;
    beneficiarios?: Beneficiario[];
    actividades?: Actividad[];
    cadenas?: CadenaProductiva[];
  }> {
    const query = ultimo_sync ? `?ultimo_sync=${encodeURIComponent(ultimo_sync)}` : '';
    const token = await getToken();
    const json = await http<unknown>('GET', `/sync/delta${query}`, undefined, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : (isRecord(json) ? json : {});
    return {
      sync_ts: String(rec.sync_ts ?? nowIso()),
      beneficiarios: asArray<unknown>(rec.beneficiarios).map(b => normalizeBeneficiario(b)),
      actividades: asArray<unknown>(rec.actividades).map(a => normalizeActividad(a)),
      cadenas: asArray<unknown>(rec.cadenas).map(c => {
        const cadena = isRecord(c) ? c : {};
        return {
          id: String(cadena.id ?? ''),
          nombre: String(cadena.nombre ?? ''),
          descripcion: cadena.descripcion ? String(cadena.descripcion) : undefined,
          activo: toBoolean(cadena.activo, true),
          created_by: String(cadena.created_by ?? ''),
          created_at: String(cadena.created_at ?? nowIso()),
          updated_at: String(cadena.updated_at ?? nowIso()),
        };
      }),
    };
  },

  /** Sincroniza bitácoras y beneficiarios pendientes hacia el servidor */
  async sincronizarPendientes(): Promise<{ success: boolean; sincronizadas: number; pendientes: number; errores: string[] }> {
    const online = await this.healthCheck();
    if (!online) {
      return { success: false, sincronizadas: 0, pendientes: 1, errores: ['Sin conexión a internet'] };
    }
    
    const token = await getToken();
    if (!token) {
      return { success: false, sincronizadas: 0, pendientes: 1, errores: ['Sin token de autenticación'] };
    }
    
    let sincronizadas = 0;
    const errores: string[] = [];
    let pendientes = 0;
    
    // Sincronizar bitácoras pendientes
    try {
      const bitacorasPendientes = await offlineQueue.getAllPendingBitacoras();
      if (bitacorasPendientes.length > 0) {
        console.log(`[syncApi] Sincronizando ${bitacorasPendientes.length} bitácoras...`);
        for (const bitacora of bitacorasPendientes) {
          try {
            await http<unknown>('POST', '/bitacoras', bitacora.payload, token);
            sincronizadas++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'error desconocido';
            errores.push(`Bitácora ${bitacora.local_id}: ${msg}`);
            pendientes++;
          }
        }
      }
    } catch (e) {
      console.error('Error sincronizando bitácoras:', e);
    }
    
    // Sincronizar beneficiarios pendientes
    try {
      const benefResult = await offlineQueue.sincronizarBeneficiarios();
      sincronizadas += benefResult.sincronizados;
      errores.push(...benefResult.errores);
      pendientes += benefResult.errores.length;
    } catch (e) {
      console.error('Error sincronizando beneficiarios:', e);
    }
    
    console.log(`[syncApi] Sincronización completada: ${sincronizadas} sincronizadas, ${pendientes} pendientes`);
    return { success: errores.length === 0, sincronizadas, pendientes, errores };
  },
};

// ── OFFLINE QUEUE ─────────────────────────────────────────
// Configuración de límites para la cola offline
const OFFLINE_QUEUE_CONFIG = {
  MAX_ITEMS: 500, // Máximo de items en la cola (aumentado de 100 para producción)
  MAX_SIZE_MB: 50, // Máximo tamaño en MB (aumentado de 10 para jornadas completas)
  CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // Limpiar diariamente
  ITEM_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // Items expiran en 7 días
  QUEUE_WARNING_THRESHOLD: 0.8, // Alertar cuando esté > 80% llena
} as const;

const isValidPendingBitacora = (x: unknown): x is PendingBitacoraUpload => {
  if (!isRecord(x)) return false;
  if (typeof x.local_id !== 'string' || !x.local_id.trim()) return false;
  if (typeof x.created_at !== 'string') return false;
  if (!isRecord(x.payload)) return false;
  if (typeof x.foto_rostro_uri !== 'string') return false;
  if (typeof x.firma_uri !== 'string') return false;
  if (!Array.isArray(x.fotos_campo_uris)) return false;
  return true;
};

export const offlineQueue = {
  async getAllPendingBitacoras(): Promise<PendingBitacoraUpload[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      if (!raw) return [];
      
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('Datos offline no son un array, limpiando');
        await this.clear();
        return [];
      }
      
      const valid = parsed.filter(isValidPendingBitacora);
      const now = Date.now();
      
      // Filtrar items expirados
      const validWithExpiry = valid.filter((item) => {
        const itemAge = now - new Date(item.created_at).getTime();
        if (itemAge > OFFLINE_QUEUE_CONFIG.ITEM_EXPIRY_MS) {
          console.warn(`Item ${item.local_id} expirado (${itemAge}ms), removiendo`);
          return false;
        }
        return true;
      });
      
      // Si hay cambios, guardar
      if (validWithExpiry.length < parsed.length) {
        await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(validWithExpiry));
      }
      
      return validWithExpiry;
    } catch (e) {
      console.error('Error leyendo cola offline:', e);
      return [];
    }
  },

  async pushPendingBitacora(item: PendingBitacoraUpload): Promise<boolean> {
    try {
      const q = await this.getAllPendingBitacoras();
      
      // Verificar límite de items
      if (q.length >= OFFLINE_QUEUE_CONFIG.MAX_ITEMS) {
        console.warn(`Cola offline alcanzó límite de ${OFFLINE_QUEUE_CONFIG.MAX_ITEMS} items`);
        // Remover el más antiguo
        q.shift();
      }
      
      q.push(item);
      const serialized = JSON.stringify(q);
      
      // Verificar tamaño (aproximado)
      const sizeMB = serialized.length / (1024 * 1024);
      if (sizeMB > OFFLINE_QUEUE_CONFIG.MAX_SIZE_MB) {
        console.warn(`Cola offline excede ${OFFLINE_QUEUE_CONFIG.MAX_SIZE_MB}MB (${sizeMB.toFixed(2)}MB)`);
        // Remover items más antiguos hasta caber
        while (q.length > 0 && JSON.stringify(q).length / (1024 * 1024) > OFFLINE_QUEUE_CONFIG.MAX_SIZE_MB * 0.8) {
          q.shift();
        }
      }
      
      await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(q));
      return true;
    } catch (e) {
      console.error('Error guardando bitácora offline:', e);
      return false;
    }
  },

  async replacePendingBitacoras(items: PendingBitacoraUpload[]): Promise<void> {
    try {
      const filtered = items.filter(isValidPendingBitacora).slice(0, OFFLINE_QUEUE_CONFIG.MAX_ITEMS);
      await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error reemplazando cola offline:', e);
    }
  },

  async countPendingBitacoras(): Promise<number> {
    const q = await this.getAllPendingBitacoras();
    return q.length;
  },

  async push(b: Omit<Bitacora, 'id_bitacora'>): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      const parsed = raw ? JSON.parse(raw) : [];
      const q = Array.isArray(parsed) ? parsed : [];
      
      if (q.length >= OFFLINE_QUEUE_CONFIG.MAX_ITEMS) {
        console.warn('Cola offline llena, removiendo item más antiguo');
        q.shift();
      }
      
      q.push({ ...b, uuid_movil: b.uuid_movil || `offline-${Date.now()}` });
      await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(q));
    } catch (e) {
      console.error('Error guardando en cola offline:', e);
    }
  },

  async getAll(): Promise<Bitacora[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => isRecord(x) && typeof x.id_usuario === 'number') as Bitacora[];
    } catch (e) {
      console.error('Error leyendo cola offline:', e);
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.OFFLINE);
    } catch (e) {
      console.error('Error limpiando cola offline:', e);
    }
  },

  /**
   * Retorna información de diagnóstico de la cola
   */
  async getStats(): Promise<{ count: number; sizeMB: number; config: typeof OFFLINE_QUEUE_CONFIG }> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      const sizeMB = raw ? raw.length / (1024 * 1024) : 0;
      const q = await this.getAllPendingBitacoras();
      return { count: q.length, sizeMB, config: OFFLINE_QUEUE_CONFIG };
    } catch (e) {
      console.error('Error obteniendo estadísticas:', e);
      return { count: 0, sizeMB: 0, config: OFFLINE_QUEUE_CONFIG };
    }
  },

  /**
   * Verifica si la cola está llena y retorna porcentaje de uso
   */
  async getQueueFillPercentage(): Promise<number> {
    const stats = await this.getStats();
    return (stats.count / stats.config.MAX_ITEMS) * 100;
  },

  // ── BENEFICIARIOS OFFLINE ───────────────────────────────────
  /**
   * Obtiene todos los beneficiarios pendientes de sincronizar
   */
  async getPendingBeneficiarios(): Promise<PendingBeneficiarioUpload[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.BENEFICIARIOS_OFFLINE);
      if (!raw) return [];
      
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('Datos de beneficiarios offline no son array, limpiando');
        await this.clearBeneficiariosOffline();
        return [];
      }
      
      // Filtrar items válidos y no expirados
      const now = Date.now();
      const valid = parsed.filter((item: PendingBeneficiarioUpload) => {
        if (!item.local_id || !item.payload) return false;
        const itemAge = now - new Date(item.created_at).getTime();
        return itemAge <= OFFLINE_QUEUE_CONFIG.ITEM_EXPIRY_MS;
      });
      
      // Actualizar si hay cambios
      if (valid.length !== parsed.length) {
        await AsyncStorage.setItem(KEYS.BENEFICIARIOS_OFFLINE, JSON.stringify(valid));
      }
      
      return valid;
    } catch (e) {
      console.error('Error leyendo beneficiarios offline:', e);
      return [];
    }
  },

  /**
   * Agrega un beneficiario a la cola offline
   */
  async addPendingBeneficiario(item: PendingBeneficiarioUpload): Promise<boolean> {
    try {
      const q = await this.getPendingBeneficiarios();
      
      // Verificar límite
      if (q.length >= OFFLINE_QUEUE_CONFIG.MAX_ITEMS) {
        console.warn('Cola de beneficiarios llena, removiendo más antiguo');
        q.shift();
      }
      
      q.push(item);
      await AsyncStorage.setItem(KEYS.BENEFICIARIOS_OFFLINE, JSON.stringify(q));
      console.log(`[offlineQueue] Beneficiario ${item.local_id} guardado offline`);
      return true;
    } catch (e) {
      console.error('Error guardando beneficiario offline:', e);
      return false;
    }
  },

  /**
   * Limpia la cola de beneficiarios offline
   */
  async clearBeneficiariosOffline(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.BENEFICIARIOS_OFFLINE);
    } catch (e) {
      console.error('Error limpiando cola de beneficiarios:', e);
    }
  },

  /**
   * Sincroniza todos los beneficiarios pendientes
   */
  async sincronizarBeneficiarios(): Promise<{ sincronizados: number; errores: string[] }> {
    const token = await getToken();
    if (!token) {
      return { sincronizados: 0, errores: ['No hay token de autenticación'] };
    }
    
    const pendientes = await this.getPendingBeneficiarios();
    if (pendientes.length === 0) {
      return { sincronizados: 0, errores: [] };
    }
    
    const errores: string[] = [];
    let sincronizados = 0;
    const restantes: PendingBeneficiarioUpload[] = [];
    
    for (const item of pendientes) {
      try {
        await http<unknown>('POST', '/beneficiarios', item.payload, token);
        sincronizados++;
        console.log(`[sync] Beneficiario ${item.local_id} sincronizado`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'error desconocido';
        errores.push(`Error sincronizando ${item.local_id}: ${msg}`);
        // Mantener en cola para reintentar
        restantes.push(item);
      }
    }
    
    // Actualizar cola con los que fallaron
    await AsyncStorage.setItem(KEYS.BENEFICIARIOS_OFFLINE, JSON.stringify(restantes));
    
    return { sincronizados, errores };
  },
};
