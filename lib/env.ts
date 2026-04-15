export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_APP_API_URL || 'https://campo-api-app-production.up.railway.app',
  WEB_API_URL: process.env.EXPO_PUBLIC_WEB_API_URL || 'https://campo-api-app-production.up.railway.app',
  NODE_ENV: process.env.NODE_ENV || 'production',
  DEBUG: process.env.DEBUG === 'true',
} as const;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, KEYS } from './api/config';

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateEnvironment(): Promise<EnvValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const apiUrl = API_CONFIG.APP_API_URL;
  if (!apiUrl) {
    errors.push('APP_API_URL no está configurada');
  } else {
    try {
      const url = new URL(apiUrl);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        warnings.push(`La URL de API usa protocolo no seguro: ${url.protocol}`);
      }
    } catch {
      errors.push(`APP_API_URL no es una URL válida: ${apiUrl}`);
    }
  }

  if (API_CONFIG.TIMEOUT_MS < 5000) {
    warnings.push('TIMEOUT_MS es menor a 5 segundos, puede causar reintentos frecuentes');
  }

  const requiredKeys = Object.values(KEYS);
  for (const key of requiredKeys) {
    if (!key || typeof key !== 'string') {
      warnings.push(`KEY inválida en KEYS: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function initializeApp(): Promise<boolean> {
  console.log('[INIT] Validando entorno...');
  const result = await validateEnvironment();
  
  if (!result.valid) {
    console.error('[INIT] Errores de entorno:', result.errors);
    return false;
  }
  
  if (result.warnings.length > 0) {
    console.warn('[INIT] Advertencias de entorno:', result.warnings);
  }

  try {
    const lastCleanup = await AsyncStorage.getItem('@saderh:last_cleanup');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneDay) {
      await AsyncStorage.setItem('@saderh:last_cleanup', now.toString());
    }
  } catch {}

  console.log('[INIT] Entorno validado correctamente');
  return true;
}