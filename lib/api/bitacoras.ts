import { http, httpMultipart, buildUploadFile } from './http';
import { getToken } from './auth';
import { unwrapData, isRecord, asArray, toNumber, nowIso } from './utils';
import type { 
  Bitacora, 
  TipoAsignacion, 
  EstadoBitacora, 
  CrearBitacoraPayload, 
  BitacoraCerrarPayload, 
  BitacoraUpdatePayload 
} from '../../types/models';

export const bitacorasApi = {
  listar: async (limit = 50, offset = 0): Promise<Bitacora[]> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const query = `?limit=${limit}&offset=${offset}`;
    const json = await http<unknown>('GET', `/bitacoras${query}`, undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(data);
    return arr.map(raw => normalizeBitacora(raw)).filter(b => b.id);
  },

  getById: async (id: string): Promise<Bitacora> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const json = await http<unknown>('GET', `/bitacoras/${id}`, undefined, token);
    const data = unwrapData(json);
    return normalizeBitacora(data);
  },

  crear: async (payload: CrearBitacoraPayload): Promise<Bitacora> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const json = await http<unknown>('POST', '/bitacoras', payload, token);
    const data = unwrapData(json);
    return normalizeBitacora(data);
  },

  uploadFotoRostro: async (id: string, fotoUri: string): Promise<{foto_rostro_url: string}> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const form = new FormData();
    form.append('foto', buildUploadFile(fotoUri, `rostro-${id}`) as any);
    const json = await httpMultipart<unknown>('POST', `/bitacoras/${id}/foto-rostro`, form, token);
    return json as any;
  },

  uploadFirma: async (id: string, firmaUri: string): Promise<{firma_url: string}> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const form = new FormData();
    form.append('firma', buildUploadFile(firmaUri, `firma-${id}`) as any);
    const json = await httpMultipart<unknown>('POST', `/bitacoras/${id}/firma`, form, token);
    return json as any;
  },

  uploadFotosCampo: async (id: string, fotosUris: string[]): Promise<{fotos_campo: string[]}> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const form = new FormData();
    fotosUris.forEach(uri => form.append('fotos[]', buildUploadFile(uri, `campo-${id}`) as any));
    const json = await httpMultipart<unknown>('POST', `/bitacoras/${id}/fotos-campo`, form, token);
    return json as any;
  },

  cerrar: async (id: string, payload: BitacoraCerrarPayload): Promise<Bitacora> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const json = await http<unknown>('POST', `/bitacoras/${id}/cerrar`, payload, token);
    const data = unwrapData(json);
    return normalizeBitacora(data);
  },

  actualizar: async (id: string, payload: BitacoraUpdatePayload): Promise<Bitacora> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const json = await http<unknown>('PATCH', `/bitacoras/${id}`, payload, token);
    const data = unwrapData(json);
    return normalizeBitacora(data);
  },

  editar: async (id: string, payload: BitacoraUpdatePayload): Promise<Bitacora> => {
    return bitacorasApi.actualizar(id, payload);
  },

  subirFotoRostro: async (id: string, fotoUri: string): Promise<{ foto_rostro_url: string }> => {
    return bitacorasApi.uploadFotoRostro(id, fotoUri);
  },

  subirFirma: async (id: string, firmaUri: string): Promise<{ firma_url: string }> => {
    return bitacorasApi.uploadFirma(id, firmaUri);
  },

  subirFotosCampo: async (id: string, fotosUris: string[]): Promise<{ fotos_campo: string[] }> => {
    return bitacorasApi.uploadFotosCampo(id, fotosUris);
  },

  listarCerradas: async (): Promise<Bitacora[]> => {
    const token = await getToken();
    if (!token) throw new Error('No token');
    const json = await http<unknown>('GET', '/bitacoras?estado=cerrada', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(data);
    return arr.map(raw => normalizeBitacora(raw)).filter(b => b.id);
  },
} as const;

const normalizeBitacora = (raw: unknown): Bitacora => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? ''),
    tipo: rec.tipo as TipoAsignacion || 'beneficiario',
    estado: rec.estado as EstadoBitacora || 'borrador',
    tecnico_id: String(rec.tecnico_id ?? ''),
    beneficiario_id: rec.beneficiario_id ? String(rec.beneficiario_id) : null,
    cadena_productiva_id: rec.cadena_productiva_id ? String(rec.cadena_productiva_id) : null,
    actividad_id: rec.actividad_id ? String(rec.actividad_id) : null,
    fecha_inicio: String(rec.fecha_inicio ?? ''),
    fecha_fin: rec.fecha_fin ? String(rec.fecha_fin) : null,
    coord_inicio: rec.coord_inicio ? String(rec.coord_inicio) : null,
    coord_fin: rec.coord_fin ? String(rec.coord_fin) : null,
    actividades_desc: rec.actividades_desc ? String(rec.actividades_desc) : '',
    recomendaciones: rec.recomendaciones ? String(rec.recomendaciones) : null,
    comentarios_beneficiario: rec.comentarios_beneficiario ? String(rec.comentarios_beneficiario) : null,
    coordinacion_interinst: !!rec.coordinacion_interinst,
    instancia_coordinada: rec.instancia_coordinada ? String(rec.instancia_coordinada) : null,
    proposito_coordinacion: rec.proposito_coordinacion ? String(rec.proposito_coordinacion) : null,
    observaciones_coordinador: rec.observaciones_coordinador ? String(rec.observaciones_coordinador) : null,
    foto_rostro_url: rec.foto_rostro_url ? String(rec.foto_rostro_url) : null,
    firma_url: rec.firma_url ? String(rec.firma_url) : null,
    fotos_campo: asArray<string>(rec.fotos_campo || []),
    pdf_version: toNumber(rec.pdf_version, 0),
    pdf_url_actual: rec.pdf_url_actual ? String(rec.pdf_url_actual) : null,
    pdf_original_url: rec.pdf_original_url ? String(rec.pdf_original_url) : null,
    creada_offline: !!rec.creada_offline,
    sync_id: rec.sync_id ? String(rec.sync_id) : null,
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
    // Legacy
    id_bitacora: String(rec.id ?? ''),
    uuid_movil: String(rec.uuid_movil ?? ''),
    sincronizado: !!rec.sincronizado,
  };
};
