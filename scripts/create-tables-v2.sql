-- SADERH - Script corregido para crear todas las tablas
-- Ejecutar en PostgreSQL (Railway, Supabase, etc.)
-- Versión corregida para beta

-- ============================================================
-- 1. CREAR TABLAS PRINCIPALES
-- ============================================================

-- Tabla de usuarios/técnicos
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'tecnico',
    codigo_acceso VARCHAR(10) UNIQUE NOT NULL,
    estado_corte VARCHAR(50),
    fecha_limite DATE,
    email VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de beneficiarios (CORREGIDO: plural)
CREATE TABLE IF NOT EXISTS beneficiarios (
    id VARCHAR(255) PRIMARY KEY,
    tecnico_id VARCHAR(255) REFERENCES usuarios(id),
    nombre_completo VARCHAR(255) NOT NULL,
    curp VARCHAR(18) UNIQUE,
    folio_saderh VARCHAR(50),
    municipio VARCHAR(255),
    localidad VARCHAR(255),
    telefono_contacto VARCHAR(50),
    cadena_productiva VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de bitácoras (CORREGIDO: FK a beneficiarios)
CREATE TABLE IF NOT EXISTS bitacoras (
    id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL DEFAULT 'beneficiario',
    estado VARCHAR(50) DEFAULT 'borrador',
    tecnico_id VARCHAR(255) REFERENCES usuarios(id),
    beneficiario_id VARCHAR(255) REFERENCES beneficiarios(id),
    cadena_productiva_id VARCHAR(255),
    actividad_id VARCHAR(255),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    coord_inicio VARCHAR(100),
    coord_fin VARCHAR(100),
    foto_rostro_url TEXT,
    firma_url TEXT,
    fotos_campo JSONB,
    observaciones_coordinador TEXT,
    actividades_desc TEXT,
    recomendaciones TEXT,
    comentarios_beneficiario TEXT,
    coordinacion_interinst BOOLEAN DEFAULT false,
    instancia_coordinada VARCHAR(255),
    proposito_coordinacion TEXT,
    pdf_url_actual TEXT,
    pdf_original_url TEXT,
    pdf_version INTEGER DEFAULT 0,
    creada_offline BOOLEAN DEFAULT FALSE,
    sync_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS actividades (
    id VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    cadena_productiva_id VARCHAR(255),
    tecnico_id VARCHAR(255) REFERENCES usuarios(id),
    beneficiario_id VARCHAR(255) REFERENCES beneficiarios(id),
    fecha_limite DATE,
    prioridad VARCHAR(20) DEFAULT 'MEDIA',
    completado BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cadenas productivas
CREATE TABLE IF NOT EXISTS cadenas_productivas (
    id VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_by VARCHAR(255) REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_codigo ON usuarios(codigo_acceso);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

CREATE INDEX IF NOT EXISTS idx_beneficiarios_tecnico ON beneficiarios(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo ON beneficiarios(activo);

CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico ON bitacoras(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_estado ON bitacoras(estado);
CREATE INDEX IF NOT EXISTS idx_bitacoras_beneficiario ON bitacoras(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha_inicio ON bitacoras(fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_bitacoras_sync_id ON bitacoras(sync_id);

CREATE INDEX IF NOT EXISTS idx_actividades_cadena ON actividades(cadena_productiva_id);
CREATE INDEX IF NOT EXISTS idx_actividades_tecnico ON actividades(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_actividades_beneficiario ON actividades(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha_limite ON actividades(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_actividades_completado ON actividades(completado);

-- ============================================================
-- 3. TRIGGERS PARA updated_at AUTOMÁTICO
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficiarios_updated_at BEFORE UPDATE ON beneficiarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bitacoras_updated_at BEFORE UPDATE ON bitacoras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actividades_updated_at BEFORE UPDATE ON actividades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cadenas_productivas_updated_at BEFORE UPDATE ON cadenas_productivas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. DATOS DE PRUEBA
-- ============================================================

-- Insertar usuario de prueba (código: 12345)
INSERT INTO usuarios (id, nombre, rol, codigo_acceso, estado_corte, email)
VALUES ('tecnico-001', 'Técnico Demo', 'tecnico', '12345', 'activo', 'demo@saderh.mx')
ON CONFLICT (codigo_acceso) DO NOTHING;

-- Insertar usuario admin (código: 99999)
INSERT INTO usuarios (id, nombre, rol, codigo_acceso, estado_corte, email)
VALUES ('admin-001', 'Administrador', 'ADMIN', '99999', 'activo', 'admin@saderh.mx')
ON CONFLICT (codigo_acceso) DO NOTHING;

-- Insertar beneficiario de prueba (CORREGIDO: INTO beneficiarios)
INSERT INTO beneficiarios (id, tecnico_id, nombre_completo, curp, municipio, localidad, cadena_productiva)
VALUES ('benef-001', 'tecnico-001', 'Juan Pérez López', 'PELJ900101HNLRRN01', 'Pachuca', 'Santiago', 'Aguacate')
ON CONFLICT (id) DO NOTHING;

-- Insertar segundo beneficiario
INSERT INTO beneficiaries (id, tecnico_id, nombre_completo, curp, municipio, localidad, cadena_productiva)
VALUES ('benef-002', 'tecnico-001', 'María González Ruiz', 'GORM820202MHGZRR01', 'Tulancingo', 'San Lorenzo', 'Maíz')
ON CONFLICT (id) DO NOTHING;

-- Insertar actividad de prueba
INSERT INTO actividades (id, nombre, descripcion, tecnico_id, beneficiario_id, fecha_limite, prioridad)
VALUES ('act-001', 'Visita de seguimiento', 'Revisión de parcela y cultivos', 'tecnico-001', 'benef-001', CURRENT_DATE + 7, 'ALTA')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. VERIFICACIÓN
-- ============================================================

-- Verificar tablas creadas
SELECT 'Tablas creadas:' as mensaje;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar datos de prueba
SELECT 'Datos de prueba:' as mensaje;
SELECT 'usuarios:' as tabla, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'beneficiarios:', COUNT(*) FROM beneficiarios
UNION ALL
SELECT 'actividades:', COUNT(*) FROM actividades;

-- Probar login
SELECT id, nombre, rol, codigo_acceso, estado_corte 
FROM usuarios 
WHERE codigo_acceso = '12345';
