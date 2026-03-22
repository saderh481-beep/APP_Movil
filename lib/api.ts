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
  CrearBeneficiarioPayload,
  Evidencia,
  Usuario,
} from '../types/models';
import { DEMO_ASIGNACIONES, DEMO_BENEFICIARIOS, DEMO_TOKEN, DEMO_USUARIO } from './demoData';

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
} as const;

export interface PendingBitacoraUpload {
  local_id: string;
  created_at: string;
  payload: Omit<Bitacora, 'id_bitacora'>;
  foto_rostro_uri: string;
  firma_uri: string;
  fotos_campo_uris: string[];
}

type ConnectionConfig = { appApiUrl?: string; modoDemo?: boolean };

const runtime = {
  loaded: false,
  appApiUrl: API_CONFIG.APP_API_URL,
  demoMode: API_CONFIG.DEMO_MODE,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const getToken = async () => (await AsyncStorage.getItem(KEYS.TOKEN)) ?? '';

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
  return { appApiUrl: cfg.appApiUrl, modoDemo: cfg.demoMode };
};

export const saveConnectionInfo = async (next: ConnectionConfig) => {
  const merged = {
    appApiUrl: normalizeBaseUrl(next.appApiUrl ?? runtime.appApiUrl ?? API_CONFIG.APP_API_URL),
    modoDemo: next.modoDemo ?? runtime.demoMode ?? API_CONFIG.DEMO_MODE,
  };
  runtime.appApiUrl = merged.appApiUrl;
  runtime.demoMode = merged.modoDemo;
  runtime.loaded = true;
  await AsyncStorage.setItem(KEYS.CONEXION, JSON.stringify(merged));
};

const getBaseUrl = async (override?: string): Promise<string> => {
  if (override && override.trim().length > 0) return normalizeBaseUrl(override);
  const cfg = await loadRuntimeConfig();
  return normalizeBaseUrl(cfg.appApiUrl);
};

const getDemoMode = async (): Promise<boolean> => {
  const cfg = await loadRuntimeConfig();
  return cfg.demoMode;
};

const normalizeUsuario = (raw: unknown, codigoFallback: string): Usuario => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id_usuario: toNumber(rec.id_usuario ?? rec.id ?? rec.id_tecnico ?? 0, 0),
    nombre_completo: String(rec.nombre_completo ?? rec.nombre ?? rec.nombre_tecnico ?? 'Técnico'),
    email: String(rec.email ?? ''),
    rol: (String(rec.rol ?? 'TECNICO').toUpperCase() as Usuario['rol']),
    especialidad: rec.especialidad ? String(rec.especialidad).toUpperCase() as Usuario['especialidad'] : null,
    puede_registrar_beneficiarios: toBoolean(rec.puede_registrar_beneficiarios ?? rec.puede_registrar ?? false),
    zona_nombre: rec.zona_nombre ? String(rec.zona_nombre) : null,
    codigo_acceso: String(rec.codigo_acceso ?? codigoFallback),
    ultimo_acceso: rec.ultimo_acceso ? String(rec.ultimo_acceso) : null,
  };
};

const normalizeBeneficiario = (raw: unknown): Beneficiario => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id_beneficiario: toNumber(rec.id_beneficiario ?? rec.id ?? 0, 0),
    nombre_completo: String(rec.nombre_completo ?? rec.nombre ?? 'Beneficiario'),
    curp: String(rec.curp ?? rec.CURP ?? ''),
    municipio: String(rec.municipio ?? rec.municipio_nombre ?? ''),
    localidad: String(rec.localidad ?? rec.localidad_nombre ?? ''),
    folio_saderh: String(rec.folio_saderh ?? rec.folio ?? ''),
    latitud_predio: rec.latitud_predio !== undefined ? toNumber(rec.latitud_predio, 0) : null,
    longitud_predio: rec.longitud_predio !== undefined ? toNumber(rec.longitud_predio, 0) : null,
    cadena_productiva: String(rec.cadena_productiva ?? rec.cadena ?? rec.cultivo ?? ''),
    telefono_contacto: rec.telefono_contacto ? String(rec.telefono_contacto) : null,
    estatus_beneficiario: (String(rec.estatus_beneficiario ?? rec.estatus ?? 'ACTIVO').toUpperCase() as Beneficiario['estatus_beneficiario']),
  };
};

