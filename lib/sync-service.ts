/**
 * SADERH — Servicio de Sincronización en Segundo Plano
 * Maneja la subida automática de bitácoras cuando hay conexión a internet
 * Se ejecuta en segundo plano para no afectar la UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS, offlineQueue, API_CONFIG, syncApi } from './api';
import { FileManager, getSubdirectory } from './file-manager';
import { PendingBitacoraUpload } from './api';

// Intervalo de sincronización (en ms) - default 30 segundos
const SYNC_INTERVAL = 30 * 1000;

// Clave para almacenar estado de sincronización
const SYNC_STATE_KEY = '@saderh:sync_state';

// Interfaces
export interface SyncState {
  lastSync: string | null;
  pendingUploads: number;
  autoSyncEnabled: boolean;
  lastError: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  connectionErrors: number;
  lastConnectionCheck: string | null;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
  timestamp: string;
}

// Estado global del sincronizador
let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let currentIsOnline = false;

// Contador de reintentos para verificación de conexión
let connectionRetryCount = 0;
const MAX_CONNECTION_RETRIES = 3;

/**
 * Registra un error en el log de la app para diagnóstico
 */
const logError = async (context: string, error: string, details?: unknown): Promise<void> => {
  const timestamp = new Date().toISOString();
  const errorLog = `[${timestamp}] [${context}] ${error}${details ? ` - ${JSON.stringify(details)}` : ''}`;
  console.error(errorLog);
  
  // Guardar en AsyncStorage para análisis posterior - ahora con await
  try {
    const currentLog = await AsyncStorage.getItem('@saderh:error_log');
    const logs = currentLog ? JSON.parse(currentLog) : [];
    logs.push(errorLog);
    // Mantener solo los últimos 100 errores
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    await AsyncStorage.setItem('@saderh:error_log', JSON.stringify(logs));
  } catch {}
};

/**
 * Calcula el tiempo de espera para reintento con backoff exponencial
 */
const getRetryDelay = (attempt: number): number => {
  // Backoff exponencial: 1s, 2s, 4s (máximo 3 intentos)
  return Math.min(1000 * Math.pow(2, attempt), 4000);
};

/**
 * Resetea el contador de reintentos cuando hay éxito
 */
const resetConnectionRetryCount = (): void => {
  if (connectionRetryCount > 0) {
    console.log('[SYNC] Reiniciando contador de reintentos de conexión');
  }
  connectionRetryCount = 0;
};

/**
 * Verifica la conexión a internet usando múltiples métodos
 * 1. Intenta hacer fetch al endpoint /health del servidor
 * 2. Si falla, intenta un ping genérico
 * 3. Si todo falla, verifica si hay network disponible
 * Limita reintentos para evitar sobrecarga cuando el servidor está caído
 */
