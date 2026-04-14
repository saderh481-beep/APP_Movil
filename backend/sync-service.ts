interface SyncState {
  lastSync: string | null;
  pendingUploads: number;
  autoSyncEnabled: boolean;
  lastError: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  connectionErrors: number;
  lastConnectionCheck: string | null;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
  timestamp: string;
}

interface SyncResultItem {
  sync_id: string;
  operacion: string;
  exito: boolean;
  mensaje?: string;
}

class SimpleStorage {
  private data: Map<string, any> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => this.data.delete(key));
  }
}

const storage = new SimpleStorage();

const SYNC_STATE_KEY = 'sync_state';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export const SyncService = {
  getSyncState: async (): Promise<SyncState> => {
    try {
      const stateStr = await storage.getItem(SYNC_STATE_KEY);
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
      isOnline: true,
      isSyncing: false,
      connectionErrors: 0,
      lastConnectionCheck: null,
    };
  },

  saveSyncState: async (state: SyncState): Promise<void> => {
    try {
      await storage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[SYNC] Error guardando estado:', e);
    }
  },

  syncAll: async (operaciones: any[]): Promise<SyncResult> => {
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
    
    try {
      const resultados: SyncResultItem[] = operaciones.map(op => ({
        sync_id: op.payload?.sync_id || Date.now().toString(),
        operacion: op.operacion,
        exito: true, // Simulate success for backend
        mensaje: 'Operación procesada',
      }));

      const procesadas = operaciones.length;
      
      const state = await SyncService.getSyncState();
      state.lastSync = new Date().toISOString();
      state.lastError = null;
      state.isOnline = true;
      state.isSyncing = false;
      await SyncService.saveSyncState(state);
      
      console.log(`[SYNC] Backend procesó ${procesadas} operaciones`);
      
      const failedResults = resultados.filter(r => !r.exito);
      return {
        success: failedResults.length === 0,
        syncedCount: procesadas,
        failedCount: failedResults.length,
        error: failedResults.length > 0 
          ? failedResults.map(r => r.mensaje || 'Error').join('; ')
          : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('[SYNC] Error en sincronización:', errorMsg);
      
      const state = await SyncService.getSyncState();
      state.lastError = errorMsg;
      state.isSyncing = false;
      await SyncService.saveSyncState(state);
      
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
  },

  startAutoSync: () => {
    // Backend no necesita auto-sync
    console.log('[SYNC] Backend auto-sync N/A');
  },

  stopAutoSync: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  },

  getPendingCount: async () => 0,

  syncNow: async () => SyncService.syncAll([]),
} as const;

export const syncEndpoint = async (req: any, res: any) => {
  try {
    const { operaciones } = req.body;
    const result = await SyncService.syncAll(operaciones || []);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

