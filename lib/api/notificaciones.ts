import { http } from './http';
import { getToken } from './auth';
import { unwrapData, asArray, isRecord } from './utils';
import { Notificacion } from '../../types/models';

export const notificacionesApi = {
  async listar(): Promise<Notificacion[]> {
    const token = await getToken();
    if (!token) {
      throw new Error('No autenticado');
    }
    const json = await http<unknown>('GET', '/notificaciones', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(data);
    return arr.map(normalizeNotificacion);
  },

  async marcarLeida(id: string): Promise<{message: string}> {
    const token = await getToken();
    if (!token) {
      throw new Error('No autenticado');
    }
    const json = await http<unknown>('PATCH', `/notificaciones/${id}/leer`, undefined, token);
    return { message: 'Marcada como leída' };
  },
};

const normalizeNotificacion = (raw: unknown): Notificacion => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? ''),
    destino_id: String(rec.destino_id ?? ''),
    destino_tipo: String(rec.destino_tipo ?? 'tecnico'),
    tipo: String(rec.tipo ?? ''),
    titulo: String(rec.titulo ?? ''),
    cuerpo: String(rec.cuerpo ?? ''),
    leido: !!rec.leido,
    enviado_push: !!rec.enviado_push,
    enviado_email: !!rec.enviado_email,
    created_at: String(rec.created_at ?? new Date().toISOString()),
  };
};
