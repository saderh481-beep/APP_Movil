/**
 * SADERH — Diagnóstico del Sistema
 * Herramienta para verificar el estado y detectar problemas
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_CONFIG, KEYS, offlineQueue, syncApi } from './api';
import { Logger, LogCategories } from './logger';
import { getStorageInfo } from './secure-storage';

export interface DiagnosticResult {
  timestamp: string;
  appInfo: {
    appName?: string;
    appVersion?: string;
    buildNumber?: string;
    isDevelopment: boolean;
  };
  device: {
    brand?: string;
    model?: string;
    osVersion?: string;
    osName?: string;
  };
  storage: {
    total: number;
    items: Record<string, string>;
  };
  connectivity: {
    isOnline: boolean;
    apiHealth: boolean;
    lastHealthCheck?: string;
  };
  offline: {
    pendingCount: number;
    sizeInfo: { count: number; sizeMB: number; config: Record<string, any> };
  };
  cache: {
    asignacionesCount: number;
    lastUpdate?: string;
  };
  issues: string[];
  warnings: string[];
}

/**
 * Sistema de diagnóstico completo
 */
export const Diagnostic = {
  /**
   * Ejecuta diagnóstico completo del sistema
   */
  async runFullDiagnostic(): Promise<DiagnosticResult> {
    Logger.info(LogCategories.SYSTEM, 'Iniciando diagnóstico completo');

    const issues: string[] = [];
    const warnings: string[] = [];

    // App Info
    const appInfo = {
      appName: Constants.expoConfig?.name,
      appVersion: Constants.expoConfig?.version,
      buildNumber: Constants.expoConfig?.ios?.buildNumber,
      isDevelopment: __DEV__,
    };

    if (!appInfo.appVersion) {
      issues.push('Versión de app no definida');
    }

    // Device Info (básico, sin expo-device)
    const device = {
      brand: Constants.manifest?.isExpo ? 'Expo Go' : 'Native',
      model: 'Unknown',
      osVersion: Constants.expoConfig?.plugins ? 'Android/iOS' : 'Web',
      osName: Constants.expoConfig?.plugins ? 'React Native' : 'Web',
    };

    if (!device.model) {
      warnings.push('No se pudo detectar modelo del dispositivo');
    }

    // Storage Check
    const storageStatus = await this.checkStorage();
    if (storageStatus.issues.length > 0) {
      issues.push(...storageStatus.issues);
    }
    if (storageStatus.warnings.length > 0) {
      warnings.push(...storageStatus.warnings);
    }

    // Connectivity Check
    const connectivityStatus = await this.checkConnectivity();
    if (connectivityStatus.issues.length > 0) {
      issues.push(...connectivityStatus.issues);
    }
    if (connectivityStatus.warnings.length > 0) {
      warnings.push(...connectivityStatus.warnings);
    }

    // Offline Queue Check
    const pendingCount = await offlineQueue.countPendingBitacoras();
    const sizeInfo = await offlineQueue.getStats();

    if (pendingCount > 50) {
      warnings.push(`${pendingCount} items en cola offline - considerar sincronizar`);
    }
    if (sizeInfo.sizeMB > 5) {
      warnings.push(`Cola offline ocupa ${sizeInfo.sizeMB.toFixed(2)}MB - próximo a límite`);
    }

    // Cache Check
    const cacheSize = await this.checkCache();

    // Final result
    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      appInfo,
      device,
      storage: storageStatus.data,
      connectivity: connectivityStatus.data,
      offline: {
        pendingCount,
        sizeInfo,
      },
      cache: cacheSize,
      issues,
      warnings,
    };

    Logger.info(LogCategories.SYSTEM, 'Diagnóstico completado', {
      issues: issues.length,
      warnings: warnings.length,
    });

    return result;
  },

  /**
   * Verifica estado del almacenamiento
   */
  async checkStorage(): Promise<{ data: Pick<DiagnosticResult, 'storage'>['storage']; issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      const keys = await AsyncStorage.getAllKeys();
      const items: Record<string, string> = {};

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          items[key] = `${value.length} bytes`;
        }
      }

      if (keys.length === 0) {
        warnings.push('AsyncStorage vacío');
      }

      // Verificar tokens
      const token = items[KEYS.TOKEN];
      if (!token) {
        warnings.push('No hay token guardado');
      }

      const usuario = items[KEYS.USUARIO];
      if (!usuario) {
        warnings.push('No hay usuario guardado');
      }

      return {
        data: { total: keys.length, items },
        issues,
        warnings,
      };
    } catch (e) {
      issues.push(`Error accediendo AsyncStorage: ${e instanceof Error ? e.message : 'Desconocido'}`);
      return {
        data: { total: 0, items: {} },
        issues,
        warnings,
      };
    }
  },

  /**
   * Verifica conectividad de red
   */
  async checkConnectivity(): Promise<{
    data: Pick<DiagnosticResult, 'connectivity'>['connectivity'];
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      const isOnline = await syncApi.healthCheck();
      const apiHealth = isOnline;

      if (!isOnline) {
        warnings.push('API no responde (modo offline)');
        Logger.warn(LogCategories.NETWORK, 'API health check falló');
      } else {
        Logger.info(LogCategories.NETWORK, 'API health check OK');
      }

      return {
        data: {
          isOnline,
          apiHealth,
          lastHealthCheck: new Date().toISOString(),
        },
        issues,
        warnings,
      };
    } catch (e) {
      issues.push(`Error verificando conectividad: ${e instanceof Error ? e.message : 'Desconocido'}`);
      Logger.error(LogCategories.NETWORK, 'Health check error', e);
      return {
        data: { isOnline: false, apiHealth: false },
        issues,
        warnings,
      };
    }
  },

  /**
   * Verifica estado del caché
   */
  async checkCache(): Promise<DiagnosticResult['cache']> {
    try {
      const asignacionesCache = await AsyncStorage.getItem('@saderh:asignaciones_cache');
      const count = asignacionesCache ? JSON.parse(asignacionesCache).length : 0;

      return {
        asignacionesCount: count,
        lastUpdate: asignacionesCache ? new Date().toISOString() : undefined,
      };
    } catch {
      return { asignacionesCount: 0 };
    }
  },

  /**
   * Genera un reporte de diagnóstico legible
   */
  async generateReport(): Promise<string> {
    const diag = await this.runFullDiagnostic();
    const storageInfo = getStorageInfo();

    let report = `
╔══════════════════════════════════════════════════════════════╗
║                   REPORTÉ DE DIAGNÓSTICO                    ║
║                        SADERH v${diag.appInfo.appVersion}                          ║
╚══════════════════════════════════════════════════════════════╝

📱 DISPOSITIVO
  Brand: ${diag.device.brand || 'N/A'}
  Model: ${diag.device.model || 'N/A'}
  OS: ${diag.device.osName} ${diag.device.osVersion}

🔧 APLICACIÓN
  Modo: ${diag.appInfo.isDevelopment ? 'Desarrollo' : 'Producción'}
  Storage: ${storageInfo.backendStorage}
  Versión: ${diag.appInfo.appVersion}

📊 ALMACENAMIENTO
  Items guardados: ${diag.storage.total}
  Keys: ${Object.keys(diag.storage.items).join(', ') || 'Ninguno'}

🌐 CONECTIVIDAD
  Online: ${diag.connectivity.isOnline ? '✅' : '❌'}
  API Health: ${diag.connectivity.apiHealth ? '✅' : '❌'}
  Último check: ${diag.connectivity.lastHealthCheck}

⏳ COLA OFFLINE
  Items pendientes: ${diag.offline.pendingCount}
  Tamaño: ${diag.offline.sizeInfo.sizeMB.toFixed(2)}MB
  Límite: ${diag.offline.sizeInfo.config.MAX_SIZE_MB}MB (${diag.offline.sizeInfo.config.MAX_ITEMS} items)

💾 CACHÉ
  Asignaciones: ${diag.cache.asignacionesCount}
  Última actualización: ${diag.cache.lastUpdate || 'Nunca'}
`;

    if (diag.issues.length > 0) {
      report += `
⚠️  PROBLEMAS CRÍTICOS:
${diag.issues.map((i) => `  ❌ ${i}`).join('\n')}
`;
    }

    if (diag.warnings.length > 0) {
      report += `
⚠️  ADVERTENCIAS:
${diag.warnings.map((w) => `  ⚠️  ${w}`).join('\n')}
`;
    }

    if (diag.issues.length === 0 && diag.warnings.length === 0) {
      report += `
✅ ESTADO: SISTEMA EN OPTIMAS CONDICIONES
`;
    }

    report += `

📅 Generado: ${diag.timestamp}
API URL: ${API_CONFIG.APP_API_URL}
`;

    return report;
  },
};
