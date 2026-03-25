/**
 * SADERH — Secure Storage Utilities
 * Manejo seguro de tokens y datos sensibles
 * 
 * Usa expo-secure-store cuando esté disponible,
 * con fallback a AsyncStorage en desarrollo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Intenta usar SecureStore si está disponible
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  console.warn('expo-secure-store no disponible, usando AsyncStorage como fallback');
}

const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.dev === true;
const USE_SECURE_STORE = SecureStore && !isDevelopment;

export interface StorageKey {
  key: string;
  sensitive: boolean;
  encrypt: boolean;
}

/**
 * Obtiene un valor del almacenamiento (seguro o no según tipo)
 */
export async function getItem(key: string, isSensitive = false): Promise<string | null> {
  try {
    if (isSensitive && USE_SECURE_STORE) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`Error leyendo ${key}:`, e);
    return null;
  }
}

/**
 * Guarda un valor en el almacenamiento (seguro o no según tipo)
 */
export async function setItem(key: string, value: string, isSensitive = false): Promise<void> {
  try {
    if (isSensitive && USE_SECURE_STORE) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Error guardando ${key}:`, e);
    // No lanzar excepción - fallar silenciosamente
    throw new Error(`No se pudo guardar ${key}`);
  }
}

/**
 * Elimina un valor
 */
export async function removeItem(key: string, isSensitive = false): Promise<void> {
  try {
    if (isSensitive && USE_SECURE_STORE) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.error(`Error eliminando ${key}:`, e);
  }
}

/**
 * Elimina múltiples valores
 */
export async function removeItems(keys: string[], areSensitive = false): Promise<void> {
  try {
    if (areSensitive && USE_SECURE_STORE) {
      await Promise.all(keys.map(k => SecureStore.deleteItemAsync(k)));
    } else {
      await AsyncStorage.multiRemove(keys);
    }
  } catch (e) {
    console.error('Error eliminando múltiples items:', e);
  }
}

/**
 * Información de diagnóstico
 */
export function getStorageInfo() {
  return {
    isDevelopment,
    useSecureStore: USE_SECURE_STORE,
    backendStorage: USE_SECURE_STORE ? 'SecureStore (encrypted)' : 'AsyncStorage (plain)',
  };
}
