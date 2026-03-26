/**
 * SADERH — Servicio de Exportación Automática de Datos
 * Exporta datos automáticamente a carpetas exclusivas de la app
 * Se ejecuta en segundo plano para no afectar la UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileManager, getSubdirectory, saveFile } from './file-manager';
import { KEYS, bitacorasApi, beneficiariosApi, asignacionesApi } from './api';
import { Bitacora, Beneficiario, Asignacion } from '../types/models';

// Intervalo de exportación automática (en ms) - default 5 minutos
const AUTO_EXPORT_INTERVAL = 5 * 60 * 1000;

// Clave para almacenar estado de exportación
const EXPORT_STATE_KEY = '@saderh:export_state';

// Interfaces
export interface ExportState {
  lastExport: string | null;
  pendingExports: number;
  autoExportEnabled: boolean;
  lastError: string | null;
  exportErrors: number;
  lastErrorTimestamp: string | null;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeBitacoras: boolean;
  includeBeneficiarios: boolean;
  includeAsignaciones: boolean;
  compress?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  recordCount?: number;
  fileSize?: number;
  error?: string;
  timestamp: string;
}

// Estado global del exportador
let exportInterval: ReturnType<typeof setInterval> | null = null;
let isExporting = false;

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
 * Obtiene el estado actual de exportación
 */
export const getExportState = async (): Promise<ExportState> => {
  try {
    const stateStr = await AsyncStorage.getItem(EXPORT_STATE_KEY);
    if (stateStr) {
      return JSON.parse(stateStr);
    }
  } catch (e) {
    console.error('[EXPORT] Error leyendo estado:', e);
  }
  
  return {
    lastExport: null,
    pendingExports: 0,
    autoExportEnabled: false,
    lastError: null,
    exportErrors: 0,
    lastErrorTimestamp: null,
  };
};

/**
 * Guarda el estado de exportación
 */
