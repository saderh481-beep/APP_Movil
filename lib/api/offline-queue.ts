import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './config';
import type { BitacoraCerrarPayload, CrearBeneficiarioPayload } from '../../types/models';

const MAX_QUEUE_ITEMS = 100;
const MAX_QUEUE_BYTES = 10 * 1024 * 1024;
const MAX_ITEM_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingBitacoraUpload = {
  local_id: string;
  created_at: string;
  payload: Record<string, unknown>;
  remote_bitacora_id?: string | null;
  foto_rostro_uri?: string | null;
  firma_uri?: string | null;
  fotos_campo_uris?: string[];
  pdf_uri?: string | null;
  close_payload?: BitacoraCerrarPayload;
};

export type PendingBeneficiarioUpload = {
  local_id: string;
  created_at: string;
  payload: CrearBeneficiarioPayload;
};

const safeJsonParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const isFresh = (createdAt?: string): boolean => {
  if (!createdAt) return false;
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < MAX_ITEM_AGE_MS;
};

const getQueueSizeBytes = (value: unknown) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
};

const readBitacoras = async (): Promise<PendingBitacoraUpload[]> => {
  const parsed = safeJsonParse<PendingBitacoraUpload[]>(await AsyncStorage.getItem(KEYS.OFFLINE), []);
  return parsed.filter(item => item?.local_id && item?.payload && isFresh(item.created_at));
};

const writeBitacoras = async (items: PendingBitacoraUpload[]): Promise<void> => {
  await AsyncStorage.setItem(KEYS.OFFLINE, JSON.stringify(items));
};

const readBeneficiarios = async (): Promise<PendingBeneficiarioUpload[]> => {
  const parsed = safeJsonParse<PendingBeneficiarioUpload[]>(await AsyncStorage.getItem(KEYS.BENEFICIARIOS_OFFLINE), []);
  return parsed.filter(item => item?.local_id && item?.payload && isFresh(item.created_at));
};

const writeBeneficiarios = async (items: PendingBeneficiarioUpload[]): Promise<void> => {
  await AsyncStorage.setItem(KEYS.BENEFICIARIOS_OFFLINE, JSON.stringify(items));
};

const normalizeBitacoras = (items: PendingBitacoraUpload[]): PendingBitacoraUpload[] => {
  const deduped = new Map<string, PendingBitacoraUpload>();
  for (const item of items) deduped.set(item.local_id, item);
  return Array.from(deduped.values()).slice(-MAX_QUEUE_ITEMS);
};

const normalizeBeneficiarios = (items: PendingBeneficiarioUpload[]): PendingBeneficiarioUpload[] => {
  const deduped = new Map<string, PendingBeneficiarioUpload>();
  for (const item of items) deduped.set(item.local_id, item);
  return Array.from(deduped.values()).slice(-MAX_QUEUE_ITEMS);
};

export const offlineQueue = {
  async getAllPendingBitacoras(): Promise<PendingBitacoraUpload[]> {
    const items = await readBitacoras();
    if (items.length) await writeBitacoras(items);
    return items;
  },

  async getPendingBeneficiarios(): Promise<PendingBeneficiarioUpload[]> {
    const items = await readBeneficiarios();
    if (items.length) await writeBeneficiarios(items);
    return items;
  },

  async countPendingBitacoras(): Promise<number> {
    return (await readBitacoras()).length;
  },

  async getQueueFillPercentage(): Promise<number> {
    const [bitacoras, beneficiarios] = await Promise.all([readBitacoras(), readBeneficiarios()]);
    const byCount = ((bitacoras.length + beneficiarios.length) / MAX_QUEUE_ITEMS) * 100;
    const byBytes = (getQueueSizeBytes({ bitacoras, beneficiarios }) / MAX_QUEUE_BYTES) * 100;
    return Math.max(0, Math.min(100, Math.round(Math.max(byCount, byBytes))));
  },

  async pushPendingBitacora(item: PendingBitacoraUpload): Promise<void> {
    const items = await readBitacoras();
    const next = normalizeBitacoras([...items, item]);
    await writeBitacoras(next);
  },

  async pushPendingBeneficiario(item: PendingBeneficiarioUpload): Promise<void> {
    const items = await readBeneficiarios();
    const next = normalizeBeneficiarios([...items, item]);
    await writeBeneficiarios(next);
  },

  async removePendingBitacorasByIds(localIds: string[]): Promise<void> {
    if (!localIds.length) return;
    const blocked = new Set(localIds);
    const items = await readBitacoras();
    await writeBitacoras(items.filter(item => !blocked.has(item.local_id)));
  },

  async removePendingBeneficiariosByIds(localIds: string[]): Promise<void> {
    if (!localIds.length) return;
    const blocked = new Set(localIds);
    const items = await readBeneficiarios();
    await writeBeneficiarios(items.filter(item => !blocked.has(item.local_id)));
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.OFFLINE, KEYS.BENEFICIARIOS_OFFLINE]);
  },
} as const;
