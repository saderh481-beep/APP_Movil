import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { KEYS } from './config';
import { http, isLikelyNetworkError } from './http';
import { isRecord, unwrapData, normalizeAccessCode, nowIso } from './utils';
import { AuthResponse, ApiResponse, Usuario } from '../../types/models';

type OfflineAuthSession = {
  codigo: string;
  token: string;
  tecnico: Usuario;
  saved_at: string;
};

const loginAttempts: Record<string, { count: number; resetTime: number }> = {};

const checkLoginRateLimit = async (codigo: string): Promise<void> => {
  const now = Date.now();
  const key = codigo;
  
  if (loginAttempts[key]) {
    const attempt = loginAttempts[key];
    
    if (now > attempt.resetTime) {
      loginAttempts[key] = { count: 0, resetTime: now + 5 * 60 * 1000 };
      return;
    }
    
    if (attempt.count >= 3) {
      const backoff = Math.pow(2, attempt.count - 3) * 10_000;
      const waitTime = Math.min(backoff, 5 * 60 * 1000);
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

const saveOfflineAuthSession = async (codigo: string, token: string, tecnico: Usuario): Promise<void> => {
  const payload: OfflineAuthSession = {
    codigo: normalizeAccessCode(codigo),
    token,
    tecnico,
    saved_at: nowIso(),
  };
  await AsyncStorage.setItem(KEYS.OFFLINE_AUTH, JSON.stringify(payload));
};

const getOfflineAuthSession = async (): Promise<OfflineAuthSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.codigo !== 'string' || !isRecord(parsed.tecnico)) return null;
    return {
      codigo: normalizeAccessCode(parsed.codigo),
      token: typeof parsed.token === 'string' && parsed.token ? parsed.token : 'offline-session',
      tecnico: parsed.tecnico as unknown as Usuario,
      saved_at: typeof parsed.saved_at === 'string' ? parsed.saved_at : nowIso(),
    };
  } catch {
    return null;
  }
};

export const getToken = async () => {
  try {
    console.log('[API] Intentando obtener token de SecureStore...');
    let token = await SecureStore.getItemAsync(KEYS.TOKEN);
    if (token && token.trim().length > 0) {
      console.log('[API] Token encontrado en SecureStore, longitud:', token.length);
      return token;
    }
    console.log('[API] Token no encontrado en SecureStore, buscando en AsyncStorage...');
    token = await AsyncStorage.getItem(KEYS.TOKEN);
    console.log('[API] Token encontrado en AsyncStorage:', token ? 'Sí, longitud: ' + token.length : 'No');
    return token && token.trim().length > 0 ? token : undefined;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    try {
      const token = await AsyncStorage.getItem(KEYS.TOKEN);
      return token && token.trim().length > 0 ? token : undefined;
    } catch {
      return undefined;
    }
  }
};

export const authApi = {
  async login(codigo: string): Promise<AuthResponse> {
    await checkLoginRateLimit(codigo);
    
    try {
      const json = await http<unknown>('POST', '/auth/tecnico', { codigo });
      const data = unwrapData(json);
      const src = isRecord(data) ? data : {};
      const root = isRecord(json) ? json : {};
      const tokenValue = src.token ?? src.access_token ?? root.token ?? root.access_token;
      const token = typeof tokenValue === 'string' ? tokenValue : '';
      if (!token) throw new Error('No se recibió token de autenticación');

      const tecnicoRaw = src.tecnico ?? root.tecnico ?? src.usuario ?? root.usuario ?? src;
      const tecnico = isRecord(tecnicoRaw) ? {
        id: String(tecnicoRaw.id ?? tecnicoRaw.id_usuario ?? ''),
        nombre: String(tecnicoRaw.nombre ?? tecnicoRaw.nombre_completo ?? ''),
        rol: typeof tecnicoRaw.rol === 'string' ? tecnicoRaw.rol : 'tecnico',
      } : { id: '', nombre: '', rol: 'tecnico' };

      if (!tecnico.id || !tecnico.nombre) {
        throw new Error('Respuesta de login inválida: falta id o nombre del técnico');
      }

      recordLoginAttempt(codigo, true);
      await saveOfflineAuthSession(codigo, token, tecnico);
      return { success: true, token, tecnico };
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        const offlineSession = await getOfflineAuthSession();
        const normalizedCodigo = normalizeAccessCode(codigo);
        if (offlineSession && offlineSession.codigo === normalizedCodigo) {
          recordLoginAttempt(codigo, true);
          return {
            success: true,
            token: offlineSession.token || 'offline-session',
            tecnico: offlineSession.tecnico,
            offline: true,
          };
        }
        throw new Error('Sin conexión y no existe una sesión local válida para este código en este dispositivo.');
      }
      recordLoginAttempt(codigo, false);
      throw e;
    }
  },

  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
    } catch {}
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
  },

  async forgotPassword(_email: string): Promise<ApiResponse> {
    return { success: false, message: 'Recuperación de contraseña no disponible en esta app.' };
  },
};