const normalizeAsignacion = (raw: unknown): Asignacion => {
  const rec = isRecord(raw) ? raw : {};
  const beneficiarioRaw = rec.beneficiario ?? rec.beneficiario_data ?? rec.beneficiary ?? null;
  const beneficiario = beneficiarioRaw ? normalizeBeneficiario(beneficiarioRaw) : undefined;
  const fechaLimite = toIsoDate(rec.fecha_limite ?? rec.fecha_programada ?? rec.fecha ?? nowIso(), nowIso());
  const completado = toBoolean(
    rec.completado ??
      rec.finalizada ??
      (typeof rec.estatus === 'string' && ['CERRADA', 'COMPLETADA', 'FINALIZADA'].includes(rec.estatus.toUpperCase())),
    false,
  );

  const tipo = String(rec.tipo_asignacion ?? rec.tipo ?? 'ACTIVIDAD').toUpperCase();
  const prioridad = String(rec.prioridad ?? 'MEDIA').toUpperCase();

  return {
    id_asignacion: toNumber(rec.id_asignacion ?? rec.id_actividad ?? rec.id ?? 0, 0),
    id_tecnico: toNumber(rec.id_tecnico ?? rec.id_usuario ?? 0, 0),
    id_usuario_creo: toNumber(rec.id_usuario_creo ?? rec.id_creador ?? 0, 0),
    id_beneficiario: toNumber(rec.id_beneficiario ?? beneficiario?.id_beneficiario ?? 0, 0),
    tipo_asignacion: (tipo === 'BENEFICIARIO' ? 'BENEFICIARIO' : 'ACTIVIDAD'),
    descripcion_actividad: rec.descripcion_actividad ? String(rec.descripcion_actividad) : rec.descripcion ? String(rec.descripcion) : null,
    prioridad: (['ALTA', 'MEDIA', 'BAJA'].includes(prioridad) ? prioridad : 'MEDIA') as Asignacion['prioridad'],
    fecha_limite: fechaLimite.includes('T') ? fechaLimite.split('T')[0] : fechaLimite,
    completado,
    fecha_completado: rec.fecha_completado ? String(rec.fecha_completado) : null,
    fecha_creacion: toIsoDate(rec.fecha_creacion ?? rec.created_at ?? nowIso(), nowIso()),
    beneficiario,
  };
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

async function http<T>(method: string, path: string, body?: unknown, token?: string, baseUrlOverride?: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT_MS);
  try {
    const base = await getBaseUrl(baseUrlOverride);
    const res = await fetch(`${base}${path}`, {
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

const uploadSingleWithFallback = async (
  path: string,
  uri: string,
  candidates: string[],
  token: string,
) => {
  let lastError: unknown;
  for (const field of candidates) {
    try {
      const file = buildUploadFile(uri, field);
      const form = new FormData();
      form.append(field, file as unknown as Blob);
      return await httpMultipart<ApiResponse>('POST', path, form, token);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudo subir el archivo');
};

const uploadManyWithFallback = async (
  path: string,
  uris: string[],
  candidates: string[],
  token: string,
) => {
  let lastError: unknown;
  for (const field of candidates) {
    try {
      const form = new FormData();
      uris.forEach((uri, idx) => {
        const file = buildUploadFile(uri, `${field}-${idx + 1}`);
        form.append(field, file as unknown as Blob);
      });
      return await httpMultipart<ApiResponse>('POST', path, form, token);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudieron subir las fotos');
};

const extractBitacoraId = (raw: unknown): number | undefined => {
  const first = unwrapData(raw);
  if (isRecord(first)) {
    const direct = toNumber(first.id_bitacora ?? first.id ?? NaN, NaN);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (isRecord(first.bitacora)) {
      const nested = toNumber(first.bitacora.id_bitacora ?? first.bitacora.id ?? NaN, NaN);
      if (Number.isFinite(nested) && nested > 0) return nested;
    }
  }
  return undefined;
};

// ── AUTH ──────────────────────────────────────────────────
export const authApi = {
  /** POST /auth/tecnico */
  async login(codigo: string): Promise<AuthResponse> {
    if (await getDemoMode()) {
      await wait(600);
      if (codigo.length === 5) return { success: true, token: DEMO_TOKEN, usuario: DEMO_USUARIO };
      throw new Error('Código de acceso incorrecto');
    }

    const json = await http<unknown>('POST', '/auth/tecnico', { codigo, codigo_acceso: codigo });
    const data = unwrapData(json);
    const src = isRecord(data) ? data : {};
    const root = isRecord(json) ? json : {};
    const tokenValue = src.token ?? src.access_token ?? root.token ?? root.access_token;
    const token = typeof tokenValue === 'string' ? tokenValue : '';
    if (!token) throw new Error('No se recibió token de autenticación');

    const userRaw = src.usuario ?? src.tecnico ?? src.user ?? root.usuario ?? root.tecnico ?? root.user;
    const usuario = normalizeUsuario(userRaw, codigo);
    return { success: true, token, usuario };
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
  },

  async forgotPassword(_email: string): Promise<ApiResponse> {
    return { success: false, message: 'Recuperación de contraseña no disponible en esta app.' };
  },
};

// ── ACTIVIDADES / ASIGNACIONES ────────────────────────────
export const asignacionesApi = {
  /** GET /mis-actividades */
  async listar(soloActivas = false): Promise<AsignacionesResponse> {
    if (await getDemoMode()) {
      await wait(500);
      const data = soloActivas ? DEMO_ASIGNACIONES.filter((a) => !a.completado) : DEMO_ASIGNACIONES;
      return { success: true, asignaciones: data, total: data.length };
    }

    const token = await getToken();
    const json = await http<unknown>('GET', '/mis-actividades', undefined, token);
    const data = unwrapData(json);

    const arr =
      asArray<unknown>((isRecord(data) && data.actividades) || (isRecord(data) && data.asignaciones) || data);
    const list = arr.map(normalizeAsignacion).filter((a) => a.id_asignacion > 0);
    const filtered = soloActivas ? list.filter((a) => !a.completado) : list;
    return { success: true, asignaciones: filtered, total: filtered.length };
  },

  async completar(_id: number): Promise<ApiResponse> {
    return { success: true, message: 'La actividad se marca al cerrar la bitácora.' };
  },
};

// ── BENEFICIARIOS ─────────────────────────────────────────
export const beneficiariosApi = {
  /** GET /mis-beneficiarios */
  async listar(search?: string): Promise<BeneficiariosResponse> {
    if (await getDemoMode()) {
      await wait(500);
      const data = search
        ? DEMO_BENEFICIARIOS.filter((b) =>
            [b.nombre_completo, b.municipio, b.folio_saderh].some((f) =>
              f.toLowerCase().includes(search.toLowerCase()),
            ),
          )
        : DEMO_BENEFICIARIOS;
      return { success: true, beneficiarios: data, total: data.length };
    }

    const token = await getToken();
    const json = await http<unknown>('GET', '/mis-beneficiarios', undefined, token);
    const data = unwrapData(json);
    const arr =
      asArray<unknown>((isRecord(data) && data.beneficiarios) || (isRecord(data) && data.items) || data);
    let list = arr.map(normalizeBeneficiario).filter((b) => b.id_beneficiario > 0);

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        [b.nombre_completo, b.municipio, b.folio_saderh].some((f) => f.toLowerCase().includes(q)),
      );
    }

    return { success: true, beneficiarios: list, total: list.length };
  },

  async obtener(id: number) {
    const list = await this.listar();
    const beneficiario = list.beneficiarios.find((b) => b.id_beneficiario === id);
    return { success: true, beneficiario };
  },

  async crear(payload: CrearBeneficiarioPayload) {
    if (await getDemoMode()) {
      await wait(800);
      const nuevo = {
        ...payload,
        id_beneficiario: Date.now(),
        latitud_predio: null,
        longitud_predio: null,
        telefono_contacto: payload.telefono_contacto ?? null,
        estatus_beneficiario: 'ACTIVO' as const,
      };
      (DEMO_BENEFICIARIOS as Beneficiario[]).push(nuevo);
      return { success: true, beneficiario: nuevo };
    }

    const token = await getToken();
    try {
      return await http<unknown>('POST', '/mis-beneficiarios', payload, token);
    } catch (e) {
      throw new Error(
        e instanceof Error && e.message.includes('404')
          ? 'La API actual no expone alta de beneficiarios desde esta app móvil.'
          : e instanceof Error
            ? e.message
            : 'No se pudo registrar el beneficiario',
      );
    }
  },
};

// ── BITÁCORAS ─────────────────────────────────────────────
export const bitacorasApi = {
  /** POST /bitacoras */
  async crear(b: Omit<Bitacora, 'id_bitacora'>): Promise<ApiResponse<Bitacora>> {
    if (await getDemoMode()) {
      await wait(700);
      return { success: true, data: { ...b, id_bitacora: Date.now(), sincronizado: true } };
    }

    const token = await getToken();
    const payload = {
      ...b,
      id_tecnico: b.id_usuario,
      id_actividad: b.id_asignacion,
    };
    const json = await http<unknown>('POST', '/bitacoras', payload, token);
    const id = extractBitacoraId(json);
    const data = unwrapData(json);
    const merged = isRecord(data) ? { ...b, ...(data as Partial<Bitacora>) } : { ...b };
    return {
      success: true,
      data: {
        ...merged,
        id_bitacora: merged.id_bitacora ?? id,
        sincronizado: true,
      },
    };
  },

  /** GET /bitacoras */
  async listar(): Promise<ApiResponse<Bitacora[]>> {
    const token = await getToken();
    const json = await http<unknown>('GET', '/bitacoras', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<Bitacora>((isRecord(data) && data.bitacoras) || data);
    return { success: true, data: arr };
  },

  /** GET /bitacoras/:id */
  async detalle(id: number): Promise<ApiResponse<Bitacora>> {
    const token = await getToken();
    const json = await http<unknown>('GET', `/bitacoras/${id}`, undefined, token);
    const data = unwrapData(json);
    return { success: true, data: (isRecord(data) ? (data as unknown as Bitacora) : undefined) };
  },

  /** PATCH /bitacoras/:id */
  async editar(id: number, payload: Partial<Bitacora>): Promise<ApiResponse<Bitacora>> {
    const token = await getToken();
    const json = await http<unknown>('PATCH', `/bitacoras/${id}`, payload, token);
    const data = unwrapData(json);
    return { success: true, data: (isRecord(data) ? (data as unknown as Bitacora) : undefined) };
  },

  /** POST /bitacoras/:id/cerrar */
  async cerrar(id: number): Promise<ApiResponse> {
    const token = await getToken();
    return http<ApiResponse>('POST', `/bitacoras/${id}/cerrar`, {}, token);
  },

  /** POST /bitacoras/:id/foto-rostro */
  async subirFotoRostro(id: number, uri: string): Promise<ApiResponse> {
    const token = await getToken();
    return uploadSingleWithFallback(`/bitacoras/${id}/foto-rostro`, uri, ['foto_rostro', 'foto', 'archivo', 'file'], token);
  },

  /** POST /bitacoras/:id/firma */
  async subirFirma(id: number, uri: string): Promise<ApiResponse> {
    const token = await getToken();
    return uploadSingleWithFallback(`/bitacoras/${id}/firma`, uri, ['firma', 'archivo', 'file'], token);
  },

  /** POST /bitacoras/:id/fotos-campo */
  async subirFotosCampo(id: number, uris: string[]): Promise<ApiResponse> {
    if (!uris.length) return { success: true };
    const token = await getToken();
    return uploadManyWithFallback(`/bitacoras/${id}/fotos-campo`, uris, ['fotos', 'fotos[]', 'foto', 'archivo'], token);
  },

  /** DELETE /bitacoras/:id */
  async eliminar(id: number): Promise<ApiResponse> {
    const token = await getToken();
    return http<ApiResponse>('DELETE', `/bitacoras/${id}`, undefined, token);
  },
};

// ── EVIDENCIAS ────────────────────────────────────────────
export const evidenciasApi = {
  async subir(e: Omit<Evidencia, 'id_evidencia'>): Promise<ApiResponse<Evidencia>> {
    return {
      success: true,
      data: { ...e, id_evidencia: Date.now(), sincronizado: true },
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

  async healthCheck(urlOverride?: string): Promise<boolean> {
    const base = await getBaseUrl(urlOverride);
    try {
      const res = await fetch(`${base}/mis-actividades`);
      return res.status > 0 && res.status < 500;
    } catch {
      return false;
    }
  },

  /** POST /sync */
  async sincronizar(bitacoras: Bitacora[]) {
    if (await getDemoMode()) return { success: true, sincronizadas: bitacoras.length };
    return http<unknown>('POST', '/sync', { bitacoras }, await getToken());
  },

  /** GET /sync/delta */
  async delta(desde?: string) {
    const query = desde ? `?desde=${encodeURIComponent(desde)}` : '';
    return http<unknown>('GET', `/sync/delta${query}`, undefined, await getToken());
  },

  async subirBitacoraPendiente(item: PendingBitacoraUpload): Promise<number> {
    const creada = await bitacorasApi.crear(item.payload);
    const idBitacora = creada.data?.id_bitacora;
    if (!idBitacora) throw new Error('La API no devolvió id de bitácora al sincronizar.');

    await bitacorasApi.subirFotoRostro(idBitacora, item.foto_rostro_uri);
    await bitacorasApi.subirFirma(idBitacora, item.firma_uri);
    if (item.fotos_campo_uris.length > 0) {
      await bitacorasApi.subirFotosCampo(idBitacora, item.fotos_campo_uris);
    }
    await bitacorasApi.cerrar(idBitacora);
    return idBitacora;
  },

  async sincronizarPendientes() {
    const pendientes = await offlineQueue.getAllPendingBitacoras();
    if (!pendientes.length) return { success: true, sincronizadas: 0, pendientes: 0, errores: [] as string[] };

    let currentUserId = 0;
    try {
      const usr = await AsyncStorage.getItem(KEYS.USUARIO);
      if (usr) {
        const parsed = JSON.parse(usr) as { id_usuario?: number };
        currentUserId = typeof parsed.id_usuario === 'number' ? parsed.id_usuario : 0;
      }
    } catch {}

    const procesables = currentUserId
      ? pendientes.filter((p) => p.payload.id_usuario === currentUserId)
      : pendientes;

    const restantesIniciales = currentUserId
      ? pendientes.filter((p) => p.payload.id_usuario !== currentUserId)
      : [];

    const online = await this.healthCheck();
    if (!online) {
      return { success: false, sincronizadas: 0, pendientes: pendientes.length, errores: ['Sin conexión a internet'] };
    }

    let sincronizadas = 0;
    const restantes: PendingBitacoraUpload[] = [...restantesIniciales];
    const errores: string[] = [];

    for (const item of procesables) {
      try {
        await this.subirBitacoraPendiente(item);
        sincronizadas += 1;
        const uris = [item.foto_rostro_uri, item.firma_uri, ...item.fotos_campo_uris];
        await Promise.all(
          uris
            .filter((u) => typeof u === 'string' && u.startsWith('file://'))
            .map((u) => FileSystem.deleteAsync(u, { idempotent: true }).catch(() => {})),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        errores.push(`${item.local_id}: ${msg}`);
        restantes.push(item);
        if (isNetworkError(e)) {
          restantes.push(...procesables.slice(procesables.indexOf(item) + 1));
          break;
        }
      }
    }

    await offlineQueue.replacePendingBitacoras(restantes);
    return {
      success: restantes.length === 0,
      sincronizadas,
      pendientes: restantes.length,
      errores,
    };
  },
};

// ── OFFLINE QUEUE ─────────────────────────────────────────
export const offlineQueue = {
  async getAllPendingBitacoras(): Promise<PendingBitacoraUpload[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (x) =>
          isRecord(x) &&
          typeof x.local_id === 'string' &&
          isRecord(x.payload) &&
          typeof x.foto_rostro_uri === 'string' &&
          typeof x.firma_uri === 'string' &&
          Array.isArray(x.fotos_campo_uris),
      ) as PendingBitacoraUpload[];
    } catch (e) {
      console.error('Error leyendo cola offline:', e);
      return [];
    }
  },

  async pushPendingBitacora(item: PendingBitacoraUpload) {
    try {
      const q = await this.getAllPendingBitacoras();
      q.push(item);
      await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(q));
    } catch (e) {
      console.error('Error guardando bitácora offline:', e);
    }
  },

  async replacePendingBitacoras(items: PendingBitacoraUpload[]) {
    await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(items));
  },

  async countPendingBitacoras(): Promise<number> {
    const q = await this.getAllPendingBitacoras();
    return q.length;
  },

  async push(b: Omit<Bitacora, 'id_bitacora'>) {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE);
      const parsed = raw ? JSON.parse(raw) : [];
      const q = Array.isArray(parsed) ? parsed : [];
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

  async clear() {
    await AsyncStorage.removeItem(KEYS.OFFLINE);
  },
};
