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

-- Tabla de beneficiarios
CREATE TABLE IF NOT EXISTS beneficiarios (
    id VARCHAR(255) PRIMARY KEY,
    tecnico_id VARCHAR(255),
    nombre_completo VARCHAR(255) NOT NULL,
    curp VARCHAR(18),
    folio_saderh VARCHAR(50),
    municipio VARCHAR(255),
    localidad VARCHAR(255),
    telefono_contacto VARCHAR(50),
    cadena_productiva VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de bitácoras
CREATE TABLE IF NOT EXISTS bitacoras (
    id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL DEFAULT 'beneficiario',
    estado VARCHAR(50) DEFAULT 'borrador',
    tecnico_id VARCHAR(255),
    beneficiario_id VARCHAR(255),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario de prueba
INSERT INTO usuarios (id, nombre, rol, codigo_acceso, estado_corte, email)
VALUES ('tecnico-001', 'Técnico Demo', 'tecnico', '12345', 'activo', 'demo@saderh.mx')
ON CONFLICT (codigo_acceso) DO NOTHING;

-- Verificar tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';