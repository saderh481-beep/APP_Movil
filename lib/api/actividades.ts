import { http } from './http';
import { getToken } from './auth';
import { unwrapData, asArray, isRecord } from './utils';
import { Actividad } from '../../types/models';

export const actividadesApi = {
  async listarMisActividades(): Promise<Actividad[]> {
    const token = await getToken();
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /mis-actividades');
      throw new Error('No autenticado: Token no disponible');
    }
    const json = await http<unknown>('GET', '/mis-actividades', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(data);
    return arr.map(normalizeActividad).filter(a => a.id);
  },
};

const normalizeActividad = (raw: unknown): Actividad => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? ''),
    nombre: String(rec.nombre ?? ''),
    descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
    activo: !!rec.activo,
    created_by: String(rec.created_by ?? ''),
    created_at: String(rec.created_at ?? new Date().toISOString()),
    updated_at: String(rec.updated_at ?? new Date().toISOString()),
  };
};
