/**
 * SADERH — Hook para Procesos en Segundo Plano
 * Maneja automáticamente la exportación, sincronización y verificación de conexión
 */

import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ExportService, ExportState, exportData, startAutoExport, stopAutoExport } from './export-service';
import { SyncService, SyncState, syncAll, startAutoSync, stopAutoSync } from './sync-service';
import { FileManager } from './file-manager';
import { connectionDiagnostic } from './connection-diagnostic';

export interface BackgroundServicesState {
  isOnline: boolean;
  isExporting: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  lastExport: string | null;
  pendingBitacoras: number;
  connectionStatus: 'checking' | 'online' | 'offline';
}

export interface BackgroundServicesStats {
  sync: SyncState;
  export: ExportState;
  storage: {
    totalUsed: number;
    exports: number;
    bitacoras: number;
    backups: number;
    logs: number;
    temp: number;
  };
}

/**
 * Hook principal para iniciar y manejar los servicios en segundo plano
 */
export const useBackgroundServices = () => {
  const [state, setState] = useState<BackgroundServicesState>({
    isOnline: true,
    isExporting: false,
    isSyncing: false,
    lastSync: null,
    lastExport: null,
    pendingBitacoras: 0,
    connectionStatus: 'checking',
  });

  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Verifica la conexión a internet
   */
  const checkConnection = useCallback(async () => {
    setState(prev => ({ ...prev, connectionStatus: 'checking' }));
    
    try {
      const result = await connectionDiagnostic.testConnectivity(
        'https://campo-api-app-campo-saas.up.railway.app'
      );
      
      setState(prev => ({
        ...prev,
        isOnline: result.ok,
        connectionStatus: result.ok ? 'online' : 'offline',
      }));
      
      return result.ok;
    } catch {
      setState(prev => ({
        ...prev,
        isOnline: false,
        connectionStatus: 'offline',
      }));
      return false;
    }
  }, []);

  /**
   * Sincroniza manualmente
   */
  const syncNow = useCallback(async () => {
    if (state.isSyncing) return;
    
    setState(prev => ({ ...prev, isSyncing: true }));
    
    const isOnline = await checkConnection();
    if (!isOnline) {
      setState(prev => ({ ...prev, isSyncing: false }));
      return { success: false, error: 'Sin conexión a internet' };
    }
    
    const result = await syncAll();
    
    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSync: result.success ? result.timestamp : prev.lastSync,
      pendingBitacoras: Math.max(0, prev.pendingBitacoras - result.syncedCount),
    }));
    
    return result;
  }, [state.isSyncing, checkConnection]);

  /**
   * Exporta datos manualmente
   */
  const exportNow = useCallback(async () => {
    if (state.isExporting) return;
    
    setState(prev => ({ ...prev, isExporting: true }));
    
    const result = await exportData({
      format: 'json',
      includeBitacoras: true,
      includeBeneficiarios: true,
      includeAsignaciones: true,
    });
    
    setState(prev => ({
      ...prev,
      isExporting: false,
      lastExport: result.success ? result.timestamp : prev.lastExport,
    }));
    
    return result;
  }, [state.isExporting]);

  /**
   * Inicia los servicios automáticos
   */
  const startBackgroundServices = useCallback(async () => {
    // Inicializar carpetas de la app
    await FileManager.initializeAppDirectories();
    
    // Iniciar sincronización automática (cada 30 segundos)
    startAutoSync(30 * 1000);
    
    // Iniciar exportación automática (cada 5 minutos)
    startAutoExport(5 * 60 * 1000);
    
    // Verificar conexión inicialmente
    await checkConnection();
    
    // Obtener estado inicial
    const syncState = await SyncService.getSyncState();
    const exportState = await ExportService.getExportState();
    const pendingCount = await SyncService.getPendingCount();
    
    setState(prev => ({
      ...prev,
      lastSync: syncState.lastSync,
      lastExport: exportState.lastExport,
      pendingBitacoras: pendingCount,
    }));
    
    setIsInitialized(true);
    console.log('[BACKGROUND SERVICES] Servicios iniciados');
  }, [checkConnection]);

  /**
   * Detiene los servicios automáticos
   */
  const stopBackgroundServices = useCallback(() => {
    stopAutoSync();
    stopAutoExport();
    setIsInitialized(false);
    console.log('[BACKGROUND SERVICES] Servicios detenidos');
  }, []);

  /**
   * Obtiene estadísticas de los servicios
   */
  const getStats = useCallback(async (): Promise<BackgroundServicesStats> => {
    const syncState = await SyncService.getSyncState();
    const exportState = await ExportService.getExportState();
    const storageInfo = await FileManager.getStorageInfo();
    
    return {
      sync: syncState,
      export: exportState,
      storage: storageInfo,
    };
  }, []);

  // Efecto para manejar cambios de estado de la app
  useEffect(() => {
    let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // La app está en foreground - verificar conexión
        checkConnection();
      } else if (nextAppState === 'background') {
        // La app está en background - los servicios automáticos continúan
        console.log('[BACKGROUND SERVICES] App en background, servicios continúan');
      }
    };
    
    subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [checkConnection]);

  // Efecto para verificar conexión periódicamente cuando está activo
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(() => {
      checkConnection();
    }, 60 * 1000); // Verificar cada minuto
    
    return () => clearInterval(interval);
  }, [isInitialized, checkConnection]);

  return {
    // Estado
    state,
    isInitialized,
    
    // Acciones
    startBackgroundServices,
    stopBackgroundServices,
    checkConnection,
    syncNow,
    exportNow,
    getStats,
  };
};

export default useBackgroundServices;
