import { Asignacion, Beneficiario, Usuario } from '../types/models';

export const DEMO_USUARIO: Usuario = {
  id_usuario: 1, nombre_completo: 'Carlos Ramírez Téllez',
  email: 'c.ramirez@saderh.hidalgo.gob.mx', rol: 'TECNICO',
  especialidad: 'AGRICOLA', puede_registrar_beneficiarios: true,
  zona_nombre: 'Zona Pachuca', codigo_acceso: '00000',
  ultimo_acceso: new Date().toISOString(),
};
export const DEMO_TOKEN = 'demo-token-saderh-local';

export const DEMO_BENEFICIARIOS: Beneficiario[] = [
  { id_beneficiario: 1, nombre_completo: 'María Hernández López', curp: 'HELM800101MHGRPD08', municipio: 'Pachuca de Soto', localidad: 'El Jacal', folio_saderh: 'HGO-2024-001234', latitud_predio: 20.118, longitud_predio: -98.734, cadena_productiva: 'Maíz Blanco', telefono_contacto: '771-100-0001', estatus_beneficiario: 'ACTIVO' },
  { id_beneficiario: 2, nombre_completo: 'Juan Pablo Sánchez Morales', curp: 'SAMJ750515HHGNRN04', municipio: 'Mineral del Monte', localidad: 'La Estanzuela', folio_saderh: 'HGO-2024-001567', latitud_predio: 20.14, longitud_predio: -98.672, cadena_productiva: 'Frijol Negro', telefono_contacto: '771-200-0002', estatus_beneficiario: 'ACTIVO' },
  { id_beneficiario: 3, nombre_completo: 'Rosa Elena Pérez Vega', curp: 'PEVR900330MHGRGSD3', municipio: 'Zempoala', localidad: 'San Miguel Atlautla', folio_saderh: 'HGO-2024-002001', latitud_predio: 19.915, longitud_predio: -98.654, cadena_productiva: 'Nopal Verdura', telefono_contacto: '771-300-0003', estatus_beneficiario: 'ACTIVO' },
  { id_beneficiario: 4, nombre_completo: 'Ejido San Francisco del Rincón', curp: 'EJID000000HXXXX001', municipio: 'Tizayuca', localidad: 'San Francisco del Rincón', folio_saderh: 'HGO-2024-002345', latitud_predio: 19.832, longitud_predio: -98.967, cadena_productiva: 'Jitomate', telefono_contacto: '775-400-0004', estatus_beneficiario: 'ACTIVO' },
  { id_beneficiario: 5, nombre_completo: 'Gregorio Alvarado Fuentes', curp: 'AUFG681201HHGLVR02', municipio: 'Tulancingo de Bravo', localidad: 'San Juan Solís', folio_saderh: 'HGO-2024-003100', latitud_predio: 20.086, longitud_predio: -98.359, cadena_productiva: 'Cebada', telefono_contacto: '775-500-0005', estatus_beneficiario: 'ACTIVO' },
];

const dFecha = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split('T')[0]; };

