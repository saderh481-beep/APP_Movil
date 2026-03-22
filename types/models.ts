export type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINADOR' | 'TECNICO';
export type Especialidad = 'AGRICOLA' | 'AGROPECUARIO' | 'ACTIVIDAD_GENERAL';
export type TipoAsignacion = 'BENEFICIARIO' | 'ACTIVIDAD';
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';
export type EstatusBeneficiario = 'ACTIVO' | 'INACTIVO' | 'PENDIENTE';
export type TipoArchivo = 'FOTO' | 'DOCUMENTO';

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  email: string;
  rol: Rol;
  especialidad: Especialidad | null;
  puede_registrar_beneficiarios: boolean;
  zona_nombre: string | null;
  codigo_acceso: string;
  ultimo_acceso: string | null;
}
export interface Beneficiario {
  id_beneficiario: number;
  nombre_completo: string;
  curp: string;
  municipio: string;
  localidad: string;
  folio_saderh: string;
  latitud_predio: number | null;
  longitud_predio: number | null;
  cadena_productiva: string;
  telefono_contacto: string | null;
  estatus_beneficiario: EstatusBeneficiario;
}
export interface CrearBeneficiarioPayload {
  nombre_completo: string;
  curp: string;
  municipio: string;
  localidad: string;
  folio_saderh: string;
  cadena_productiva: string;
  telefono_contacto?: string;
}
export interface Asignacion {
  id_asignacion: number;
  id_tecnico: number;
  id_usuario_creo: number;
  id_beneficiario: number;
  tipo_asignacion: TipoAsignacion;
  descripcion_actividad: string | null;
  prioridad: Prioridad;
  fecha_limite: string;
  completado: boolean;
  fecha_completado: string | null;
  fecha_creacion: string;
  beneficiario?: Beneficiario;
}
export interface DatosExtendidos {
  tipo_cultivo?: string;
  etapa_fenologica?: string;
  salud_cultivo?: number;
  hay_incidentes?: boolean;
  tipo_incidente?: string;
  descripcion_incidente?: string;
  calidad_servicio?: number;
  calificacion_coordinacion?: number;
  cumplimiento_metas?: boolean;
  observaciones?: string;
}
export interface Bitacora {
  id_bitacora?: number;
  id_usuario: number;
  id_asignacion: number;
  uuid_movil: string;
  fecha_hora_inicio: string;
  fecha_hora_fin?: string;
  latitud?: number;
  longitud?: number;
  tipo_bitacora: string;
  datos_extendidos: DatosExtendidos;
  calificacion?: number;
  reporte?: string;
  firma_url?: string;
  sincronizado: boolean;
}
export interface Evidencia {
  id_evidencia?: number;
  id_bitacora: number;
  uuid_movil: string;
  tipo_archivo: TipoArchivo;
  url: string;
  sincronizado: boolean;
}
export interface AuthResponse { success: boolean; token: string; usuario: Usuario; }
export interface ApiResponse<T = unknown> { success: boolean; data?: T; error?: string; message?: string; }
export interface AsignacionesResponse { success: boolean; asignaciones: Asignacion[]; total: number; }
export interface BeneficiariosResponse { success: boolean; beneficiarios: Beneficiario[]; total: number; }
