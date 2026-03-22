import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { KEYS } from '../lib/api';
import { Usuario } from '../types/models';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  isOffline: boolean;
  setAuth: (token: string, usuario: Usuario, demo?: boolean) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setOffline: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null, usuario: null, isAuthenticated: false,
  isLoading: true, isDemo: false, isOffline: false,

  setAuth: async (token, usuario, demo = false) => {
    await AsyncStorage.multiSet([[KEYS.TOKEN, token], [KEYS.USUARIO, JSON.stringify(usuario)]]);
    set({ token, usuario, isAuthenticated: true, isDemo: demo });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
    set({ token: null, usuario: null, isAuthenticated: false, isDemo: false });
  },

  loadAuth: async () => {
    try {
      const [[, token], [, str]] = await AsyncStorage.multiGet([KEYS.TOKEN, KEYS.USUARIO]);
      if (token && str) {
        // Validar que str sea JSON válido antes de parsear
        const trimmed = str.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const usuario = JSON.parse(str);
            set({ token, usuario, isAuthenticated: true, isDemo: token === 'demo-token-saderh-local' });
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