export const DEMO_ASIGNACIONES: Asignacion[] = [
  { id_asignacion: 1, id_tecnico: 1, id_usuario_creo: 2, id_beneficiario: 1, tipo_asignacion: 'BENEFICIARIO', descripcion_actividad: 'Seguimiento al cultivo de maíz blanco — etapa de germinación', prioridad: 'ALTA', fecha_limite: dFecha(0), completado: false, fecha_completado: null, fecha_creacion: new Date().toISOString(), beneficiario: DEMO_BENEFICIARIOS[0] },
  { id_asignacion: 2, id_tecnico: 1, id_usuario_creo: 2, id_beneficiario: 2, tipo_asignacion: 'BENEFICIARIO', descripcion_actividad: 'Diagnóstico fitosanitario en parcela de frijol negro', prioridad: 'MEDIA', fecha_limite: dFecha(0), completado: false, fecha_completado: null, fecha_creacion: new Date().toISOString(), beneficiario: DEMO_BENEFICIARIOS[1] },
  { id_asignacion: 3, id_tecnico: 1, id_usuario_creo: 2, id_beneficiario: 3, tipo_asignacion: 'ACTIVIDAD', descripcion_actividad: 'Capacitación sobre manejo post-cosecha de nopal', prioridad: 'BAJA', fecha_limite: dFecha(0), completado: false, fecha_completado: null, fecha_creacion: new Date().toISOString(), beneficiario: DEMO_BENEFICIARIOS[2] },
  { id_asignacion: 4, id_tecnico: 1, id_usuario_creo: 2, id_beneficiario: 4, tipo_asignacion: 'BENEFICIARIO', descripcion_actividad: 'Verificación de sistema de riego en ejido', prioridad: 'ALTA', fecha_limite: dFecha(1), completado: false, fecha_completado: null, fecha_creacion: new Date().toISOString(), beneficiario: DEMO_BENEFICIARIOS[3] },
  { id_asignacion: 5, id_tecnico: 1, id_usuario_creo: 2, id_beneficiario: 5, tipo_asignacion: 'BENEFICIARIO', descripcion_actividad: 'Seguimiento a cultivo de cebada maltera', prioridad: 'MEDIA', fecha_limite: dFecha(1), completado: false, fecha_completado: null, fecha_creacion: new Date().toISOString(), beneficiario: DEMO_BENEFICIARIOS[4] },
];

export const DEMO_HORARIOS: Record<number, string> = { 1: '09:00 AM', 2: '11:30 AM', 3: '01:00 PM', 4: '09:00 AM', 5: '11:00 AM' };
export const TIPOS_CULTIVO = ['Maíz Blanco', 'Maíz Amarillo', 'Frijol Negro', 'Frijol Bayo', 'Nopal Verdura', 'Nopal Tuna', 'Jitomate', 'Chile Serrano', 'Cebada Maltera', 'Trigo', 'Avena Forrajera', 'Sorgo', 'Alfalfa', 'Papa', 'Zanahoria', 'Aguacate', 'Durazno', 'Otro'];
export const ETAPAS_FENOLOGICAS = ['Siembra', 'Germinación', 'Plántula', 'Crecimiento Vegetativo', 'Floración', 'Fructificación', 'Maduración', 'Cosecha', 'Post-cosecha'];
export const TIPOS_INCIDENTE = ['Plagas de insectos', 'Enfermedades fungosas', 'Enfermedades bacterianas', 'Sequía', 'Inundación', 'Granizo', 'Helada', 'Viento fuerte', 'Otro'];
export const MUNICIPIOS_HIDALGO = ['Acatlán', 'Acaxochitlán', 'Actopan', 'Ajacuba', 'Alfajayucan', 'Apan', 'El Arenal', 'Atitalaquia', 'Atotonilco de Tula', 'Atotonilco el Grande', 'Calnali', 'Cardonal', 'Cuautepec de Hinojosa', 'Chapantongo', 'Chapulhuacán', 'Chilcuautla', 'Epazoyucan', 'Francisco I. Madero', 'Huasca de Ocampo', 'Huautla', 'Huejutla de Reyes', 'Huichapan', 'Ixmiquilpan', 'Jacala de Ledezma', 'Metztitlán', 'Mineral del Chico', 'Mineral del Monte', 'Mineral de la Reforma', 'Mixquiahuala de Juárez', 'Molango de Escamilla', 'Nopala de Villagrán', 'Omitlán de Juárez', 'Pachuca de Soto', 'Progreso de Obregón', 'San Agustín Tlaxiaca', 'San Bartolo Tutotepec', 'San Salvador', 'Santiago de Anaya', 'Santiago Tulantepec', 'Singuilucan', 'Tasquillo', 'Tecozautla', 'Tenango de Doria', 'Tepeapulco', 'Tepeji del Río de Ocampo', 'Tizayuca', 'Tlahuelilpan', 'Tlanchinol', 'Tolcayuca', 'Tula de Allende', 'Tulancingo de Bravo', 'Yahualica', 'Zacualtipán de Ángeles', 'Zapotlán de Juárez', 'Zempoala', 'Zimapán'];