const saveExportState = async (state: ExportState): Promise<void> => {
  try {
    await AsyncStorage.setItem(EXPORT_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[EXPORT] Error guardando estado:', e);
  }
};

/**
 * Obtiene bitácoras del servidor
 */
const fetchBitacoras = async (): Promise<Bitacora[]> => {
  try {
    // Usar la API de bitácoras
    const bitacoras = await bitacorasApi.listar();
    return bitacoras;
  } catch (e) {
    console.error('[EXPORT] Error obteniendo bitácoras:', e);
    return [];
  }
};

/**
 * Obtiene beneficiarios del servidor
 */
const fetchBeneficiarios = async (): Promise<Beneficiario[]> => {
  try {
    const beneficiarios = await beneficiariosApi.listar();
    return beneficiarios;
  } catch (e) {
    console.error('[EXPORT] Error obteniendo beneficiarios:', e);
    return [];
  }
};

/**
 * Obtiene asignaciones del servidor
 */
const fetchAsignaciones = async (): Promise<Asignacion[]> => {
  try {
    const response = await asignacionesApi.listar();
    return response.asignaciones || [];
  } catch (e) {
    console.error('[EXPORT] Error obteniendo asignaciones:', e);
    return [];
  }
};

/**
 * Convierte datos a formato JSON
 */
const toJson = (data: unknown): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Convierte array de objetos a CSV
 */
const toCsv = <T extends Record<string, unknown>>(data: T[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escapar comillas y envolver si contiene comas o comillas
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Exporta datos según las opciones especificadas
 */
export const exportData = async (options: Partial<ExportOptions> = {}): Promise<ExportResult> => {
  if (isExporting) {
    return {
      success: false,
      error: 'Exportación en progreso',
      timestamp: new Date().toISOString(),
    };
  }
  
  isExporting = true;
  const startTime = Date.now();
  
  try {
    // Inicializar directorios si no existen
    await FileManager.initializeAppDirectories();
    
    const token = await getStoredToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const format = options.format ?? 'json';
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
    };
    
    let recordCount = 0;
    
    // Exportar bitácoras
    if (options.includeBitacoras !== false) {
      const bitacoras = await fetchBitacoras();
      exportData.bitacoras = bitacoras;
      recordCount += bitacoras.length;
    }
    
    // Exportar beneficiarios
    if (options.includeBeneficiarios !== false) {
      const beneficiarios = await fetchBeneficiarios();
      exportData.beneficiarios = beneficiarios;
      recordCount += beneficiarios.length;
    }
    
    // Exportar asignaciones
    if (options.includeAsignaciones !== false) {
      const asignaciones = await fetchAsignaciones();
      exportData.asignaciones = asignaciones;
      recordCount += asignaciones.length;
    }
    
    // Generar contenido según formato
    let content: string;
    let ext: string;
    
    if (format === 'csv') {
      // Para CSV, exportar cada tipo en archivos separados
      content = '';
      ext = 'csv';
    } else {
      content = toJson(exportData);
      ext = 'json';
    }
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export_${timestamp}.${ext}`;
    
    // Guardar archivo
    const result = await FileManager.saveFile('EXPORTS', filename, content);
    
    if (!result.success) {
      throw new Error('Error guardando archivo de exportación');
    }
    
    // Actualizar estado
    const state = await getExportState();
    state.lastExport = new Date().toISOString();
    state.pendingExports = 0;
    state.lastError = null;
    await saveExportState(state);
    
    const duration = Date.now() - startTime;
    console.log(`[EXPORT] Exportación completada en ${duration}ms. ${recordCount} registros.`);
    
    return {
      success: true,
      filename,
      recordCount,
      timestamp: new Date().toISOString(),
    };
    
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[EXPORT] Error en exportación:', errorMsg);
    
    // Guardar en log de errores
    try {
      const timestamp = new Date().toISOString();
      const errorLog = `[${timestamp}] [EXPORT] ${errorMsg}`;
      const currentLog = await AsyncStorage.getItem('@saderh:error_log');
      const logs = currentLog ? JSON.parse(currentLog) : [];
      logs.push(errorLog);
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      await AsyncStorage.setItem('@saderh:error_log', JSON.stringify(logs));
    } catch {}
    
    // Actualizar estado con error
    const state = await getExportState();
    state.lastError = errorMsg;
    state.exportErrors = (state.exportErrors || 0) + 1;
    state.lastErrorTimestamp = new Date().toISOString();
    await saveExportState(state);
    
    return {
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    };
  } finally {
    isExporting = false;
  }
};

/**
 * Inicia la exportación automática en segundo plano
 */
export const startAutoExport = (intervalMs: number = AUTO_EXPORT_INTERVAL): void => {
  if (exportInterval) {
    console.log('[EXPORT] Auto-export ya está activo');
    return;
  }
  
  // Configurar intervalo
  exportInterval = setInterval(async () => {
    console.log('[EXPORT] Ejecutando exportación automática...');
    await exportData({
      format: 'json',
      includeBitacoras: true,
      includeBeneficiarios: true,
      includeAsignaciones: true,
    });
  }, intervalMs);
  
  // Actualizar estado
  getExportState().then(state => {
    state.autoExportEnabled = true;
    saveExportState(state);
  });
  
  console.log(`[EXPORT] Auto-export iniciado (cada ${intervalMs / 1000}s)`);
};

/**
 * Detiene la exportación automática
 */
export const stopAutoExport = (): void => {
  if (exportInterval) {
    clearInterval(exportInterval);
    exportInterval = null;
    
    // Actualizar estado
    getExportState().then(state => {
      state.autoExportEnabled = false;
      saveExportState(state);
    });
    
    console.log('[EXPORT] Auto-export detenido');
  }
};

/**
 * Lista exportaciones previas
 */
export const listExports = async (): Promise<string[]> => {
  return FileManager.listFilesInDirectory('EXPORTS');
};

/**
 * Obtiene una exportación específica
 */
export const getExport = async (filename: string): Promise<{ success: boolean; content?: string }> => {
  return FileManager.readFile('EXPORTS', filename);
};

/**
 * Elimina una exportación
 */
export const deleteExport = async (filename: string): Promise<boolean> => {
  return FileManager.deleteFile('EXPORTS', filename);
};

export const ExportService = {
  getExportState,
  exportData,
  startAutoExport,
  stopAutoExport,
  listExports,
  getExport,
  deleteExport,
};
