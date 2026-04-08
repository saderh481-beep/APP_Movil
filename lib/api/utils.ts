import { Beneficiario, Actividad, Asignacion } from '../../types/models';

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

export const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(n)) return true;
    if (['false', '0', 'no'].includes(n)) return false;
  }
  return fallback;
};

export const toIsoDate = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const unwrapData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if ('data' in value && value.data !== undefined) return value.data;
  return value;
};

export const nowIso = () => new Date().toISOString();

export const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

export const normalizeAccessCode = (codigo: string) => codigo.replace(/\D/g, '').slice(0, 5);

export const normalizeBeneficiario = (raw: unknown): Beneficiario => {
  const rec = isRecord(raw) ? raw : {};
  const id = String(rec.id ?? rec.id_beneficiario ?? '');
  const nombreCompleto = String(rec.nombre_completo ?? rec.nombre ?? '');

  return {
    id,
    id_beneficiario: toStringOrUndefined(rec.id_beneficiario ?? rec.id),
    nombre: String(rec.nombre ?? nombreCompleto),
    nombre_completo: nombreCompleto || String(rec.nombre ?? ''),
    municipio: String(rec.municipio ?? ''),
    localidad: rec.localidad ? String(rec.localidad) : undefined,
    direccion: rec.direccion ? String(rec.direccion) : undefined,
    cp: rec.cp ? String(rec.cp) : undefined,
    telefono_principal: rec.telefono_principal ? String(rec.telefono_principal) : undefined,
    telefono_secundario: rec.telefono_secundario ? String(rec.telefono_secundario) : undefined,
    coord_parcela: rec.coord_parcela ? String(rec.coord_parcela) : undefined,
    telefono_contacto: rec.telefono_contacto ? String(rec.telefono_contacto) : undefined,
    curp: rec.curp ? String(rec.curp) : undefined,
    folio_saderh: rec.folio_saderh ? String(rec.folio_saderh) : undefined,
    cadena_productiva: rec.cadena_productiva ? String(rec.cadena_productiva) : undefined,
    tecnico_id: rec.tecnico_id ? String(rec.tecnico_id) : undefined,
    latitud_predio: typeof rec.latitud_predio === 'number' ? rec.latitud_predio : null,
    longitud_predio: typeof rec.longitud_predio === 'number' ? rec.longitud_predio : null,
    activo: toBoolean(rec.activo, true),
    cadenas: asArray<unknown>(isRecord(rec.cadenas) ? [] : rec.cadenas).map(c => {
      const cadena = isRecord(c) ? c : {};
      return {
        id: String(cadena.id ?? ''),
        nombre: String(cadena.nombre ?? ''),
      };
    }).filter(c => c.id && c.nombre),
  };
};

export const normalizeActividad = (raw: unknown): Actividad => {
  const rec = isRecord(raw) ? raw : {};
  return {
    id: String(rec.id ?? rec.id_actividad ?? ''),
    nombre: String(rec.nombre ?? rec.titulo ?? ''),
    descripcion: rec.descripcion ? String(rec.descripcion) : undefined,
    activo: toBoolean(rec.activo, true),
    created_by: String(rec.created_by ?? rec.id_usuario_creo ?? ''),
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
  };
};

export const normalizeAsignacionFromActividad = (actividad: Actividad, raw?: unknown): Asignacion => {
  const rec = isRecord(raw) ? raw : {};
  return {
    ...actividad,
    id_asignacion: actividad.id,
    id_tecnico: toStringOrUndefined(rec.id_tecnico ?? rec.tecnico_id),
    id_usuario_creo: actividad.created_by,
    id_beneficiario: toStringOrUndefined(rec.id_beneficiario ?? rec.beneficiario_id),
    tipo_asignacion: 'actividad',
    descripcion_actividad: actividad.descripcion,
    prioridad: 'MEDIA',
    completado: false,
    fecha_limite: toStringOrUndefined(rec.fecha_limite),
    fecha_completado: toStringOrUndefined(rec.fecha_completado),
  };
};

export const normalizeAsignacionFromBeneficiario = (beneficiario: Beneficiario, raw?: unknown): Asignacion => {
  const rec = isRecord(raw) ? raw : {};
  const idBase = beneficiario.id_beneficiario ?? beneficiario.id;
  return {
    id: `beneficiario-${idBase}`,
    nombre: beneficiario.nombre_completo ?? beneficiario.nombre,
    descripcion: beneficiario.cadena_productiva ?? 'Beneficiario asignado',
    activo: beneficiario.activo,
    created_by: String(rec.created_by ?? rec.id_usuario_creo ?? ''),
    created_at: String(rec.created_at ?? nowIso()),
    updated_at: String(rec.updated_at ?? nowIso()),
    id_asignacion: `beneficiario-${idBase}`,
    id_tecnico: toStringOrUndefined(rec.id_tecnico ?? rec.tecnico_id),
    id_usuario_creo: toStringOrUndefined(rec.id_usuario_creo ?? rec.created_by),
    id_beneficiario: idBase,
    tipo_asignacion: 'beneficiario',
    descripcion_actividad: beneficiario.cadena_productiva ?? 'Seguimiento de beneficiario',
    prioridad: 'MEDIA',
    completado: false,
    fecha_limite: toStringOrUndefined(rec.fecha_limite),
    fecha_completado: toStringOrUndefined(rec.fecha_completado),
    beneficiario,
  };
};

export const dedupeAsignaciones = (items: Asignacion[]): Asignacion[] => {
  const unique = new Map<string, Asignacion>();
  for (const item of items) {
    const key = String(item.id_asignacion ?? item.id ?? '');
    if (!key) continue;
    unique.set(key, item);
  }
  return Array.from(unique.values());
};
