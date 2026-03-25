import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { KEYS } from '../lib/api';
import { Usuario } from '../types/models';

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
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null, tecnico: null, isAuthenticated: false,
  isLoading: true, isOffline: false,

  setAuth: async (token, usuario) => {
    await AsyncStorage.multiSet([[KEYS.TOKEN, token], [KEYS.USUARIO, JSON.stringify(usuario)]]);
    set({ token, tecnico: usuario, isAuthenticated: true });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
    set({ token: null, tecnico: null, isAuthenticated: false });
  },

  loadAuth: async () => {
    try {
      const [[, token], [, str]] = await AsyncStorage.multiGet([KEYS.TOKEN, KEYS.USUARIO]);
      if (token && str) {
        // Validar token JWT antes de aceptar la sesión
        if (!isTokenValid(token)) {
          console.warn('Token inválido o expirado, limpiando sesión');
          await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
          set({ isLoading: false });
          return;
        }
        // Validar que str sea JSON válido antes de parsear
        const trimmed = str.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const usuario = JSON.parse(str) as Usuario;
            set({ token, tecnico: usuario, isAuthenticated: true });
          } catch {
            // JSON inválido - limpiar
            await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
          }
        } else {
          // Formato inválido - limpiar
          await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
        }
      }
    } catch (e) {
      console.error('Error cargando sesión:', e);
    }
    finally { set({ isLoading: false }); }
  },

  setOffline: (v) => set({ isOffline: v }),
}));
