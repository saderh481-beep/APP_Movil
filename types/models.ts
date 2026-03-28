export type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINADOR' | 'TECNICO';
export type EstadoBitacora = 'borrador' | 'cerrada';
export type EstadoCorte = 'en_servicio' | 'corte_aplicado';
export type TipoAsignacion = 'beneficiario' | 'actividad';
export type TipoArchivo = 'FOTO' | 'DOCUMENTO';
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Usuario {
  id: string;
  nombre: string;
  rol?: string;
  email?: string;
  fecha_limite?: string;
  estado_corte?: EstadoCorte;
}

export interface Beneficiario {
  id: string;
  nombre: string;
  nombre_completo?: string;
  municipio: string;
  localidad?: string | null;
  direccion?: string | null;
  cp?: string | null;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  coord_parcela?: string | null;
  telefono_contacto?: string | null;
  curp?: string;
  folio_saderh?: string;
  cadena_productiva?: string;
  id_beneficiario?: string;
  latitud_predio?: number | null;
  longitud_predio?: number | null;
  activo: boolean;
  cadenas?: Array<{
    id: string;
    nombre: string;
  }>;
}

export interface CadenaProductiva {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Tipo legado: usamos Actividad como Asignacion para compatibilidad */
export type Asignacion = Actividad & {
  id_asignacion?: string;
  id_tecnico?: string | number;
  id_usuario_creo?: string;
  id_beneficiario?: string;
  tipo_asignacion?: TipoAsignacion;
  descripcion_actividad?: string | null;
  prioridad?: Prioridad;
  fecha_limite?: string;
  completado?: boolean;
  fecha_completado?: string | null;
  fecha_creacion?: string;
  beneficiario?: Beneficiario;
};

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

export interface CrearBeneficiarioPayload {
  nombre_completo: string;
  curp: string;
  municipio: string;
  localidad: string;
  folio_saderh: string;
  cadena_productiva: string;
  telefono_contacto: string;
}

export interface Bitacora {
  id: string;
  id_bitacora?: string;
  uuid_movil?: string;
  tipo: TipoAsignacion;
  estado: EstadoBitacora;
  tecnico_id: string;
  id_usuario?: number | string;
  id_asignacion?: number | string;
  beneficiario_id?: string | null;
  cadena_productiva_id?: string | null;
  actividad_id?: string | null;
  fecha_inicio: string;
  fecha_hora_inicio?: string;
  fecha_fin?: string | null;
  fecha_hora_fin?: string | null;
  coord_inicio?: string | null;
  coord_fin?: string | null;
  latitud?: number;
  longitud?: number;
  actividades_desc?: string;
  recomendaciones?: string | null;
  comentarios_beneficiario?: string | null;
  coordinacion_interinst?: boolean;
  instancia_coordinada?: string | null;
  proposito_coordinacion?: string | null;
  observaciones_coordinador?: string | null;
  foto_rostro_url?: string | null;
  firma_url?: string | null;
  fotos_campo?: string[];
  pdf_version?: number;
  pdf_url_actual?: string | null;
  pdf_original_url?: string | null;
  creada_offline?: boolean;
  sync_id?: string | null;
  sincronizado?: boolean;
  tipo_bitacora?: string;
  datos_extendidos?: DatosExtendidos;
  calificacion?: number;
  reporte?: string;
  created_at: string;
  updated_at: string;
}

export interface Evidencia {
  id_evidencia?: number;
  id_bitacora: number;
  uuid_movil: string;
  tipo_archivo: TipoArchivo;
  url: string;
  sincronizado: boolean;
}

export interface Notificacion {
  id: string;
  destino_id: string;
  destino_tipo: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leido: boolean;
  enviado_push: boolean;
  enviado_email: boolean;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  ts: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  tecnico: Usuario;
  offline?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SyncResult {
  sync_id: string;
  operacion: string;
  exito: boolean;
  mensaje?: string;
}

export interface SyncResponse {
  procesadas: number;
  resultados: SyncResult[];
}

export interface AsignacionesResponse {
  success: boolean;
  asignaciones: Asignacion[];
  total: number;
}

export interface BeneficiariosResponse {
  success: boolean;
  beneficiarios: Beneficiario[];
  total: number;
}
