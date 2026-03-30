import { http, isNetworkError } from './http';
import { getToken } from './auth';
import { unwrapData, isRecord, asArray, normalizeBeneficiario, nowIso, toBoolean } from './utils';
import { Beneficiario, CrearBeneficiarioPayload, CadenaProductiva, Localidad } from '../../types/models';

export const beneficiariosApi = {
  async listar(search?: string): Promise<Beneficiario[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /mis-beneficiarios');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('GET', '/mis-beneficiarios', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.beneficiarios ? data.beneficiarios : data);
    let list = arr.map(raw => normalizeBeneficiario(raw)).filter(b => b.id && (b.nombre || b.nombre_completo));

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        [b.nombre, b.nombre_completo ?? '', b.municipio, b.localidad ?? '', b.folio_saderh ?? ''].some(f => f.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async crear(payload: CrearBeneficiarioPayload): Promise<Beneficiario> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /beneficiarios');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('POST', '/beneficiarios', payload, token);
    const data = unwrapData(json);
    const rec = isRecord(data) ? data : {};
    
    console.log('[beneficiariosApi.crear] Beneficiario creado en servidor:', rec.id ?? 'sin id');
    
    return {
      id: String(rec.id ?? rec.id_beneficiario ?? ''),
      nombre: String(rec.nombre ?? payload.nombre_completo),
      nombre_completo: payload.nombre_completo,
      municipio: payload.municipio,
      localidad: payload.localidad,
      curp: payload.curp,
      folio_saderh: payload.folio_saderh,
      cadena_productiva: payload.cadena_productiva,
      telefono_contacto: payload.telefono_contacto,
      activo: true,
    };
  },
};

export const cadenasApi = {
  async listar(): Promise<CadenaProductiva[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /cadenas-productivas');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const json = await http<unknown>('GET', '/cadenas-productivas', undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.cadenas ? data.cadenas : data);
    return arr.map(raw => {
      const rec = isRecord(raw) ? raw : {};
      return {
        id: String(rec.id ?? ''),
        nombre: String(rec.nombre ?? ''),
        descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
        activo: toBoolean(rec.activo, true),
        created_by: String(rec.created_by ?? ''),
        created_at: String(rec.created_at ?? nowIso()),
        updated_at: String(rec.updated_at ?? nowIso()),
      };
    }).filter(c => c.id && c.nombre);
  },
};

export const localidadesApi = {
  async listarPorMunicipio(municipio: string): Promise<Localidad[]> {
    const token = await getToken();
    
    if (!token) {
      console.error('[API ERROR] No hay token disponible para /localidades');
      throw new Error('No autenticado: Token no disponible');
    }
    
    const query = `?municipio=${encodeURIComponent(municipio)}`;
    const json = await http<unknown>('GET', `/localidades${query}`, undefined, token);
    const data = unwrapData(json);
    const arr = asArray<unknown>(isRecord(data) && data.localidades ? data.localidades : data);
    return arr.map(raw => {
      const rec = isRecord(raw) ? raw : {};
      return {
        id: String(rec.id ?? ''),
        municipio: String(rec.municipio ?? ''),
        nombre: String(rec.nombre ?? ''),
        cp: rec.cp ? String(rec.cp) : undefined,
        activo: toBoolean(rec.activo, true),
        created_by: rec.created_by ? String(rec.created_by) : undefined,
        created_at: String(rec.created_at ?? nowIso()),
        updated_at: String(rec.updated_at ?? nowIso()),
        zona_id: rec.zona_id ? String(rec.zona_id) : undefined,
      };
    }).filter(l => l.id && l.nombre);
  },
};
