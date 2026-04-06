import { http, isNetworkError } from './http';
import { getToken } from './auth';
import { getBaseUrl } from './config';
import { unwrapData, isRecord, nowIso } from './utils';
import type { SyncRequestBody, SyncDeltaResponse, SyncResultItem } from '../../types/models';
import { offlineQueue } from './offline-queue';
import { bitacorasApi } from './bitacoras';

const extractRemoteBitacoraId = (item: SyncResultItem | Record<string, unknown>): string | null => {
  const rec = item as Record<string, unknown>;
  const direct = rec.id_bitacora ?? rec.bitacora_id ?? rec.remote_id ?? rec.id;
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (typeof direct === 'number' && Number.isFinite(direct)) return String(direct);

  const data = rec.data;
  if (isRecord(data)) {
    const nested = data.id_bitacora ?? data.bitacora_id ?? data.remote_id ?? data.id;
    if (typeof nested === 'string' && nested.trim()) return nested;
    if (typeof nested === 'number' && Number.isFinite(nested)) return String(nested);
  }

  return null;
};

const finalizePendingOperations = async (resultados: SyncResultItem[]) => {
  const [pendingBitacoras, pendingBeneficiarios] = await Promise.all([
    offlineQueue.getAllPendingBitacoras(),
    offlineQueue.getPendingBeneficiarios(),
  ]);

  const bitacorasById = new Map(pendingBitacoras.map(item => [item.local_id, item]));
  const beneficiariosById = new Map(pendingBeneficiarios.map(item => [item.local_id, item]));
  const removableBitacoras: string[] = [];
  const removableBeneficiarios: string[] = [];
  const errores: string[] = [];

  for (const resultado of resultados) {
    if (!resultado.exito) {
      errores.push(resultado.mensaje ?? `Error sincronizando ${resultado.sync_id}`);
      continue;
    }

    const pendingBenef = beneficiariosById.get(resultado.sync_id);
    if (pendingBenef) {
      removableBeneficiarios.push(resultado.sync_id);
      continue;
    }

    const pendingBit = bitacorasById.get(resultado.sync_id);
    if (!pendingBit) continue;

    const hasAssets = Boolean(
      pendingBit.foto_rostro_uri ||
      pendingBit.firma_uri ||
      pendingBit.pdf_uri ||
      pendingBit.fotos_campo_uris?.length
    );

    if (!hasAssets) {
      removableBitacoras.push(resultado.sync_id);
      continue;
    }

    const remoteBitacoraId = extractRemoteBitacoraId(resultado);
    if (!remoteBitacoraId) {
      errores.push(`Bitácora ${resultado.sync_id} sincronizada sin id remoto; archivos pendientes conservados.`);
      continue;
    }

    try {
      if (pendingBit.foto_rostro_uri) {
        await bitacorasApi.subirFotoRostro(remoteBitacoraId, pendingBit.foto_rostro_uri);
      }
      if (pendingBit.firma_uri) {
        await bitacorasApi.subirFirma(remoteBitacoraId, pendingBit.firma_uri);
      }
      if (pendingBit.fotos_campo_uris?.length) {
        await bitacorasApi.subirFotosCampo(remoteBitacoraId, pendingBit.fotos_campo_uris);
      }
      if (pendingBit.pdf_uri) {
        errores.push(`Bitácora ${resultado.sync_id} tiene PDF pendiente pero no existe endpoint cliente configurado para subirlo.`);
        continue;
      }

      removableBitacoras.push(resultado.sync_id);
    } catch (error) {
      errores.push(
        `Bitácora ${resultado.sync_id}: archivos pendientes no sincronizados (${error instanceof Error ? error.message : 'error desconocido'})`
      );
    }
  }

  await Promise.all([
    offlineQueue.removePendingBitacorasByIds(removableBitacoras),
    offlineQueue.removePendingBeneficiariosByIds(removableBeneficiarios),
  ]);

  return {
    sincronizadas: removableBitacoras.length + removableBeneficiarios.length,
    errores,
  };
};

export const syncApi = {
  async healthCheck(url?: string): Promise<boolean> {
    try {
      const baseUrl = url ?? (await getBaseUrl());
      const res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async validateServer(url?: string): Promise<{ ok: boolean; reason?: string }> {
    const baseUrl = url ?? (await getBaseUrl());

    try {
      const healthRes = await fetch(`${baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (!healthRes.ok) {
        return { ok: false, reason: `Health check inválido (${healthRes.status})` };
      }

      const authRes = await fetch(`${baseUrl}/auth/tecnico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: '00000' }),
        signal: AbortSignal.timeout(8000),
      });

      if (authRes.status === 200 || authRes.status === 400 || authRes.status === 401) {
        return { ok: true };
      }

      return { ok: false, reason: `El endpoint de autenticación respondió ${authRes.status}` };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'No se pudo validar el servidor',
      };
    }
  },

  isNetworkError,

  async sincronizar(operaciones: SyncRequestBody['operaciones']): Promise<{procesadas: number; resultados: SyncResultItem[]}> {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const body: SyncRequestBody = { operaciones };
    const json = await http<unknown>('POST', '/sync', body, token);
    const data = unwrapData(json);
    if (isRecord(data) && typeof data.procesadas === 'number' && Array.isArray(data.resultados)) {
      return data as any;
    }
    return { procesadas: 0, resultados: [] };
  },

  async delta(ultimoSync?: string): Promise<SyncDeltaResponse> {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const query = ultimoSync ? `?ultimo_sync=${encodeURIComponent(ultimoSync)}` : '';
    const json = await http<unknown>('GET', `/sync/delta${query}`, undefined, token);
    const data = unwrapData(json);
    return {
      sync_ts: String((data as any).sync_ts ?? nowIso()),
      beneficiarios: [],
      actividades: [],
      cadenas: [],
      // Parse arrays...
    } as SyncDeltaResponse; // TODO: full parse
  },

  async sincronizarPendientes(): Promise<{ sincronizadas: number; errores: string[] }> {
    const [bitacoras, beneficiarios] = await Promise.all([
      offlineQueue.getAllPendingBitacoras(),
      offlineQueue.getPendingBeneficiarios(),
    ]);
    const operaciones = [
      ...bitacoras.map(item => ({
        operacion: 'crear_bitacora',
        timestamp: item.created_at,
        payload: { ...item.payload, sync_id: item.local_id },
      })),
      ...beneficiarios.map(item => ({
        operacion: 'crear_beneficiario',
        timestamp: item.created_at,
        payload: { ...item.payload, sync_id: item.local_id },
      })),
    ];

    if (!operaciones.length) {
      return { sincronizadas: 0, errores: [] };
    }

    const result = await syncApi.sincronizar(operaciones as SyncRequestBody['operaciones']);
    return finalizePendingOperations(result.resultados);
  },
};
