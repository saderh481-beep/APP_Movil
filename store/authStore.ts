import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { KEYS } from '../lib/api';
import { Usuario, EstadoCorte } from '../types/models';

// Utilidad para validar JWT (manejando correctamente Unicode)
const decodeBase64Url = (str: string): string => {
  // Reemplazar caracteres URL-safe y añadir padding si es necesario
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  
  // Decodificar manejando correctamente UTF-8
  const decoded = atob(base64);
  // Convertir de Latin1 a UTF-8
  return decodeURIComponent(decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.length < 20) return false;
  
  // Verificar formato estricto JWT (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Validar que cada parte tenga contenido
  if (!parts[0] || !parts[1] || !parts[2]) return false;
  if (parts[0].length < 4 || parts[1].length < 4 || parts[2].length < 4) return false;
  
  try {
    // Decodificar header para validación adicional
    const header = JSON.parse(decodeBase64Url(parts[0]));
    if (!header.typ || (header.typ.toUpperCase() !== 'JWT' && header.typ !== 'JWT')) {
      // Algunos servidores no incluyen typ, así que es opcional
    }
    if (!header.alg) return false; // alg es requerido
    
    // Decodificar el payload
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload || typeof payload !== 'object') return false;
    
    // Verificar expiración si existe
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      // Agregar buffer de 30 segundos antes de expiración
      return payload.exp > (now + 30);
    }
    
    // Si no hay exp, verificar que al menos tenga iat (issued at)
    if (!payload.iat || typeof payload.iat !== 'number') {
      console.warn('Token JWT sin fecha de emisión (iat)');
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('Error validando JWT:', e instanceof Error ? e.message : 'Desconocido');
    return false;
  }
};

interface AuthState {
  token: string | null;
  tecnico: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  setAuth: (token: string, usuario: Usuario) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setOffline: (v: boolean) => void;
  getTecnicoId: () => string;
}

const validateUsuario = (data: unknown): Usuario | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.id !== 'string' && typeof obj.id !== 'number') return null;
  if (typeof obj.nombre !== 'string') return null;
  return {
    id: String(obj.id),
    nombre: String(obj.nombre),
    rol: typeof obj.rol === 'string' ? obj.rol : 'tecnico',
    email: typeof obj.email === 'string' ? obj.email : undefined,
    fecha_limite: typeof obj.fecha_limite === 'string' ? obj.fecha_limite : undefined,
    estado_corte: typeof obj.estado_corte === 'string' ? obj.estado_corte as EstadoCorte : undefined,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null, tecnico: null, isAuthenticated: false,
  isLoading: true, isOffline: false,

  setAuth: async (token, usuario) => {
    console.log('[AUTH STORE] Guardando token en SecureStore...');
    try {
      await SecureStore.setItemAsync(KEYS.TOKEN, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      await AsyncStorage.setItem(KEYS.USUARIO, JSON.stringify(usuario));
      
      const storedToken = await SecureStore.getItemAsync(KEYS.TOKEN);
      console.log('[AUTH STORE] Token almacenado correctamente:', storedToken ? 'Sí' : 'NO');
    } catch (error) {
      console.error('[AUTH STORE] Error guardando en SecureStore:', error);
      await AsyncStorage.setItem(KEYS.TOKEN, token);
      await AsyncStorage.setItem(KEYS.USUARIO, JSON.stringify(usuario));
    }
    
    set({ token, tecnico: usuario, isAuthenticated: true });
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
    } catch {}
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
    set({ token: null, tecnico: null, isAuthenticated: false });
  },

  loadAuth: async () => {
    let token: string | null = null;
    let str: string | null = null;
    
    try {
      token = await SecureStore.getItemAsync(KEYS.TOKEN);
    } catch {}
    
    if (!token) {
      try {
        token = await AsyncStorage.getItem(KEYS.TOKEN);
      } catch {}
    }
    
    try {
      str = await AsyncStorage.getItem(KEYS.USUARIO);
    } catch {}
    
    if (token && str) {
      if (!isTokenValid(token)) {
        console.warn('Token inválido o expirado, limpiando sesión');
        try {
          await SecureStore.deleteItemAsync(KEYS.TOKEN);
        } catch {}
        await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
        set({ isLoading: false });
        return;
      }
      const trimmed = str.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(str);
          const usuario = validateUsuario(parsed);
          if (!usuario) {
            console.warn('Usuario inválido, limpiando sesión');
            await SecureStore.deleteItemAsync(KEYS.TOKEN).catch(() => {});
            await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
            set({ isLoading: false });
            return;
          }
          set({ token, tecnico: usuario, isAuthenticated: true, isLoading: false });
        } catch {
          try {
            await SecureStore.deleteItemAsync(KEYS.TOKEN);
          } catch {}
          await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
          set({ isLoading: false });
        }
      } else {
        try {
          await SecureStore.deleteItemAsync(KEYS.TOKEN);
        } catch {}
        await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  setOffline: (v) => set({ isOffline: v }),

  getTecnicoId: (): string => {
    const state = useAuthStore.getState();
    if (!state.tecnico?.id) {
      console.warn('[AUTH STORE] getTecnicoId: tecnico.id es undefined');
      return '';
    }
    return String(state.tecnico.id);
  },
}));