const checkConnection = async (): Promise<boolean> => {
  const startTime = Date.now();
  
  try {
    // Método 1: Intentar fetch al servidor
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${API_CONFIG.APP_API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        console.log(`[SYNC] Conexión verificada en ${Date.now() - startTime}ms`);
        return true;
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      // El fetch falló, intentar método 2
      console.log('[SYNC] Método 1 falló, intentando método 2...');
    }
    
    // Método 2: Intentar con el endpoint de login (más tolerante)
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);
    
    try {
      const loginUrl = API_CONFIG.APP_API_URL.includes('/api') 
        ? API_CONFIG.APP_API_URL.replace('/api', '/health')
        : `${API_CONFIG.APP_API_URL}/health`;
      
      const response2 = await fetch(loginUrl, {
        method: 'GET',
        signal: controller2.signal,
      });
      clearTimeout(timeout2);
      
      if (response2.ok) {
        console.log(`[SYNC] Conexión verificada (método 2) en ${Date.now() - startTime}ms`);
        return true;
      }
    } catch (fetchError2) {
      clearTimeout(timeout2);
      console.log('[SYNC] Método 2 también falló');
    }
    
    // Método 3: Verificar si hay network básico
    // Intentar un fetch a un recurso conocido
    try {
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 3000);
      
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller3.signal,
      });
      clearTimeout(timeout3);
      
      // Si llegamos aquí, hay internet pero el servidor puede estar caído
      console.log('[SYNC] Hay conexión a internet pero servidor no responde');
    } catch (e) {
      // Ninguna conexión
    }
    
    // Si todos los métodos fallan, incrementar contador de reintentos
    connectionRetryCount++;
    console.log(`[SYNC] Fallo de conexión intento ${connectionRetryCount}/${MAX_CONNECTION_RETRIES}`);
    
    // Si excedimos el límite de reintentos, esperar con backoff
    if (connectionRetryCount >= MAX_CONNECTION_RETRIES) {
      const delay = getRetryDelay(connectionRetryCount - MAX_CONNECTION_RETRIES);
      console.log(`[SYNC] Límite de reintentos alcanzado. Esperando ${delay}ms antes de reintentar...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return false;
    
  } catch (e) {
    logError('SYNC', 'Error verificando conexión', e);
    return false;
  }
};

/**
 * Obtiene el token del almacenamiento
 */
const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch {
    return null;
  }
};

/**
 * Obtiene el estado actual de sincronización
 */
export const getSyncState = async (): Promise<SyncState> => {
  try {
    const stateStr = await AsyncStorage.getItem(SYNC_STATE_KEY);
    if (stateStr) {
      return JSON.parse(stateStr);
    }
  } catch (e) {
    console.error('[SYNC] Error leyendo estado:', e);
  }
  
  return {
    lastSync: null,
    pendingUploads: 0,
    autoSyncEnabled: false,
    lastError: null,
    isOnline: false,
    isSyncing: false,
    connectionErrors: 0,
    lastConnectionCheck: null,
  };
};

/**
 * Guarda el estado de sincronización
 */
const saveSyncState = async (state: SyncState): Promise<void> => {
  try {
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[SYNC] Error guardando estado:', e);
  }
};

/**
 * Sincroniza una bitácora individual usando fetch directo
 */
const syncBitacora = async (
  bitacora: PendingBitacoraUpload,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = API_CONFIG.APP_API_URL;
    
    // Preparar el payload - convertir null a undefined
    const payload: Record<string, unknown> = { ...bitacora.payload };
    if (payload.beneficiario_id === null) delete payload.beneficiario_id;
    if (payload.cadena_productiva_id === null) delete payload.cadena_productiva_id;
    if (payload.actividad_id === null) delete payload.actividad_id;
    payload.sync_id = bitacora.local_id;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    
    const response = await fetch(`${baseUrl}/bitacoras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
    console.error(`[SYNC] Error sincronizando bitácora ${bitacora.local_id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Sincroniza todas las bitácoras pendientes
 */
const syncAllPendingBitacoras = async (token: string): Promise<{
  sincronizados: number;
  errores: string[];
}> => {
  const bitacorasPendientes = await offlineQueue.getAllPendingBitacoras();
  
  if (bitacorasPendientes.length === 0) {
    return { sincronizados: 0, errores: [] };
  }
  
  console.log(`[SYNC] Sincronizando ${bitacorasPendientes.length} bitácoras...`);
  
  let sincronizados = 0;
  const errores: string[] = [];
  
  // Sincronizar una por una
  const bitacorasValidas = bitacorasPendientes.filter(b => {
    if (!b.payload) return false;
    // Convertir null a undefined para compatibilidad de tipos
    const payload = {
      ...b.payload,
      beneficiario_id: b.payload.beneficiario_id ?? undefined,
      cadena_productiva_id: b.payload.cadena_productiva_id ?? undefined,
      actividad_id: b.payload.actividad_id ?? undefined,
    };
    
    return payload.tipo && payload.fecha_inicio;
  });
  
  for (const bitacora of bitacorasValidas) {
    const result = await syncBitacora(bitacora, token);
    
    if (result.success) {
      sincronizados++;
    } else {
      errores.push(`Bitácora ${bitacora.local_id}: ${result.error}`);
    }
  }
  
  return { sincronizados, errores };
};

/**
 * Sincroniza todos los datos pendientes (bitácoras y beneficiarios)
 */
export const syncAll = async (): Promise<SyncResult> => {
  if (isSyncing) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: 'Sincronización en progreso',
      timestamp: new Date().toISOString(),
    };
  }
  
  isSyncing = true;
  const startTime = Date.now();
  
  try {
    const token = await getStoredToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    // Verificar conexión a internet
    const isOnline = await checkConnection();
    currentIsOnline = isOnline;
    
    if (!isOnline) {
      throw new Error('No hay conexión a internet');
    }
    
    console.log('[SYNC] Iniciando sincronización...');
    const pendingBefore = await offlineQueue.countPendingBitacoras();
    const pendingBenefBefore = (await offlineQueue.getPendingBeneficiarios()).length;
    const result = await syncApi.sincronizarPendientes();
    
    // Actualizar estado
    const pendingCount = await offlineQueue.countPendingBitacoras();
    const pendingBenef = (await offlineQueue.getPendingBeneficiarios()).length;
    const state = await getSyncState();
    state.lastSync = new Date().toISOString();
    state.pendingUploads = pendingCount + pendingBenef;
    state.lastError = result.errores.length > 0 
      ? result.errores.join('; ') 
      : null;
    state.isOnline = true;
    state.isSyncing = false;
    state.lastConnectionCheck = new Date().toISOString();
    await saveSyncState(state);
    
    const duration = Date.now() - startTime;
    console.log(`[SYNC] Sincronización completada en ${duration}ms. ${result.sincronizadas} sincronizadas.`);
    
    return {
      success: result.errores.length === 0,
      syncedCount: (pendingBefore + pendingBenefBefore) - (pendingCount + pendingBenef),
      failedCount: result.errores.length,
      error: result.errores.length > 0 
        ? result.errores.join('; ') 
        : undefined,
      timestamp: new Date().toISOString(),
    };
    
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[SYNC] Error en sincronización:', errorMsg);
    
    // Actualizar estado con error
    const state = await getSyncState();
    state.lastError = errorMsg;
    state.isOnline = currentIsOnline;
    state.isSyncing = false;
    state.lastConnectionCheck = new Date().toISOString();
    
    // Incrementar contador de errores de conexión si es un error de red
    if (errorMsg.includes('conexión') || errorMsg.includes('network') || errorMsg.includes('fetch')) {
      state.connectionErrors = (state.connectionErrors || 0) + 1;
    }
    
    await saveSyncState(state);
    
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    };
  } finally {
    isSyncing = false;
  }
};

/**
 * Inicia la sincronización automática en segundo plano
 */
export const startAutoSync = (intervalMs: number = SYNC_INTERVAL): void => {
  if (syncInterval) {
    console.log('[SYNC] Auto-sync ya está activo');
    return;
  }
  
  // Función para verificar conexión y sincronizar
  const checkAndSync = async () => {
    const isOnline = await checkConnection();
    currentIsOnline = isOnline;
    
    // Actualizar estado
    getSyncState().then(state => {
      state.isOnline = isOnline;
      state.lastConnectionCheck = new Date().toISOString();
      if (!isOnline) {
        state.connectionErrors = (state.connectionErrors || 0) + 1;
      } else {
        state.connectionErrors = 0; // Resetear cuando hay conexión
        resetConnectionRetryCount(); // Resetear contador de reintentos
      }
      saveSyncState(state);
    });
    
    if (isOnline) {
      console.log('[SYNC] Ejecutando sincronización automática...');
      await syncAll();
    } else {
      console.log('[SYNC] Sin conexión, omitiendo sincronización');
    }
  };
  
  // Verificar conexión inicial
  checkAndSync();
  
  // Configurar intervalo de sincronización periódica
  syncInterval = setInterval(checkAndSync, intervalMs);
  
  // Actualizar estado
  getSyncState().then(state => {
    state.autoSyncEnabled = true;
    saveSyncState(state);
  });
  
  console.log(`[SYNC] Auto-sync iniciado (cada ${intervalMs / 1000}s)`);
};

/**
 * Detiene la sincronización automática
 */
export const stopAutoSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    
    // Actualizar estado
    getSyncState().then(state => {
      state.autoSyncEnabled = false;
      saveSyncState(state);
    });
    
    console.log('[SYNC] Auto-sync detenido');
  }
};

/**
 * Obtiene el número de bitácoras pendientes
 */
export const getPendingCount = async (): Promise<number> => {
  return offlineQueue.countPendingBitacoras();
};

/**
 * Fuerza una sincronización inmediata
 */
export const syncNow = async (): Promise<SyncResult> => {
  return syncAll();
};

export const SyncService = {
  getSyncState,
  syncAll,
  startAutoSync,
  stopAutoSync,
  getPendingCount,
  syncNow,
};
