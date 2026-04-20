import { http, isNetworkError } from './http';
import { getToken } from './auth';
import { getBaseUrl } from './config';
import {
  unwrapData,
  isRecord,
  nowIso,
  asArray,
  normalizeActividad,
  normalizeBeneficiario,
} from './utils';
import type { BitacoraCerrarPayload, SyncRequestBody, SyncDeltaResponse, SyncResultItem } from '../../types/models';
import { offlineQueue } from './offline-queue';
import type { PendingBitacoraUpload, PendingBeneficiarioUpload } from './offline-queue';
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

const buildClosePayload = (pendingBit: PendingBitacoraUpload): BitacoraCerrarPayload | null => {
  if (pendingBit.close_payload?.fecha_fin) {
    return pendingBit.close_payload;
  }

  const payload = isRecord(pendingBit.payload) ? pendingBit.payload : null;
  const fechaFin = typeof payload?.fecha_fin === 'string' ? payload.fecha_fin : null;
  if (!fechaFin) {
    return null;
  }

  const closePayload: BitacoraCerrarPayload = { fecha_fin: fechaFin };
  if (typeof payload.coord_fin === 'string' && payload.coord_fin.trim()) {
    closePayload.coord_fin = payload.coord_fin;
  }
  if (typeof payload.calificacion === 'number') {
    closePayload.calificacion = payload.calificacion;
  }
  if (typeof payload.reporte === 'string' && payload.reporte.trim()) {
    closePayload.reporte = payload.reporte;
  }
  if (isRecord(payload.datos_extendidos)) {
    closePayload.datos_extendidos = payload.datos_extendidos;
  }
  return closePayload;
};

const hasDeferredRemoteWork = (pendingBit: PendingBitacoraUpload): boolean =>
  Boolean(
    pendingBit.foto_rostro_uri ||
    pendingBit.firma_uri ||
    pendingBit.pdf_uri ||
    pendingBit.fotos_campo_uris?.length ||
    buildClosePayload(pendingBit)
  );

const uploadPendingArtifacts = async (pendingBit: PendingBitacoraUpload, remoteBitacoraId: string) => {
  if (pendingBit.foto_rostro_uri) {
    console.log('[SYNC] Subiendo foto rostro:', pendingBit.foto_rostro_uri);
    await bitacorasApi.subirFotoRostro(remoteBitacoraId, pendingBit.foto_rostro_uri);
  }
  if (pendingBit.firma_uri) {
    console.log('[SYNC] Subiendo firma:', pendingBit.firma_uri);
    await bitacorasApi.subirFirma(remoteBitacoraId, pendingBit.firma_uri);
  }
  if (pendingBit.fotos_campo_uris?.length) {
    console.log('[SYNC] Subiendo fotos campo:', pendingBit.fotos_campo_uris.length);
    await bitacorasApi.subirFotosCampo(remoteBitacoraId, pendingBit.fotos_campo_uris);
  }
  if (pendingBit.pdf_uri) {
    throw new Error('Existe un PDF pendiente, pero no hay endpoint cliente configurado para subirlo.');
  }

  const closePayload = buildClosePayload(pendingBit);
  if (closePayload) {
    console.log('[SYNC] Cerrando bitácora remota:', remoteBitacoraId);
    await bitacorasApi.cerrar(remoteBitacoraId, closePayload);
  }
};

const finalizePendingOperations = async (
  resultados: SyncResultItem[],
  pendingBitacoras: PendingBitacoraUpload[],
  pendingBeneficiarios: PendingBeneficiarioUpload[],
) => {

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

    if (!hasDeferredRemoteWork(pendingBit)) {
      removableBitacoras.push(resultado.sync_id);
      continue;
    }

    const remoteBitacoraId = extractRemoteBitacoraId(resultado);
    if (!remoteBitacoraId) {
      errores.push(`Bitácora ${resultado.sync_id} sincronizada sin id remoto; archivos pendientes conservados.`);
      continue;
    }

    try {
      await uploadPendingArtifacts(pendingBit, remoteBitacoraId);
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

const normalizeCadena = (raw: unknown) => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? ''),
    nombre: String(rec.nombre ?? ''),
    descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
    activo: typeof rec.activo === 'boolean' ? rec.activo : true,
    created_by: String(rec.created_by ?? ''),
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
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
    let json: unknown;
    try {
      json = await http<unknown>('POST', '/sync', body, token);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('recurso no encontrado')) {
        throw error;
      }
      json = await http<unknown>('POST', '/sync/sync', body, token);
    }
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

    const beneficiarios = asArray<unknown>(isRecord(data) ? data.beneficiarios : []).map(normalizeBeneficiario).filter(item => item.id);
    const actividades = asArray<unknown>(isRecord(data) ? data.actividades : []).map(normalizeActividad).filter(item => item.id);
    const cadenas = asArray<unknown>(isRecord(data) ? data.cadenas : []).map(normalizeCadena).filter(item => item.id && item.nombre);

    return {
      sync_ts: String((data as any).sync_ts ?? nowIso()),
      beneficiarios,
      actividades,
      cadenas,
    };
  },

  async sincronizarPendientes(): Promise<{ sincronizadas: number; errores: string[] }> {
    const [bitacoras, beneficiarios] = await Promise.all([
      offlineQueue.getAllPendingBitacoras(),
      offlineQueue.getPendingBeneficiarios(),
    ]);
    const bitacorasPorCrear = bitacoras.filter(item => !item.remote_bitacora_id);
    const bitacorasConRemoto = bitacoras.filter(item => item.remote_bitacora_id);
    const operaciones = [
      ...bitacorasPorCrear.map(item => ({
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

    const errores: string[] = [];
    let sincronizadas = 0;

    if (operaciones.length) {
      const result = await syncApi.sincronizar(operaciones as SyncRequestBody['operaciones']);
      const finalized = await finalizePendingOperations(result.resultados, bitacorasPorCrear, beneficiarios);
      sincronizadas += finalized.sincronizadas;
      errores.push(...finalized.errores);
    }

    if (bitacorasConRemoto.length) {
      const removableRemoteIds: string[] = [];
      for (const pendingBit of bitacorasConRemoto) {
        try {
          await uploadPendingArtifacts(pendingBit, String(pendingBit.remote_bitacora_id));
          removableRemoteIds.push(pendingBit.local_id);
          sincronizadas += 1;
        } catch (error) {
          errores.push(
            `Bitácora ${pendingBit.local_id}: pendiente remoto no sincronizado (${error instanceof Error ? error.message : 'error desconocido'})`
          );
        }
      }

      if (removableRemoteIds.length) {
        await offlineQueue.removePendingBitacorasByIds(removableRemoteIds);
      }
    }

    return { sincronizadas, errores };
  },
};
